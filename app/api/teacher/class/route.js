import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Skills shown as heatmap columns — mapped to real skill IDs
const HEATMAP_SKILLS = [
  { key: 'Add',     id: 'm_2_add100',      full: 'Add within 100' },
  { key: 'Sub',     id: 'm_2_sub100',      full: 'Subtract within 100' },
  { key: 'Mult',    id: 'm_3_multiply100', full: 'Multiply within 100' },
  { key: 'Frac',    id: 'm_3_fractions',   full: 'Understand Fractions' },
  { key: 'Blend',   id: 'e_1_blend',       full: 'Blend Sounds CVC' },
  { key: 'Read',    id: 'e_2_comprehend',  full: 'Reading Comprehension' },
  { key: 'Plants',  id: 's_1_plants',      full: 'Parts of a Plant' },
  { key: 'FoodWeb', id: 's_3_foodweb',     full: 'Food Chains & Webs' },
]

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    const classId = searchParams.get('classId')

    const db = await connectDB()

    // Build student filter — NEVER include private students for teachers
    const studentFilter = teacherId
      ? { type: 'school', teacherId }
      : { type: 'school' }

    if (classId) {
      const cls = await db.collection('classes').findOne({ id: classId })
      const idsFromClass = cls?.students || []
      if (idsFromClass.length === 0) {
        return NextResponse.json({
          students: [], heatmapSkills: HEATMAP_SKILLS,
          overview: { totalMastered: 0, atRisk: 0, activeTodayCount: 0, totalStudents: 0, avgSmartScore: 0 },
        })
      }
      studentFilter.id = { $in: idsFromClass }
    }

    const students = await db.collection('children').find(studentFilter).toArray()
    const studentIdsForScores = students.map(s => s.id)
    const allSkillScores = await db.collection('skill_scores')
      .find(studentIdsForScores.length ? { studentId: { $in: studentIdsForScores } } : { studentId: { $in: [] } })
      .toArray()

    // Build per-student score map: studentId → skillId → score
    const scoresByStudent = {}
    for (const ss of allSkillScores) {
      if (!scoresByStudent[ss.studentId]) scoresByStudent[ss.studentId] = {}
      scoresByStudent[ss.studentId][ss.skillId] = ss.score
    }

    // Students active today + last active timestamp per student
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const studentIds = students.map(s => s.id)
    const [todaySessions, lastEventPerStudent] = await Promise.all([
      db.collection('session_events')
        .find({ timestamp: { $gte: todayStart } })
        .toArray(),
      // Get the most recent event timestamp for each student
      db.collection('session_events').aggregate([
        { $match: { studentId: { $in: studentIds } } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$studentId', lastTimestamp: { $first: '$timestamp' } } },
      ]).toArray(),
    ])

    const activeToday = new Set(todaySessions.map(s => s.studentId))
    const lastActiveMap = {}
    for (const e of lastEventPerStudent) lastActiveMap[e._id] = e.lastTimestamp

    // Build heatmap rows
    const heatmapStudents = students.map(student => {
      const studentScores = scoresByStudent[student.id] || {}
      const scores = HEATMAP_SKILLS.map(s => studentScores[s.id] ?? 0)
      const nonZero = scores.filter(s => s > 0)
      const avg = nonZero.length > 0
        ? Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length)
        : 0
      const initials = student.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

      const lastTs = lastActiveMap[student.id] ?? null
      const inactiveDays = lastTs
        ? Math.floor((Date.now() - new Date(lastTs).getTime()) / (1000 * 60 * 60 * 24))
        : null
      const lastActiveLabel = activeToday.has(student.id)
        ? 'Today'
        : lastTs
          ? `${inactiveDays}d ago`
          : 'Never'

      return {
        id: student.id,
        name: student.name,
        initials,
        grade: student.grade,
        avatar: student.avatar,
        xp: student.xp || 0,
        streak: student.streak || 0,
        lastActive: lastActiveLabel,
        lastActiveTimestamp: lastTs,
        inactiveDays,
        scores,
        avg,
        trend: 'flat',
        skillScores: studentScores,
        activeToday: activeToday.has(student.id),
      }
    })

    // Overview stats
    const totalMastered = allSkillScores.filter(s => s.mastered).length
    const atRisk = heatmapStudents.filter(s => s.avg > 0 && s.avg < 50).length
    const activeTodayCount = heatmapStudents.filter(s => s.activeToday).length
    const allScoreValues = allSkillScores.map(s => s.score).filter(s => s > 0)
    const avgSmartScore = allScoreValues.length > 0
      ? Math.round(allScoreValues.reduce((a, b) => a + b, 0) / allScoreValues.length)
      : 0

    return NextResponse.json({
      students: heatmapStudents,
      heatmapSkills: HEATMAP_SKILLS,
      overview: {
        totalMastered,
        atRisk,
        activeTodayCount,
        totalStudents: students.length,
        avgSmartScore,
      },
    })
  } catch (error) {
    console.error('Teacher class error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
