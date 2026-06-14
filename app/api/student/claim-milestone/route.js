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

// POST /api/student/claim-milestone
// Body: { studentId: string }
// Auth: Bearer token or cookie; the token's userId must match studentId.
// Marks the Hero Quest gift milestone as claimed so the card stops showing.
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
      return NextResponse.json({ error: 'Only students can claim rewards' }, { status: 403 })
    }

    const { studentId } = await request.json()
    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }
    if (payload.userId !== studentId) {
      return NextResponse.json({ error: 'You can only claim your own reward' }, { status: 403 })
    }

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Only allow claiming once the milestone is actually achieved.
    if ((student.sessions_completed || 0) < 5) {
      return NextResponse.json({ error: 'Milestone not yet achieved' }, { status: 400 })
    }

    await db.collection('children').updateOne(
      { id: studentId },
      { $set: { giftMilestoneClaimed: true, giftMilestoneClaimedAt: new Date() } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('claim-milestone error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
