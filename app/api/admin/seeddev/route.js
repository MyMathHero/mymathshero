import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

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
    const hashedPw = await bcrypt.hash('DevAccess2026!', 10)

    // Dev parent
    await db.collection('parents').updateOne(
      { email: 'dev@mymathshero.com.au' },
      { $setOnInsert: {
        id: 'dev_parent_001',
        name: 'Dev Parent',
        email: 'dev@mymathshero.com.au',
        password: hashedPw,
        phone: '0400000000',
        children: ['dev_student_001'],
        isDev: true,
        created_at: new Date(),
      }},
      { upsert: true }
    )

    // Dev private student
    await db.collection('children').updateOne(
      { id: 'dev_student_001' },
      { $setOnInsert: {
        id: 'dev_student_001',
        type: 'private',
        parentId: 'dev_parent_001',
        parent_id: 'dev_parent_001',
        name: 'Dev Student',
        username: 'devstudent',
        pin: '0000',
        grade: 3,
        avatar: '🤖',
        coins: 999,
        xp: 9999,
        level: 99,
        streak: 10,
        sessions_completed: 0,
        isDev: true,
        schoolId: null,
        classId: null,
        teacherId: null,
        created_at: new Date(),
      }},
      { upsert: true }
    )

    // Dev teacher (pre-approved)
    await db.collection('teachers').updateOne(
      { email: 'devteacher@mymathshero.com.au' },
      { $setOnInsert: {
        id: 'dev_teacher_001',
        name: 'Dev Teacher',
        school: 'MyMathsHero Dev School',
        schoolId: 'school_dev_001',
        grade: 'Grade 3',
        email: 'devteacher@mymathshero.com.au',
        password: hashedPw,
        approved: true,
        pending: false,
        isDev: true,
        students: ['dev_school_student_001'],
        created_at: new Date(),
      }},
      { upsert: true }
    )

    // Dev school student
    await db.collection('children').updateOne(
      { id: 'dev_school_student_001' },
      { $setOnInsert: {
        id: 'dev_school_student_001',
        type: 'school',
        parentId: null,
        teacherId: 'dev_teacher_001',
        schoolId: 'school_dev_001',
        classId: 'class_dev_001',
        name: 'Dev School Student',
        username: 'devschool',
        pin: '1111',
        grade: 3,
        avatar: '🎓',
        coins: 100,
        xp: 500,
        level: 5,
        streak: 3,
        sessions_completed: 2,
        isDev: true,
        created_at: new Date(),
      }},
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      accounts: {
        student: { username: 'devstudent', pin: '0000' },
        parent: { email: 'dev@mymathshero.com.au', password: 'DevAccess2026!' },
        teacher: { email: 'devteacher@mymathshero.com.au', password: 'DevAccess2026!' },
        schoolStudent: { username: 'devschool', pin: '1111' },
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
