import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

// Parents control ONLY on/off now — play time is bought with coins by the
// student (1 Jul 2026 update). Any legacy dailyMinutes/allowedDays are ignored.
const DEFAULT_SETTINGS = {
  enabled: true,
}

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Arcade settings are stored per child on the children collection. parentId is
// used to verify the child belongs to the requesting parent.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json(
      { error: 'studentId required' }, { status: 400 }
    )

    const db = await connectDB()
    const child = await db.collection('children').findOne({ id: studentId })
    if (!child) return NextResponse.json(
      { error: 'Student not found' }, { status: 404 }
    )

    // Ownership check — if parentId is supplied it must match the child's parent.
    if (parentId && (child.parentId ?? child.parent_id) !== parentId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(child.arcadeSettings || DEFAULT_SETTINGS)
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { parentId, studentId, settings } = await request.json()
    if (!studentId) return NextResponse.json(
      { error: 'studentId required' }, { status: 400 }
    )

    const db = await connectDB()
    const child = await db.collection('children').findOne({ id: studentId })
    if (!child) return NextResponse.json(
      { error: 'Student not found' }, { status: 404 }
    )

    // Ownership check — if parentId is supplied it must match the child's parent.
    if (parentId && (child.parentId ?? child.parent_id) !== parentId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Persist only the on/off flag; drop any legacy fields the client may send.
    await db.collection('children').updateOne(
      { id: studentId },
      { $set: { arcadeSettings: { enabled: settings?.enabled !== false } } }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}
