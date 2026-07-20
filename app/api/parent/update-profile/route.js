import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getRequestToken, verifyToken } from '@/lib/auth'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// GET — return the authenticated parent's profile (id, name, email). Used by
// mobile so we don't need a separate /api/parent/me endpoint. The JWT carries
// name but not email; this fills the gap.
export async function GET(request) {
  const token = getRequestToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload?.userId || payload.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const db = await connectDB()
    const parent = await db.collection('parents').findOne(
      { id: payload.userId },
      // Non-sensitive profile fields only — never the password hash or Stripe IDs.
      { projection: {
        _id: 0, id: 1, name: 1, email: 1, phone: 1,
        created_at: 1, plan: 1, foundingFamily: 1,
      } }
    )
    if (!parent) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    return NextResponse.json({ profile: parent })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Update the authenticated parent's name and/or email. Both fields are
// optional — the client sends only what's changed. Identity comes from the
// session JWT; the body NEVER carries a userId. Same pattern as the other
// gated parent routes.
//
// Notes:
//   • Email is normalised to lowercase + trimmed before storage so future
//     lookups by email (login, dedupe) match consistently.
//   • A uniqueness check makes sure two parents can't end up sharing one
//     email. Mongo doesn't have a unique index on parents.email yet — if you
//     ever add one, this server-side check stays as a clearer error path.
export async function POST(request) {
  const token = getRequestToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload?.userId || payload.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { name, email } = body

    if ((name === undefined || name === null) && (email === undefined || email === null)) {
      return NextResponse.json(
        { error: 'Provide at least one of: name, email' },
        { status: 400 }
      )
    }

    const db = await connectDB()
    const updates = { updatedAt: new Date() }

    if (typeof name === 'string') {
      const cleanName = name.trim()
      if (!cleanName) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      updates.name = cleanName.slice(0, 128)
    }

    if (typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
      }
      // Uniqueness check excluding this account.
      const taken = await db.collection('parents').findOne({
        email: cleanEmail,
        id: { $ne: payload.userId },
      })
      if (taken) {
        return NextResponse.json(
          { error: 'That email is already in use by another account.' },
          { status: 400 }
        )
      }
      updates.email = cleanEmail
    }

    await db.collection('parents').updateOne(
      { id: payload.userId },
      { $set: updates }
    )

    return NextResponse.json({
      success: true,
      // Echo back the values the client can sync into local state. Note: the
      // JWT itself still has the old name; the dashboard reads it from
      // parentData and the next /api/auth/me call will pick up either field
      // from our DB on the next login. We do NOT issue a new token here.
      profile: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.email !== undefined ? { email: updates.email } : {}),
      },
    })
  } catch (error) {
    console.error('[update-profile]', error?.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
