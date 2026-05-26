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

// Clears progress for a student: skill_scores, session_events, badges. Keeps profile.
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const [scores, events, badges] = await Promise.all([
      db.collection('skill_scores').deleteMany({ studentId }),
      db.collection('session_events').deleteMany({ studentId }),
      db.collection('badges').deleteMany({ studentId }),
    ])

    await db.collection('children').updateOne(
      { id: studentId },
      { $set: {
        sessions_completed: 0,
        xp: 0,
        coins: 100,
        level: 1,
        streak: 0,
        diagnosticComplete: false,
        suspiciousAnswers: 0,
      } }
    )

    return NextResponse.json({
      success: true,
      deleted: {
        skill_scores: scores.deletedCount,
        session_events: events.deletedCount,
        badges: badges.deletedCount,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
