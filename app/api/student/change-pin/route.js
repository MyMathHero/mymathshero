import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
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

// POST /api/student/change-pin
// Body: { studentId: string, newPin: string (4 digits) }
// Auth: Bearer token or cookie; the token's userId must match studentId.
export async function POST(request) {
  try {
    const token = getRequestToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }
    if (payload.role !== 'student') {
      return NextResponse.json({ error: 'Only students can change their PIN' }, { status: 403 })
    }

    const { studentId, newPin } = await request.json()
    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }
    if (payload.userId !== studentId) {
      return NextResponse.json({ error: 'You can only change your own PIN' }, { status: 403 })
    }
    if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    const db = await connectDB()
    // Hash the PIN, consistent with the parent/admin reset paths. Login accepts
    // both hashed and legacy-plaintext PINs.
    const hashedPin = await bcrypt.hash(newPin, 10)
    const result = await db.collection('children').updateOne(
      { id: studentId },
      { $set: { pin: hashedPin, pinUpdatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('change-pin error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
