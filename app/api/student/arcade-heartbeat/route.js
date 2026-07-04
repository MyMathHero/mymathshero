import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'

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

    // `durationMinutes` is the running wall-clock total for THIS session. Charge
    // the wallet for whatever hasn't been charged yet (idempotent — survives
    // missed heartbeats, and re-sends of the same total charge nothing extra).
    const total = Math.max(0, Math.round(durationMinutes || 0))
    const sess = await db.collection('arcade_sessions').findOne({ _id: objId })
    const already = sess?.minutesCharged || 0
    const toCharge = Math.max(0, total - already)

    await db.collection('arcade_sessions').updateOne(
      { _id: objId },
      {
        $set: {
          durationMinutes: total,
          minutesCharged: total,
          lastHeartbeat: new Date(),
          active: true,
        }
      }
    )

    if (toCharge > 0) {
      const upd = await db.collection('children').findOneAndUpdate(
        { id: studentId },
        { $inc: { arcadeMinutesRemaining: -toCharge } },
        { returnDocument: 'after' }
      )
      const doc = upd?.value || upd
      if ((doc?.arcadeMinutesRemaining || 0) < 0) {
        await db.collection('children').updateOne(
          { id: studentId }, { $set: { arcadeMinutesRemaining: 0 } }
        )
      }
    }

    const student = await db.collection('children').findOne({ id: studentId })
    const minutesRemaining = Math.max(0, student?.arcadeMinutesRemaining || 0)
    const enabled = student?.arcadeSettings?.enabled !== false

    return NextResponse.json({
      success: true,
      minutesRemaining,
      limitReached: minutesRemaining <= 0 || !enabled,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}
