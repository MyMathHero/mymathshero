import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getRequestToken, verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Parents own a notification feed keyed by their id. Auth via the shared token
// helper (web cookie or mobile Bearer).
async function authParent(request) {
  const token = getRequestToken(request)
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'parent') return null
  return payload
}

// GET — list the caller's notifications (newest first) + unreadCount.
export async function GET(request) {
  const payload = await authParent(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = await connectDB()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10) || 30, 100)

    const filter = { audience: 'parent', recipientId: payload.userId }
    const [notifications, unreadCount] = await Promise.all([
      db.collection('notifications')
        .find(filter)
        .project({ _id: 0 })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
      db.collection('notifications').countDocuments({ ...filter, read: false }),
    ])
    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('[notifications GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — mark read. Body: { action: 'read', id } | { action: 'readAll' }
export async function POST(request) {
  const payload = await authParent(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = await connectDB()
    const { action, id } = await request.json().catch(() => ({}))
    const base = { audience: 'parent', recipientId: payload.userId }

    if (action === 'read' && id) {
      await db.collection('notifications').updateOne({ ...base, id }, { $set: { read: true } })
      return NextResponse.json({ success: true })
    }
    if (action === 'readAll') {
      await db.collection('notifications').updateMany({ ...base, read: false }, { $set: { read: true } })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[notifications POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
