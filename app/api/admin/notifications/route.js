import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { createBroadcast } from '@/lib/notifications'

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

function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/notifications] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

// GET — the admin-audience feed (new tickets, signups, payment failures) + unread.
export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = await connectDB()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)
    const filter = { audience: 'admin' }
    const [notifications, unreadCount] = await Promise.all([
      db.collection('notifications').find(filter).project({ _id: 0 }).sort({ createdAt: -1 }).limit(limit).toArray(),
      db.collection('notifications').countDocuments({ ...filter, read: false }),
    ])
    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('[admin/notifications GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — admin actions:
//   { action: 'read', id } | { action: 'readAll' }
//   { action: 'broadcast', title, body, icon } → message every parent
export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = await connectDB()
    const { action, id, title, body, icon } = await request.json().catch(() => ({}))

    if (action === 'read' && id) {
      await db.collection('notifications').updateOne({ audience: 'admin', id }, { $set: { read: true } })
      return NextResponse.json({ success: true })
    }
    if (action === 'readAll') {
      await db.collection('notifications').updateMany({ audience: 'admin', read: false }, { $set: { read: true } })
      return NextResponse.json({ success: true })
    }
    if (action === 'broadcast') {
      if (!title || !String(title).trim()) {
        return NextResponse.json({ error: 'title is required' }, { status: 400 })
      }
      const { sent } = await createBroadcast(db, {
        title: String(title).trim(),
        body: typeof body === 'string' ? body.trim() : '',
        icon: typeof icon === 'string' && icon.trim() ? icon.trim() : '📢',
      })
      return NextResponse.json({ success: true, sent })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[admin/notifications POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
