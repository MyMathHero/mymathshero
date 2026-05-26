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

export async function POST() {
  try {
    const db = await connectDB()
    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

    // Fetch all students and compute their current monthly XP
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const allStudents = await db.collection('children').find({}).toArray()
    const studentIds = allStudents.map(s => s.id)

    const monthEvents = await db.collection('session_events')
      .find({ studentId: { $in: studentIds }, timestamp: { $gte: monthStart } })
      .toArray()

    const eventsByStudent = {}
    for (const e of monthEvents) {
      if (!eventsByStudent[e.studentId]) eventsByStudent[e.studentId] = { total: 0, correct: 0 }
      eventsByStudent[e.studentId].total++
      if (e.correct) eventsByStudent[e.studentId].correct++
    }

    const ranked = allStudents
      .map(s => {
        const ev = eventsByStudent[s.id] || { total: 0, correct: 0 }
        return { id: s.id, name: s.name, avatar: s.avatar || '🦊', xp: ev.correct * 10 + ev.total * 2 }
      })
      .sort((a, b) => b.xp - a.xp)

    const top3 = ranked.slice(0, 3).map((s, i) => ({ rank: i + 1, ...s }))

    // Archive top 3
    await db.collection('leaderboard_history').updateOne(
      { month: prevMonth, year: prevYear },
      { $set: { month: prevMonth, year: prevYear, top3, archivedAt: new Date() } },
      { upsert: true }
    )

    // Reset monthlyXp on all children
    const result = await db.collection('children').updateMany({}, { $set: { monthlyXp: 0 } })

    return NextResponse.json({
      reset: result.modifiedCount,
      archived: true,
      month: prevMonth,
      year: prevYear,
      top3,
    })
  } catch (error) {
    console.error('Reset leaderboard error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
