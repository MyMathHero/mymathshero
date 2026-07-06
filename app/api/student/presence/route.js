import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { gradesMatch } from '@/lib/challenge'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

const ONLINE_WINDOW_MS = 60 * 1000 // "online" = a heartbeat in the last 60s

// POST — heartbeat. Marks the student online (for Challenge presence). Called
// every ~30s while the Challenge screen is open. `available` reflects whether
// they're currently open to a challenge (screen focused + parent-enabled).
export async function POST(request) {
  try {
    const { studentId, available = true } = await request.json()
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    await db.collection('children').updateOne(
      { id: studentId },
      { $set: { lastSeenAt: new Date(), challengeAvailable: !!available } }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET — list ONLINE, challenge-available students of a similar grade (excluding
// self and anyone whose parent disabled Challenge). Only first name + avatar are
// exposed — never full names or the (self-only) uploaded profile photo.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const me = await db.collection('children').findOne({ id: studentId })
    if (!me) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS)
    const online = await db.collection('children').find({
      id: { $ne: studentId },
      lastSeenAt: { $gte: cutoff },
      challengeAvailable: true,
      'challengeSettings.enabled': { $ne: false },
    }).toArray()

    const players = online
      .filter(s => gradesMatch(me.grade, s.grade))
      .slice(0, 30)
      .map(s => ({
        id: s.id,
        firstName: String(s.name || 'Hero').trim().split(/\s+/)[0] || 'Hero',
        avatar: s.avatar || '🦊',
        grade: s.grade,
      }))

    return NextResponse.json({ players, online: players.length })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
