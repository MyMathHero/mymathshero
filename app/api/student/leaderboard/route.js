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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const type = searchParams.get('type') || 'grade'
    const period = searchParams.get('period') || 'monthly'

    const db = await connectDB()

    // Date helpers
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const daysUntilReset = Math.ceil((nextMonthStart - now) / (1000 * 60 * 60 * 24))

    // Fetch all students
    const allStudents = await db.collection('children').find({}).toArray()
    if (allStudents.length === 0) {
      return NextResponse.json({ leaderboard: [], currentStudentRank: null, resetDate: nextMonthStart, daysUntilReset })
    }

    // Identify the current student's grade for grade-based filtering
    const currentStudent = allStudents.find(s => s.id === studentId)
    const currentGrade = currentStudent?.grade ?? null

    // Filter cohort by type
    let cohort = allStudents
    if (type === 'grade' && currentGrade !== null) {
      cohort = allStudents.filter(s => s.grade === currentGrade)
    }
    // 'class' and 'school' fall back to all students (no class/school grouping yet)

    // A student's photo is shown to OTHERS on the leaderboard only when their
    // parent approved it (challengeSettings.photoPublic). Otherwise → null.
    const photoFor = (s) => (s.challengeSettings?.photoPublic === true ? (s.profilePhoto || null) : null)

    let rankedEntries

    if (period === 'monthly') {
      // Calculate monthly XP: correct answers × 10 + total answers × 2 since month start
      const studentIds = cohort.map(s => s.id)
      const monthEvents = await db.collection('session_events')
        .find({ studentId: { $in: studentIds }, timestamp: { $gte: monthStart } })
        .toArray()

      // Group by studentId
      const eventsByStudent = {}
      for (const e of monthEvents) {
        if (!eventsByStudent[e.studentId]) eventsByStudent[e.studentId] = { total: 0, correct: 0 }
        eventsByStudent[e.studentId].total++
        if (e.correct) eventsByStudent[e.studentId].correct++
      }

      rankedEntries = cohort.map(s => {
        const ev = eventsByStudent[s.id] || { total: 0, correct: 0 }
        const monthlyXp = ev.correct * 10 + ev.total * 2
        return { id: s.id, name: s.name, avatar: s.avatar || '🦊', photo: photoFor(s), xp: monthlyXp, grade: s.grade }
      })
    } else {
      // All-time: use xp field
      rankedEntries = cohort.map(s => ({
        id: s.id, name: s.name, avatar: s.avatar || '🦊', photo: photoFor(s), xp: s.xp || 0, grade: s.grade,
      }))
    }

    // Sort by XP descending, stable sort by name for ties
    rankedEntries.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name))

    // Assign ranks (tied students get the same rank)
    let rank = 1
    for (let i = 0; i < rankedEntries.length; i++) {
      if (i > 0 && rankedEntries[i].xp < rankedEntries[i - 1].xp) rank = i + 1
      rankedEntries[i].rank = rank
    }

    // Find current student's rank
    const currentStudentEntry = rankedEntries.find(e => e.id === studentId)
    const currentStudentRank = currentStudentEntry?.rank ?? null

    // Top 10 with isCurrentStudent flag. `photo` is only present when a parent
    // approved it (photoFor); otherwise rows show avatar + first name only.
    const top10 = rankedEntries.slice(0, 10).map(e => ({
      rank: e.rank,
      name: e.name,
      avatar: e.avatar,
      photo: e.photo || null,
      xp: e.xp,
      grade: e.grade,
      isCurrentStudent: e.id === studentId,
    }))

    // If current student is not in top 10, append their row
    const currentInTop10 = top10.some(e => e.isCurrentStudent)
    const currentStudentRow = currentStudentEntry && !currentInTop10
      ? {
          rank: currentStudentEntry.rank,
          name: currentStudentEntry.name,
          avatar: currentStudentEntry.avatar,
          photo: currentStudentEntry.photo || null,
          xp: currentStudentEntry.xp,
          grade: currentStudentEntry.grade,
          isCurrentStudent: true,
          outOfTop10: true,
        }
      : null

    // Last month's champion from history
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthHistory = await db.collection('leaderboard_history').findOne({
      month: lastMonth.getMonth() + 1,
      year: lastMonth.getFullYear(),
    })
    const lastChampion = lastMonthHistory?.top3?.[0] ?? null

    return NextResponse.json({
      leaderboard: top10,
      currentStudentRow,
      currentStudentRank,
      totalInCohort: rankedEntries.length,
      resetDate: nextMonthStart.toISOString(),
      daysUntilReset,
      lastChampion,
    })
  } catch (error) {
    console.error('Leaderboard error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
