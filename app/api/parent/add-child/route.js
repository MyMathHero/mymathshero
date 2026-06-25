import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import { getRequestToken, verifyToken } from '@/lib/auth'
import { normaliseGrade } from '@/lib/normaliseGrade'
import { resolveEffectivePlan } from '@/lib/freeTrial'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

function generateId() {
  return `child_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function generateUsername(name) {
  const slug = String(name).toLowerCase().replace(/[^a-z]/g, '') || 'hero'
  return `${slug}${Math.floor(Math.random() * 9000 + 1000)}`
}

// Add a new child to the authenticated parent.
//
// Rules:
//   • Parent identity comes from the session JWT, not the body. Anyone hitting
//     this without a parent session gets 401.
//   • Parents with accessBlocked === true get 403 — must resubscribe first.
//   • The first child is included in the main subscription. Any additional
//     children require parent.siblingAddonActive === true, which the Stripe
//     webhook sets when the sibling-monthly add-on is purchased.
export async function POST(request) {
  try {
    const token = getRequestToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload?.userId || payload.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const parentId = payload.userId

    const { name, grade, pin, perceivedLevel, confidence } = await request.json().catch(() => ({}))

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Child name is required' }, { status: 400 })
    }
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 })
    }

    const db = await connectDB()

    const parent = await db.collection('parents').findOne({ id: parentId })
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    if (parent.accessBlocked) {
      return NextResponse.json({
        error: 'Active subscription required to add children',
        requiresSubscription: true,
      }, { status: 403 })
    }

    // Sibling add-on gate. Count children under both possible parent fields.
    const existingCount = await db.collection('children').countDocuments({
      $or: [{ parentId }, { parent_id: parentId }],
    })
    // The first child is included. Additional children need EITHER the paid
    // sibling add-on (siblingAddonActive, unlimited) OR an admin-granted free
    // slot (freeChildGrants, consumed one-per-child below). Otherwise the parent
    // must pay for the $10/mo sibling add-on.
    const freeChildGrants = Math.max(0, Number(parent.freeChildGrants) || 0)
    const usingFreeGrant = existingCount >= 1 && !parent.siblingAddonActive && freeChildGrants > 0
    if (existingCount >= 1 && !parent.siblingAddonActive && freeChildGrants <= 0) {
      return NextResponse.json({
        error: 'Sibling add-on required for additional children',
        requiresSiblingAddon: true,
      }, { status: 403 })
    }

    const gradeNum = normaliseGrade(grade)

    // New children inherit the parent's CURRENT effective plan, so a child added
    // while the parent is premium (paid or free-month) is premium immediately —
    // not stuck on 'free' waiting for a cascade that only touches existing kids.
    const inheritedPlan = resolveEffectivePlan(parent)

    const hashedPin = await bcrypt.hash(String(pin), 10)
    const studentId = generateId()
    const trimmedName = name.trim()

    await db.collection('children').insertOne({
      id: studentId,
      parentId,           // canonical (camelCase)
      parent_id: parentId, // legacy (snake_case) — keep both for old read paths
      name: trimmedName,
      username: generateUsername(trimmedName),
      grade: gradeNum,
      pin: hashedPin,
      // Parent insight feeds AI placement after the diagnostic.
      parentInsight: {
        perceivedLevel: ['below', 'at', 'above'].includes(perceivedLevel) ? perceivedLevel : 'at',
        confidence: ['low', 'medium', 'high'].includes(confidence) ? confidence : 'medium',
        enteredGrade: gradeNum,
      },
      xp: 0,
      coins: 0,
      streak: 0,
      type: 'private',
      plan: inheritedPlan,
      diagnosticComplete: false,
      unlockedGames: [],
      accessBlocked: false,
      createdAt: new Date(),
    })

    // Consume one admin-granted free slot if that's what authorised this child.
    if (usingFreeGrant) {
      await db.collection('parents').updateOne(
        { id: parentId },
        { $inc: { freeChildGrants: -1 } }
      )
    }

    return NextResponse.json({
      success: true,
      studentId,
      message: `${trimmedName} added successfully!`,
    })
  } catch (error) {
    console.error('[add-child]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
