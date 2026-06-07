import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import { getRequestToken, verifyToken } from '@/lib/auth'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Change password for the authenticated parent. Token is the only source of
// identity; the body is just the current + new passwords. No userId in the
// body — a parent can only change their own password.
export async function POST(request) {
  try {
    const token = getRequestToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (payload.role !== 'parent') {
      return NextResponse.json(
        { error: 'Only parents can change their password here' },
        { status: 403 }
      )
    }

    const { currentPassword, newPassword } = await request.json().catch(() => ({}))

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Both current and new password are required' },
        { status: 400 }
      )
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const db = await connectDB()
    const parent = await db.collection('parents').findOne({ id: payload.userId })
    if (!parent) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const stored = parent.password || parent.passwordHash
    if (!stored) {
      return NextResponse.json(
        { error: 'No password set on this account' },
        { status: 400 }
      )
    }

    const valid = await bcrypt.compare(currentPassword, stored)
    if (!valid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await db.collection('parents').updateOne(
      { id: payload.userId },
      { $set: { password: hashed, updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[change-password]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
