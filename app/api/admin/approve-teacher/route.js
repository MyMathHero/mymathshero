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

export async function POST(request) {
  try {
    const { teacherId } = await request.json()

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
    }

    const db = await connectDB()

    const teacher = await db.collection('teachers').findOne({ id: teacherId })
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    await db.collection('teachers').updateOne(
      { id: teacherId },
      { $set: { approved: true, pending: false, approvedAt: new Date() } }
    )

    return NextResponse.json({
      success: true,
      teacher: { name: teacher.name, email: teacher.email, school: teacher.school },
    })
  } catch (error) {
    console.error('Approve teacher error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
