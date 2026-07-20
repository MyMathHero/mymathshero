import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { buildFreeTrialGrant } from '@/lib/freeTrial'
import { createToken, setAuthCookie } from '@/lib/auth'

// Tester access: when the `testerFreeAccess` flag is on, every new parent signup
// is granted a free month of Premium with NO card and NO auto-charge (used for
// the 20-student test cohort). The public launch promo (`freeFirstMonth`) is a
// SEPARATE Stripe-trial flow handled at checkout, not here.
async function testerFreeAccessEnabled(db) {
  const doc = await db.collection('feature_flags').findOne({ _id: 'main' })
  return doc?.testerFreeAccess === true
}

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
    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json({ error: 'role is required (parent or teacher)' }, { status: 400 })
    }

    const db = await connectDB()

    // ── Parent registration ──────────────────────────────────────────────────
    if (role === 'parent') {
      const { name, email, password, inviteToken } = body

      if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
      if (!email?.trim()) return NextResponse.json({ error: 'email is required' }, { status: 400 })
      if (!password)      return NextResponse.json({ error: 'password is required' }, { status: 400 })
      if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

      const normalizedEmail = email.trim().toLowerCase()

      const existing = await db.collection('parents').findOne({ email: normalizedEmail })
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const parentId = uuidv4()

      // Grant testers a no-card free month at signup when enabled.
      const grantFreeMonth = await testerFreeAccessEnabled(db)
      const trialFields = grantFreeMonth ? buildFreeTrialGrant() : {}

      // Founding-family invite: if they arrived via a valid /join invite, tag the
      // account so checkout can offer the founding plan, and mark the waitlister
      // as signed up (conversion is stamped later, on first payment).
      let fromFoundingInvite = false
      if (inviteToken) {
        const w = await db.collection('waitlist').findOne({ inviteToken })
        if (w) {
          fromFoundingInvite = true
          db.collection('waitlist').updateOne(
            { inviteToken, signedUpAt: { $exists: false } },
            { $set: { signedUpAt: new Date(), signedUpParentId: parentId } }
          ).catch(() => {})
        }
      }

      await db.collection('parents').insertOne({
        id: parentId,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: body.phone?.trim() || '',
        children: [],
        created_at: new Date(),
        ...(fromFoundingInvite ? { foundingFamily: true, foundingInviteToken: inviteToken } : {}),
        ...trialFields,
      })

      // Admin-feed notification: a new parent signed up.
      try {
        const { notifyAdmin } = await import('@/lib/notifications')
        notifyAdmin(db, {
          type: 'system', icon: '🧑‍🤝‍🧑',
          title: 'New parent signup',
          body: `${name.trim()} (${normalizedEmail})${grantFreeMonth ? ' — tester free month' : ''}`,
          link: 'parents',
        }).catch(() => {})
      } catch { /* non-fatal */ }

      // Fire-and-forget account welcome (don't block the response on email).
      try {
        const { sendAccountWelcome } = await import('@/lib/email')
        sendAccountWelcome({ parentEmail: normalizedEmail, parentName: name.trim() }).catch(() => {})
      } catch { /* non-fatal */ }

      // Log the parent in immediately so they land on the dashboard after
      // onboarding instead of bouncing back to the "Create account" landing.
      const token = await createToken({
        userId: parentId,
        role: 'parent',
        name: name.trim(),
        grade: null,
      })
      const response = NextResponse.json({
        success: true,
        data: {
          id: parentId,
          name: name.trim(),
          email: normalizedEmail,
          role: 'parent',
          plan: grantFreeMonth ? 'premium' : 'free',
          freeTrialUntil: trialFields.freeTrialUntil || null,
        },
      }, { status: 201 })
      setAuthCookie(response, token)
      return response
    }

    // ── Teacher registration ─────────────────────────────────────────────────
    if (role === 'teacher') {
      const { name, school, grade, email, password } = body

      if (!name?.trim())   return NextResponse.json({ error: 'name is required' }, { status: 400 })
      if (!school?.trim()) return NextResponse.json({ error: 'school is required' }, { status: 400 })
      if (!grade?.trim())  return NextResponse.json({ error: 'grade is required' }, { status: 400 })
      if (!email?.trim())  return NextResponse.json({ error: 'email is required' }, { status: 400 })
      if (!password)       return NextResponse.json({ error: 'password is required' }, { status: 400 })
      if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

      const normalizedEmail = email.trim().toLowerCase()

      const existing = await db.collection('teachers').findOne({ email: normalizedEmail })
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const teacherId = uuidv4()

      await db.collection('teachers').insertOne({
        id: teacherId,
        name: name.trim(),
        school: school.trim(),
        grade: grade.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        approved: false,
        pending: true,
        students: [],
        created_at: new Date(),
      })

      return NextResponse.json({
        success: true,
        data: {
          id: teacherId,
          name: name.trim(),
          email: normalizedEmail,
          school: school.trim(),
          grade: grade.trim(),
          role: 'teacher',
          approved: false,
          pending: true,
        },
      }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid role. Must be "parent" or "teacher".' }, { status: 400 })

  } catch (error) {
    console.error('Register error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
