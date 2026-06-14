import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail, sendEmail } from '@/lib/email'
import { normaliseGrade } from '@/lib/normaliseGrade'

let client
let db

// Use the same env-var names + default DB name as every other route in this
// codebase. Reading the wrong env (MONGO_URL / DB_NAME) was the cause of the
// "Internal server error" on the waitlist form — Mongo connected to undefined.
async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    db = client.db(process.env.DB_NAME || 'mymathshero')
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

// ── Waitlist email HTML ──────────────────────────────────────────────────────
// Branded confirmation sent to the user, and an admin alert sent to admin@.

function waitlistConfirmationHtml(entry) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1B2B4B;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1B2B4B;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:white;letter-spacing:-0.5px;">
        MyMaths<span style="color:#C49A1A;">Hero</span>
      </div>
      <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:4px;">Personalised AI Maths Learning</div>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#C49A1A,#F0C040,#C49A1A);"></div>
    <div style="background:white;padding:40px;">
      <h1 style="font-size:24px;font-weight:800;color:#1B2B4B;margin:0 0 16px;">You're on the list! 🎉</h1>
      <p style="font-size:15px;line-height:1.7;color:#334155;margin:0 0 16px;">Hi ${entry.name},</p>
      <p style="font-size:15px;line-height:1.7;color:#334155;margin:0 0 16px;">
        Thanks for joining the MyMathsHero waitlist as a <strong>${entry.role}</strong>!
        We'll be in touch soon with early access details.
      </p>
      <div style="background:#FFFBEB;border:1px solid #C49A1A;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0;font-weight:700;color:#1B2B4B;">What happens next?</p>
        <p style="margin:8px 0 0;font-size:14px;color:#334155;">
          We'll email you when MyMathsHero opens to your group, along with your founding-family offer.
        </p>
      </div>
      <p style="font-size:14px;color:#64748B;margin:24px 0 0;">
        Questions? Just reply to this email — we read every one.
      </p>
    </div>
    <div style="background:#1B2B4B;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
      <p style="color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;margin:0;">
        © ${new Date().getFullYear()} MyMathsHero · Melbourne, Australia
      </p>
      <p style="margin:8px 0 0;">
        <a href="https://mymathshero.com.au" style="color:#C49A1A;text-decoration:none;font-size:12px;">mymathshero.com.au</a>
      </p>
    </div>
  </div>
</body></html>`
}

function waitlistAdminAlertHtml(entry) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1B2B4B;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1B2B4B;border-radius:16px;padding:32px 40px;">
      <p style="margin:0;color:#C49A1A;font-size:11px;font-weight:700;letter-spacing:1px;">ADMIN ALERT</p>
      <h1 style="margin:8px 0 16px;color:white;font-size:22px;font-weight:800;">New waitlist signup</h1>
      <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.05);border-radius:8px;">
        <tr><td style="padding:10px 14px;color:rgba(255,255,255,0.6);font-size:13px;width:80px;">Name</td><td style="padding:10px 14px;color:white;font-size:14px;font-weight:600;">${entry.name}</td></tr>
        <tr><td style="padding:10px 14px;color:rgba(255,255,255,0.6);font-size:13px;border-top:1px solid rgba(255,255,255,0.08);">Email</td><td style="padding:10px 14px;color:white;font-size:14px;font-weight:600;border-top:1px solid rgba(255,255,255,0.08);">${entry.email}</td></tr>
        <tr><td style="padding:10px 14px;color:rgba(255,255,255,0.6);font-size:13px;border-top:1px solid rgba(255,255,255,0.08);">Role</td><td style="padding:10px 14px;color:#C49A1A;font-size:14px;font-weight:800;border-top:1px solid rgba(255,255,255,0.08);">${entry.role}</td></tr>
        <tr><td style="padding:10px 14px;color:rgba(255,255,255,0.6);font-size:13px;border-top:1px solid rgba(255,255,255,0.08);">Joined</td><td style="padding:10px 14px;color:white;font-size:14px;border-top:1px solid rgba(255,255,255,0.08);">${entry.created_at.toISOString()}</td></tr>
      </table>
    </div>
  </div>
</body></html>`
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

      // Fire-and-forget emails: confirmation to user + admin alert. Don't block
      // the response on Resend latency; never let an email failure 500 the form.
      ;(async () => {
        try {
          await sendEmail({
            to: entry.email,
            subject: 'You\'re on the MyMathsHero waitlist! 🎉',
            from: 'hello',
            html: waitlistConfirmationHtml(entry),
          })
        } catch (err) {
          console.error('Waitlist confirmation email failed:', err?.message || err)
        }
        try {
          await sendEmail({
            to: 'admin@mymathshero.com.au',
            subject: `New waitlist signup: ${entry.name} (${entry.role})`,
            from: 'admin',
            html: waitlistAdminAlertHtml(entry),
          })
        } catch (err) {
          console.error('Waitlist admin alert failed:', err?.message || err)
        }
      })()

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
      if (grade === undefined || grade === null || grade === '') return handleCORS(NextResponse.json({ error: 'Grade is required' }, { status: 400 }))

      // Normalise the grade to an integer (0–6). Historically this route
      // stored whatever string the client sent ("Year 4" etc.) which broke
      // every numeric query downstream.
      const gradeInt = normaliseGrade(grade)

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
        grade: gradeInt,
        avatar: avatar || 'hero', // default character avatar (see lib/characterAvatars)
        coins: 100,
        xp: 0,
        level: 1,
        streak: 0,
        sessions_completed: 0,
        created_at: new Date(),
      }

      await db.collection('children').insertOne(child)
      await db.collection('parents').updateOne({ id: parent_id }, { $push: { children: child.id } })

      // Fire-and-forget welcome email (don't block the response on email).
      ;(async () => {
        try {
          const parent = await db.collection('parents').findOne({ id: parent_id })
          if (parent?.email) {
            await sendWelcomeEmail({
              parentEmail: parent.email,
              parentName: parent.name || 'there',
              childName: child.name,
              childGrade: child.grade,
            })
          }
        } catch (err) {
          console.error('Welcome email failed:', err.message)
        }
      })()

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
        grade: grade != null && grade !== '' ? normaliseGrade(grade) : normaliseGrade(cls.grade),
        avatar: avatar || 'hero', // default character avatar (see lib/characterAvatars)
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
