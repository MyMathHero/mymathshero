import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Sets sessions_completed to 5 so the Hero Quest milestone fires.
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const result = await db.collection('children').updateOne(
      { id: studentId },
      { $set: { sessions_completed: 5 } }
    )
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, sessions_completed: 5 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
