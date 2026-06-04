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

// Registers or refreshes a device's Expo push token against the student record.
// Idempotent — safe to call on every app launch.
export async function POST(request) {
  try {
    const { studentId, token, platform } = await request.json()
    if (!studentId || !token) {
      return NextResponse.json(
        { error: 'studentId and token required' },
        { status: 400 }
      )
    }

    // Defence: only accept Expo push token format. Stops obvious garbage.
    if (typeof token !== 'string' || !token.startsWith('ExponentPushToken[')) {
      return NextResponse.json(
        { error: 'Invalid Expo push token format' },
        { status: 400 }
      )
    }

    const db = await connectDB()

    await db.collection('push_tokens').updateOne(
      { studentId, token },
      {
        $set: {
          studentId,
          token,
          platform: platform || 'ios',
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    // Mirror onto the student doc for one-hop lookup by the push sender.
    await db.collection('children').updateOne(
      { id: studentId },
      { $set: { pushToken: token, pushPlatform: platform || 'ios' } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push-token] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
