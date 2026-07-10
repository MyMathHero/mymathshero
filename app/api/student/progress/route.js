import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getRecommendations, getSkillTreeForGrade, getSkillGraph, getEffectiveCeiling } from '@/lib/recommender'
import { checkAndAwardBadges } from '@/lib/badges'

// Belt-and-braces: ensure nothing non-Maths leaks to the client. The recommender
// already filters at source, but if SKILL_GRAPH or scoreMap ever gets repolluted
// with e_/s_ entries, this stops them at the API boundary.
function mathsOnly(arr) {
  return (arr || []).filter(s => {
    const id = s?.id || s?.skillId || ''
    const subject = s?.subject || ''
    return id.startsWith('m_') || subject === 'Maths' || subject === 'Mathematics'
  })
}

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const parentId = searchParams.get('parentId')

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    const db = await connectDB()

    // 1. Get student profile
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Parent ownership check (optional): if parentId is supplied, it must match.
    if (parentId) {
      const ownerId = student.parentId ?? student.parent_id
      if (ownerId !== parentId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Resolve subscription plan from the parent (source of truth), falling back
    // to the child record. Used by the dashboard to gate Premium-only features.
    const planParent = student.parentId
      ? await db.collection('parents').findOne({ id: student.parentId })
      : null
    const studentPlan = planParent?.plan || student?.plan || 'free'

    // 2. Get all skill scores for this student
    const skillScores = await db.collection('skill_scores')
      .find({ studentId })
      .toArray()

    const scoreMap = {}
    skillScores.forEach(s => { scoreMap[s.skillId] = s.score })

    // 3. Get session history (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentSessions = await db.collection('session_events')
      .find({
        studentId,
        timestamp: { $gte: sevenDaysAgo }
      })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray()

    // 4. Calculate weekly activity (questions per day)
    const weeklyActivity = buildWeeklyActivity(recentSessions)

    // Effective grade — lifted above the enrolled grade by mastery progression
    // or the AI's diagnostic estimate, so an advanced student's recs + skill tree
    // show their real working level (incl. Years 7–12).
    const effectiveGrade = getEffectiveCeiling(student.grade || 3, scoreMap, {
      placementFloor: student?.placement?.estimatedGrade ?? 0,
    })

    // 5. Get recommendations (Maths only)
    const recommendations = mathsOnly(getRecommendations(
      effectiveGrade,
      scoreMap,
      5
    ))

    // 6. Get skill tree (Maths only)
    const skillTree = mathsOnly(getSkillTreeForGrade(effectiveGrade, scoreMap))

    // 7. Calculate strand breakdown
    const strandBreakdown = buildStrandBreakdown(skillScores)

    // 8. Calculate mastery stats
    const mastered = skillScores.filter(s => s.mastered).length
    const inProgress = skillScores.filter(s => !s.mastered && s.score > 0).length
    const totalAttempts = recentSessions.length
    const correctAttempts = recentSessions.filter(s => s.correct).length
    const accuracy = totalAttempts > 0
      ? Math.round((correctAttempts / totalAttempts) * 100)
      : 0

    // 9. Check gift milestone
    const sessionsCompleted = student.sessions_completed || 0
    const giftMilestone = {
      target: 5,
      completed: sessionsCompleted,
      achieved: sessionsCompleted >= 5,
      claimed: student.giftMilestoneClaimed === true,
      remaining: Math.max(0, 5 - sessionsCompleted),
    }

    // 10. Award any newly unlocked badges, then fetch all earned badges
    await checkAndAwardBadges(studentId, db)

    const recentBadges = await db.collection('badges')
      .find({ studentId }, { projection: { _id: 0, badgeId: 1, name: 1, emoji: 1, description: 1, color: 1, earnedAt: 1 } })
      .sort({ earnedAt: -1 })
      .toArray()

    // HERO Monthly Exams — the last several, newest first, with Hero's summary
    // for the parent. (The exam is our headline: Hero tells parents how the
    // child did.) Plus today's daily-task status (lighter — just done/target).
    const examDocs = await db.collection('monthly_exams')
      .find({ studentId }, { projection: { _id: 0, score: 1, correct: 1, total: 1, bonus: 1, heroSummary: 1, takenAt: 1, createdAt: 1 } })
      .sort({ takenAt: -1, createdAt: -1 })
      .limit(6)
      .toArray()
    const heroReviews = examDocs.map(e => ({
      score: e.score ?? 0,
      correct: e.correct ?? 0,
      total: e.total ?? 0,
      bonus: e.bonus ?? 0,
      heroSummary: e.heroSummary || '',
      at: e.takenAt || e.createdAt || null,
    }))
    const dailyTaskStatus = student.dailyTask
      ? {
          date: student.dailyTask.date || null,
          done: student.dailyTask.done === true,
          progress: student.dailyTask.progress || 0,
          target: student.dailyTask.target || 0,
          skillName: student.dailyTask.skillName || null,
        }
      : null

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        avatar: student.avatar,
        // Personal profile photo — self-view ONLY. Never expose this on any
        // endpoint that lists OTHER students (leaderboard, challenge).
        profilePhoto: student.profilePhoto || null,
        arcadeMinutes: student.arcadeMinutesRemaining || 0, // for the profile Arcade Card
        xp: student.xp || 0,
        coins: student.coins || 0,
        level: student.level || 1,
        streak: student.streak || 0,
        sessions_completed: sessionsCompleted,
        isDev: student.isDev || false,
        diagnosticComplete: student.diagnosticComplete || false,
        accessBlocked: student.accessBlocked || false,
        plan: studentPlan,
      },
      stats: {
        mastered,
        inProgress,
        accuracy,
        totalQuestionsThisWeek: totalAttempts,
        correctThisWeek: correctAttempts,
      },
      weeklyActivity,
      recommendations,
      skillTree,
      strandBreakdown,
      giftMilestone,
      recentBadges,
      heroReviews,       // monthly-exam history + Hero summaries (for the parent)
      dailyTaskStatus,   // today's daily-task status (lighter)
    })

  } catch (error) {
    console.error('Progress error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function buildWeeklyActivity(sessions) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const activity = {}

  // Initialise all 7 days to 0
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = days[d.getDay()]
    activity[key] = { day: key, questions: 0, correct: 0 }
  }

  // Count sessions per day
  sessions.forEach(s => {
    const day = days[new Date(s.timestamp).getDay()]
    if (activity[day]) {
      activity[day].questions++
      if (s.correct) activity[day].correct++
    }
  })

  return Object.values(activity)
}

function buildStrandBreakdown(skillScores) {
  const skillGraph = getSkillGraph()

  // Build a lookup map: skillId → { strand, subject }
  const skillMeta = {}
  skillGraph.forEach(skill => {
    skillMeta[skill.id] = { strand: skill.strand, subject: skill.subject }
  })

  const strands = {}

  skillScores.forEach(s => {
    const meta = skillMeta[s.skillId]
    if (!meta) return
    const { strand, subject } = meta
    if (!strands[strand]) {
      strands[strand] = { subject, scores: [] }
    }
    strands[strand].scores.push(s.score)
  })

  // Calculate average per strand
  const result = {}
  Object.entries(strands).forEach(([strand, data]) => {
    const avg = data.scores.length > 0
      ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
      : 0
    result[strand] = {
      subject: data.subject,
      average: avg,
      skillCount: data.scores.length,
    }
  })

  return result
}