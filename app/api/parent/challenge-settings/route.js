import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

// Parent controls for the Hero Speed Challenge (1v1 online race). Stored per
// child on the children collection. Parents can turn it on/off and set an
// availability window. Mirrors the arcade-settings ownership-check pattern.
const DEFAULT_SETTINGS = {
  enabled: true,
  availability: 'always', // 'always' | 'after-school' | 'weekends'
}

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const child = await db.collection('children').findOne({ id: studentId })
    if (!child) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    if (parentId && (child.parentId ?? child.parent_id) !== parentId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ ...DEFAULT_SETTINGS, ...(child.challengeSettings || {}) })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { parentId, studentId, settings } = await request.json()
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const child = await db.collection('children').findOne({ id: studentId })
    if (!child) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    if (parentId && (child.parentId ?? child.parent_id) !== parentId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const clean = {
      enabled: settings?.enabled !== false,
      availability: ['always', 'after-school', 'weekends'].includes(settings?.availability)
        ? settings.availability : 'always',
    }
    await db.collection('children').updateOne({ id: studentId }, { $set: { challengeSettings: clean } })
    return NextResponse.json({ success: true, settings: clean })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
