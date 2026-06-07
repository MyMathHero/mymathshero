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

// Reset a child's PIN. The parent identity comes from the session JWT; the
// only body fields are studentId and the new PIN. We then verify that this
// student actually belongs to this parent before writing.
export async function POST(request) {
  try {
    const token = getRequestToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload?.userId || payload.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const parentId = payload.userId

    const { studentId, newPin } = await request.json().catch(() => ({}))

    if (!studentId || !newPin) {
      return NextResponse.json(
        { error: 'studentId and newPin required' },
        { status: 400 }
      )
    }
    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 })
    }

    const db = await connectDB()

    // Ownership check — handle both parentId and legacy parent_id field shapes.
    const child = await db.collection('children').findOne({
      id: studentId,
      $or: [{ parentId }, { parent_id: parentId }],
    })
    if (!child) {
      return NextResponse.json(
        { error: 'Child not found or not yours' },
        { status: 404 }
      )
    }

    const hashedPin = await bcrypt.hash(newPin, 10)
    await db.collection('children').updateOne(
      { id: studentId },
      { $set: { pin: hashedPin, updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[reset-child-pin]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
