import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getRequestToken, verifyToken } from '@/lib/auth'
import { getPlanFeatures } from '@/lib/planGating'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

const SESSION_LIMIT = 20

function todayAEST() {
  return new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })
}

async function authStudent(request) {
  const token = getRequestToken(request)
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'student') return null
  return payload
}

// GET /api/student/hero-chat-status?studentId=xxx
// Returns { allowed, remaining, reason }
export async function GET(request) {
  const payload = await authStudent(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId') || payload.userId

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    // Plan lives on the PARENT doc — look it up (falling back to the child record).
    const parent = student.parentId
      ? await db.collection('parents').findOne({ id: student.parentId })
      : null
    const plan = parent?.plan || student?.plan || 'free'

    if (!getPlanFeatures(plan).askHero) {
      return NextResponse.json({ allowed: false, remaining: 0, reason: 'upgrade' })
    }

    // Premium — check the daily session count.
    const today = todayAEST()
    const heroChats = student.heroChats || { date: '', count: 0 }
    const todayCount = heroChats.date === today ? heroChats.count : 0
    const remaining = Math.max(0, SESSION_LIMIT - todayCount)

    if (remaining === 0) {
      return NextResponse.json({ allowed: false, remaining: 0, reason: 'daily_limit' })
    }

    return NextResponse.json({ allowed: true, remaining, reason: null })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — call this when the modal is opened to consume 1 session.
export async function POST(request) {
  const payload = await authStudent(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { studentId } = await request.json()
    const sid = studentId || payload.userId

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: sid })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const today = todayAEST()
    const heroChats = student.heroChats || { date: '', count: 0 }
    const newCount = heroChats.date === today ? heroChats.count + 1 : 1

    await db.collection('children').updateOne(
      { id: sid },
      { $set: { heroChats: { date: today, count: newCount } } }
    )

    return NextResponse.json({ success: true, sessionsUsedToday: newCount })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
