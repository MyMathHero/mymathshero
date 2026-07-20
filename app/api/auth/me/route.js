import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { getRequestToken, verifyToken } from '@/lib/auth'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function GET(request) {
  const token = getRequestToken(request)

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const payload = await verifyToken(token)

  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  // The token only carries userId/role/name/grade (kept small). Look up the
  // record so the profile screen can show email + richer, non-sensitive detail.
  // NEVER return the password hash or Stripe secrets.
  const user = {
    userId: payload.userId,
    role: payload.role,
    name: payload.name,
    grade: payload.grade ?? null,
  }

  try {
    const db = await connectDB()
    if (payload.role === 'parent') {
      const p = await db.collection('parents').findOne(
        { id: payload.userId },
        { projection: { _id: 0, password: 0, stripeCustomerId: 0 } }
      )
      if (p) {
        user.email = p.email || null
        user.name = p.name || user.name
        user.phone = p.phone || null
        user.memberSince = p.created_at || null
        user.plan = p.plan || null
        user.subscriptionStatus = p.subscriptionStatus || null
        user.foundingFamily = p.foundingFamily || false
        user.childCount = Array.isArray(p.children) ? p.children.length : 0
      }
    } else if (payload.role === 'teacher') {
      const t = await db.collection('teachers').findOne(
        { id: payload.userId },
        { projection: { _id: 0, password: 0 } }
      )
      if (t) {
        user.email = t.email || null
        user.school = t.school || null
        user.memberSince = t.created_at || null
        user.approved = !!t.approved
      }
    }
  } catch (err) {
    // Non-fatal — fall back to token-only fields so auth never breaks on a DB blip.
    console.error('[auth/me] profile lookup failed:', err?.message)
  }

  return NextResponse.json({ authenticated: true, user })
}
