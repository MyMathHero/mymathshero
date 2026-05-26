import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint
    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'MyMathsHero API is running', status: 'ok' }))
    }

    // ===== WAITLIST SIGNUP =====
    if (route === '/waitlist' && method === 'POST') {
      const body = await request.json()
      const { name, email, role } = body

      if (!name || !name.trim()) {
        return handleCORS(NextResponse.json({ error: 'Name is required' }, { status: 400 }))
      }
      if (!email || !email.trim()) {
        return handleCORS(NextResponse.json({ error: 'Email is required' }, { status: 400 }))
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return handleCORS(NextResponse.json({ error: 'Invalid email format' }, { status: 400 }))
      }
      if (!role || !role.trim()) {
        return handleCORS(NextResponse.json({ error: 'Role is required' }, { status: 400 }))
      }
      const validRoles = ['Parent', 'Teacher', 'Student', 'School Administrator']
      if (!validRoles.includes(role)) {
        return handleCORS(NextResponse.json({ error: 'Invalid role' }, { status: 400 }))
      }

      // Check for duplicate email
      const existing = await db.collection('waitlist').findOne({ email: email.toLowerCase().trim() })
      if (existing) {
        return handleCORS(NextResponse.json({ error: 'This email is already on the waitlist' }, { status: 409 }))
      }

      const entry = {
        id: uuidv4(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        created_at: new Date(),
      }

      await db.collection('waitlist').insertOne(entry)
      const { _id, ...cleanEntry } = entry
      return handleCORS(NextResponse.json({ message: 'Successfully joined the waitlist!', data: cleanEntry }, { status: 201 }))
    }

    // GET waitlist entries
    if (route === '/waitlist' && method === 'GET') {
      const entries = await db.collection('waitlist').find({}).sort({ created_at: -1 }).limit(100).toArray()
      const cleaned = entries.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // ===== DEMO REQUESTS =====
    if (route === '/demo-request' && method === 'POST') {
      const body = await request.json()
      const { name, school_name, role, email, phone } = body

      if (!name || !name.trim()) {
        return handleCORS(NextResponse.json({ error: 'Name is required' }, { status: 400 }))
      }
      if (!school_name || !school_name.trim()) {
        return handleCORS(NextResponse.json({ error: 'School name is required' }, { status: 400 }))
      }
      if (!role || !role.trim()) {
        return handleCORS(NextResponse.json({ error: 'Role is required' }, { status: 400 }))
      }
      if (!email || !email.trim()) {
        return handleCORS(NextResponse.json({ error: 'Email is required' }, { status: 400 }))
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return handleCORS(NextResponse.json({ error: 'Invalid email format' }, { status: 400 }))
      }

      const entry = {
        id: uuidv4(),
        name: name.trim(),
        school_name: school_name.trim(),
        role: role.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : '',
        created_at: new Date(),
      }

      await db.collection('demo_requests').insertOne(entry)
      const { _id, ...cleanEntry } = entry
      return handleCORS(NextResponse.json({ message: 'Demo request submitted successfully!', data: cleanEntry }, { status: 201 }))
    }

    // GET demo requests
    if (route === '/demo-request' && method === 'GET') {
      const entries = await db.collection('demo_requests').find({}).sort({ created_at: -1 }).limit(100).toArray()
      const cleaned = entries.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // ===== PARENT REGISTRATION =====
    if (route === '/register-parent' && method === 'POST') {
      const body = await request.json()
      const { name, email, password, phone } = body

      if (!name || !name.trim()) return handleCORS(NextResponse.json({ error: 'Name is required' }, { status: 400 }))
      if (!email || !email.trim()) return handleCORS(NextResponse.json({ error: 'Email is required' }, { status: 400 }))
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) return handleCORS(NextResponse.json({ error: 'Invalid email format' }, { status: 400 }))
      if (!password || password.length < 6) return handleCORS(NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 }))

      const existing = await db.collection('parents').findOne({ email: email.toLowerCase().trim() })
      if (existing) return handleCORS(NextResponse.json({ error: 'Email already registered' }, { status: 409 }))

      const entry = {
        id: uuidv4(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password,
        phone: phone ? phone.trim() : '',
        children: [],
        created_at: new Date(),
      }

      await db.collection('parents').insertOne(entry)
      const { _id, password: pw, ...cleanEntry } = entry
      return handleCORS(NextResponse.json({ message: 'Account created successfully!', data: cleanEntry }, { status: 201 }))
    }

    // ===== ADD CHILD =====
    if (route === '/add-child' && method === 'POST') {
      const body = await request.json()
      const { parent_id, child_name, grade, avatar } = body

      if (!parent_id) return handleCORS(NextResponse.json({ error: 'Parent ID is required' }, { status: 400 }))
      if (!child_name || !child_name.trim()) return handleCORS(NextResponse.json({ error: 'Child name is required' }, { status: 400 }))
      if (!grade) return handleCORS(NextResponse.json({ error: 'Grade is required' }, { status: 400 }))

      const username = child_name.toLowerCase().replace(/[^a-z]/g, '') + new Date().getFullYear()
      const pin = String(Math.floor(1000 + Math.random() * 9000))

      const child = {
        id: uuidv4(),
        parent_id,
        parentId: parent_id,
        type: 'private',
        schoolId: null,
        classId: null,
        teacherId: null,
        name: child_name.trim(),
        username,
        pin,
        grade,
        avatar: avatar || '🦊',
        coins: 100,
        xp: 0,
        level: 1,
        streak: 0,
        sessions_completed: 0,
        created_at: new Date(),
      }

      await db.collection('children').insertOne(child)
      await db.collection('parents').updateOne({ id: parent_id }, { $push: { children: child.id } })
      const { _id, ...cleanChild } = child
      return handleCORS(NextResponse.json({ message: 'Child added successfully!', data: cleanChild }, { status: 201 }))
    }

    // ===== JOIN CLASS =====
    if (route === '/join-class' && method === 'POST') {
      const body = await request.json()
      const { joinCode, studentName, avatar, grade } = body

      if (!joinCode?.trim()) return handleCORS(NextResponse.json({ error: 'joinCode is required' }, { status: 400 }))
      if (!studentName?.trim()) return handleCORS(NextResponse.json({ error: 'studentName is required' }, { status: 400 }))

      const cls = await db.collection('classes').findOne({ joinCode: joinCode.trim().toUpperCase() })
      if (!cls) return handleCORS(NextResponse.json({ error: 'Invalid join code' }, { status: 404 }))

      // Generate unique username: first name + 4-digit year suffix + random 2-digit to avoid collisions
      const base = studentName.toLowerCase().replace(/[^a-z]/g, '')
      const suffix = new Date().getFullYear().toString().slice(-2) + String(Math.floor(10 + Math.random() * 90))
      const username = base + suffix
      const pin = String(Math.floor(1000 + Math.random() * 9000))

      const child = {
        id: uuidv4(),
        name: studentName.trim(),
        username,
        pin,
        grade: grade ?? cls.grade,
        avatar: avatar || '🦊',
        classId: cls.id,
        coins: 100,
        xp: 0,
        level: 1,
        streak: 0,
        sessions_completed: 0,
        created_at: new Date(),
      }

      await db.collection('children').insertOne(child)
      await db.collection('classes').updateOne({ id: cls.id }, { $push: { students: child.id } })

      const { _id, pin: p, ...safeChild } = child
      return handleCORS(NextResponse.json({
        student: { ...safeChild, pin },   // include pin once so parent/teacher can record it
        class: { className: cls.className, grade: cls.grade, joinCode: cls.joinCode },
      }, { status: 201 }))
    }

    // Route not found
    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
