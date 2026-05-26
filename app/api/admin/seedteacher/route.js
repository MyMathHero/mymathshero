import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function POST() {
  try {
    const db = await connectDB()
    const hashedPassword = await bcrypt.hash('teacher123', 10)

    const teachers = [
      {
        id: 'teacher_seed_001',
        name: 'Ms Sarah Johnson',
        school: 'Oakwood Primary',
        grade: 'Grade 3',
        email: 'sarah@oakwood.edu.au',
        password: hashedPassword,
        approved: true,
        pending: false,
        students: [],
        created_at: new Date(),
      },
      {
        id: 'teacher_seed_002',
        name: 'Mr David Chen',
        school: 'Riverside Primary',
        grade: 'Grade 4',
        email: 'david@riverside.edu.au',
        password: hashedPassword,
        approved: false,
        pending: true,
        students: [],
        created_at: new Date(),
      },
    ]

    const results = []
    for (const teacher of teachers) {
      await db.collection('teachers').updateOne(
        { email: teacher.email },
        { $set: teacher },
        { upsert: true }
      )
      results.push({ name: teacher.name, email: teacher.email, approved: teacher.approved })
    }

    return NextResponse.json({ success: true, seeded: results })
  } catch (error) {
    console.error('Seed teacher error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
