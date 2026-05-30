export const BADGES = [
  {
    id: 'first_login',
    name: 'First Steps',
    emoji: '👟',
    description: 'Logged in for the first time',
    color: 'from-green-400 to-emerald-500',
    check: ({ sessions_completed }) => sessions_completed >= 1,
  },
  {
    id: 'streak_3',
    name: 'On Fire!',
    emoji: '🔥',
    description: '3 day streak',
    color: 'from-orange-400 to-red-500',
    check: ({ streak }) => streak >= 3,
  },
  {
    id: 'streak_5',
    name: 'Week Warrior',
    emoji: '⚡',
    description: '5 day streak',
    color: 'from-yellow-400 to-orange-500',
    check: ({ streak }) => streak >= 5,
  },
  {
    id: 'mastered_1',
    name: 'First Master',
    emoji: '🏆',
    description: 'Mastered your first skill',
    color: 'from-amber-400 to-yellow-500',
    check: ({ mastered }) => mastered >= 1,
  },
  {
    id: 'mastered_5',
    name: 'Skill Champion',
    emoji: '🌟',
    description: 'Mastered 5 skills',
    color: 'from-blue-400 to-indigo-500',
    check: ({ mastered }) => mastered >= 5,
  },
  {
    id: 'mastered_10',
    name: 'Knowledge Expert',
    emoji: '🎓',
    description: 'Mastered 10 skills',
    color: 'from-purple-400 to-fuchsia-500',
    check: ({ mastered }) => mastered >= 10,
  },
  {
    id: 'questions_50',
    name: 'Question Crusher',
    emoji: '💪',
    description: 'Answered 50 questions',
    color: 'from-teal-400 to-cyan-500',
    check: ({ totalQuestions }) => totalQuestions >= 50,
  },
  {
    id: 'questions_100',
    name: 'Century Club',
    emoji: '💯',
    description: 'Answered 100 questions',
    color: 'from-pink-400 to-rose-500',
    check: ({ totalQuestions }) => totalQuestions >= 100,
  },
  {
    id: 'accuracy_80',
    name: 'Sharp Mind',
    emoji: '🧠',
    description: '80% accuracy in a session',
    color: 'from-violet-400 to-purple-500',
    check: ({ sessionAccuracy }) => sessionAccuracy >= 80,
  },
  {
    id: 'gift_earned',
    name: 'Gift Winner',
    emoji: '🎁',
    description: 'Completed 5 sessions',
    color: 'from-red-400 to-pink-500',
    check: ({ sessions_completed }) => sessions_completed >= 5,
  },
]

/**
 * Check all badge conditions and award any newly earned badges.
 * @param {string} studentId
 * @param {import('mongodb').Db} db
 * @param {object} [extraStats] - optional stats to supplement DB data (e.g. sessionAccuracy)
 * @returns {{ newBadges: object[], totalBadges: number }}
 */
export async function checkAndAwardBadges(studentId, db, extraStats = {}) {
  // Fetch student
  const student = await db.collection('children').findOne({ id: studentId })
  if (!student) return { newBadges: [], totalBadges: 0 }

  // Look up parent email once — only used if a badge is awarded below.
  const parentOwnerId = student.parentId ?? student.parent_id
  let parentForEmail = null
  if (parentOwnerId) {
    parentForEmail = await db.collection('parents').findOne(
      { id: parentOwnerId },
      { projection: { email: 1, name: 1 } }
    )
  }

  // Fetch skill scores
  const skillScores = await db.collection('skill_scores').find({ studentId }).toArray()
  const mastered = skillScores.filter(s => s.mastered).length

  // Fetch total questions answered (all time)
  const totalQuestions = await db.collection('session_events').countDocuments({ studentId })

  // Build stats object
  const stats = {
    sessions_completed: student.sessions_completed || 0,
    streak: student.streak || 0,
    mastered,
    totalQuestions,
    sessionAccuracy: extraStats.sessionAccuracy ?? 0,
  }

  // Fetch already-earned badge IDs
  const earnedDocs = await db.collection('badges').find({ studentId }).toArray()
  const earnedIds = new Set(earnedDocs.map(b => b.badgeId))

  // Check each badge
  const newBadges = []
  for (const badge of BADGES) {
    if (earnedIds.has(badge.id)) continue
    if (badge.check(stats)) {
      await db.collection('badges').insertOne({
        studentId,
        badgeId: badge.id,
        name: badge.name,
        emoji: badge.emoji,
        description: badge.description,
        color: badge.color,
        earnedAt: new Date(),
      })
      newBadges.push({ id: badge.id, name: badge.name, emoji: badge.emoji, description: badge.description, color: badge.color })

      // Fire-and-forget badge notification to the parent (no await on response path).
      if (parentForEmail?.email) {
        ;(async () => {
          try {
            const { sendBadgeNotification } = await import('./email.js')
            await sendBadgeNotification({
              parentEmail: parentForEmail.email,
              parentName: parentForEmail.name || 'there',
              childName: student.name,
              badgeName: badge.name,
              badgeEmoji: badge.emoji,
              badgeDescription: badge.description,
            })
          } catch (err) {
            console.error('Badge email failed:', err.message)
          }
        })()
      }
    }
  }

  const totalBadges = earnedIds.size + newBadges.length
  return { newBadges, totalBadges }
}
