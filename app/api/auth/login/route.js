import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createToken, setAuthCookie } from '@/lib/auth'
import { updateStreak } from '@/lib/streak'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URL)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function POST(request) {
  try {
    const { email, password, pin, username, role } = await request.json()
    const db = await connectDB()

    // STUDENT login (username + PIN)
    if (role === 'student' || (username && pin)) {
      const student = await db.collection('children').findOne({
        username: username?.toLowerCase().trim()
      })
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      if (student.pin !== pin) {
        return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
      }

      const token = await createToken({
        userId: student.id,
        role: 'student',
        name: student.name,
        grade: student.grade ?? null,
      })

      const streakUpdate = await updateStreak(student.id, db)
      const { _id, pin: p, ...safeStudent } = student
      const response = NextResponse.json({ success: true, role: 'student', user: safeStudent, token, streakUpdate })
      setAuthCookie(response, token)
      return response
    }

    // PARENT login (email + password)
    if (role === 'parent' || (!role && email)) {
      const parent = await db.collection('parents').findOne({
        email: email?.toLowerCase().trim()
      })
      if (!parent) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      let passwordMatch = false
      if (parent.password.startsWith('$2')) {
        passwordMatch = await bcrypt.compare(password, parent.password)
      } else {
        passwordMatch = parent.password === password
      }
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }

      const token = await createToken({
        userId: parent.id,
        role: 'parent',
        name: parent.name,
        grade: null,
      })

      const { _id, password: pw, ...safeParent } = parent
      const response = NextResponse.json({ success: true, role: 'parent', user: safeParent, token })
      setAuthCookie(response, token)
      return response
    }

    // TEACHER login
    if (role === 'teacher') {
      const teacher = await db.collection('teachers').findOne({
        email: email?.toLowerCase().trim()
      })
      if (!teacher) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }
      if (!teacher.approved) {
        return NextResponse.json({
          error: 'pending_approval',
          message: 'Your account is being reviewed. You will receive an email within 24 hours.',
          email: teacher.email,
          school: teacher.school,
        }, { status: 403 })
      }

      let passwordMatch = false
      if (teacher.password.startsWith('$2')) {
        passwordMatch = await bcrypt.compare(password, teacher.password)
      } else {
        passwordMatch = teacher.password === password
      }
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }

      const token = await createToken({
        userId: teacher.id,
        role: 'teacher',
        name: teacher.name,
        grade: teacher.grade ?? null,
      })

      const { _id, password: pw, ...safeTeacher } = teacher
      const response = NextResponse.json({ success: true, role: 'teacher', user: safeTeacher, token })
      setAuthCookie(response, token)
      return response
    }

    return NextResponse.json({ error: 'Invalid login request' }, { status: 400 })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
