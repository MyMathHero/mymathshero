import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { getAESTMidnightUTC } from '@/lib/arcadeTime'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Called every 60 seconds while a game is active. Updates the session's
// durationMinutes in real time so minutesToday is always accurate across
// devices — even if the app/tab is later closed without a clean "end".
//
// Accepts both JSON (fetch) and text/plain (navigator.sendBeacon) bodies.
export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      // sendBeacon may send the JSON string as text/plain.
      const raw = await request.text().catch(() => '')
      body = raw ? JSON.parse(raw) : {}
    }
    const { sessionId, durationMinutes, studentId } = body

    if (!sessionId || !studentId) {
      return NextResponse.json(
        { error: 'sessionId and studentId required' },
        { status: 400 }
      )
    }

    const db = await connectDB()

    let objId
    try {
      objId = new ObjectId(sessionId)
    } catch {
      return NextResponse.json(
        { error: 'Invalid sessionId' }, { status: 400 }
      )
    }

    // Update session duration in real time. durationMinutes is the running
    // wall-clock total for THIS session, so we set (not increment).
    await db.collection('arcade_sessions').updateOne(
      { _id: objId },
      {
        $set: {
          durationMinutes: durationMinutes || 0,
          lastHeartbeat: new Date(),
          active: true,
        }
      }
    )

    // Recompute minutesToday from AEST midnight so the client stays in sync.
    const todayStart = getAESTMidnightUTC()
    const todaySessions = await db.collection('arcade_sessions')
      .find({ studentId, startedAt: { $gte: todayStart } })
      .toArray()

    const minutesToday = todaySessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0), 0
    )

    // Per-child arcade settings live on the children doc.
    const student = await db.collection('children')
      .findOne({ id: studentId })
    const arcadeSettings = student?.arcadeSettings || {
      dailyMinutes: 30, enabled: true
    }
    const dailyLimit = arcadeSettings.dailyMinutes || 30
    const limitReached = minutesToday >= dailyLimit

    return NextResponse.json({
      success: true,
      minutesToday,
      minutesRemaining: Math.max(0, dailyLimit - minutesToday),
      limitReached,
      dailyLimit,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}
