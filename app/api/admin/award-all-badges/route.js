import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { BADGES } from '@/lib/badges'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const now = new Date()
    const docs = BADGES.map(b => ({
      studentId,
      badgeId: b.id,
      name: b.name,
      emoji: b.emoji,
      description: b.description,
      color: b.color,
      earnedAt: now,
    }))

    // Upsert one-by-one to avoid duplicate-key errors if some are already earned.
    for (const doc of docs) {
      await db.collection('badges').updateOne(
        { studentId: doc.studentId, badgeId: doc.badgeId },
        { $set: doc },
        { upsert: true }
      )
    }

    return NextResponse.json({ success: true, awarded: docs.length })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
