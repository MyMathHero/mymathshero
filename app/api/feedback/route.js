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

const VALID_TYPES = new Set(['session', 'nps', 'bug', 'feature', 'general'])
const VALID_ROLES = new Set(['student', 'parent', 'teacher', 'admin'])

// POST is intentionally open — it's called from the student / parent
// dashboards in the browser. We sanitise inputs and cap text length so a bad
// actor can't dump megabytes into the collection.
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const {
      userId, role, type, rating, message, context,
      appVersion, platform,
    } = body

    if (!type || !VALID_TYPES.has(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${[...VALID_TYPES].join(', ')}` },
        { status: 400 }
      )
    }
    if (role && !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Rating ceiling: NPS is 0–10, everything else is 1–5.
    const maxRating = type === 'nps' ? 10 : 5
    let safeRating = null
    if (rating !== undefined && rating !== null) {
      const n = Number(rating)
      if (!Number.isFinite(n) || n < 0 || n > maxRating) {
        return NextResponse.json(
          { error: `rating must be a number between 0 and ${maxRating}` },
          { status: 400 }
        )
      }
      safeRating = n
    }

    const safeMessage = typeof message === 'string'
      ? message.trim().slice(0, 2000)
      : null

    const db = await connectDB()
    await db.collection('feedback').insertOne({
      userId: typeof userId === 'string' ? userId.slice(0, 128) : null,
      role: role || null,
      type,
      rating: safeRating,
      message: safeMessage,
      context: context && typeof context === 'object' ? context : null,
      appVersion: typeof appVersion === 'string' ? appVersion.slice(0, 32) : '1.0.1',
      platform: typeof platform === 'string' ? platform.slice(0, 32) : 'web',
      createdAt: new Date(),
      reviewed: false,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[feedback POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET is gated by ADMIN_API_KEY — feedback contains free-text user messages
// and must never be readable from the public internet. The admin app calls
// this through a server-side proxy so the key never reaches the browser.
export async function GET(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[feedback GET] ADMIN_API_KEY env var missing')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 500)

    const db = await connectDB()
    const query = type && VALID_TYPES.has(type) ? { type } : {}

    const feedback = await db.collection('feedback')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    const stats = await db.collection('feedback').aggregate([
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      } },
    ]).toArray()

    return NextResponse.json({ feedback, stats })
  } catch (error) {
    console.error('[feedback GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
