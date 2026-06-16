import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { buildFreeTrialGrant, resolveEffectivePlan } from '@/lib/freeTrial'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Money-sensitive: granting free Premium must require the admin key, same as the
// promo-toggle / subscription-stats admin routes.
function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/free-trial] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

// Apply a fresh free month to one parent doc + cascade plan to their children.
async function grantToParent(db, parent) {
  const grant = buildFreeTrialGrant()
  await db.collection('parents').updateOne({ id: parent.id }, { $set: grant })
  await db.collection('children').updateMany(
    { $or: [{ parentId: parent.id }, { parent_id: parent.id }] },
    { $set: { plan: 'premium', accessBlocked: false } }
  )
  return grant.freeTrialUntil
}

// GET — report the auto-grant-on-signup flag + how many parents are on a free trial.
export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const db = await connectDB()
    const flagDoc = await db.collection('feature_flags').findOne({ _id: 'main' })
    const now = Date.now()
    const parents = await db.collection('parents')
      .find({ freeTrialUntil: { $exists: true } })
      .project({ id: 1, email: 1, name: 1, plan: 1, subscribed: 1, freeTrialUntil: 1 })
      .toArray()
    const active = parents.filter(p => new Date(p.freeTrialUntil).getTime() > now)
    return NextResponse.json({
      // testerFreeAccess = no-card free month at signup (this endpoint).
      autoGrantOnSignup: flagDoc?.testerFreeAccess === true,
      // freeFirstMonth = public Stripe-trial promo (handled at checkout).
      stripeTrialPromo: flagDoc?.freeFirstMonth === true,
      activeFreeTrials: active.length,
      totalGranted: parents.length,
    })
  } catch (error) {
    console.error('[admin/free-trial] GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — grant the free month.
// Body shapes:
//   { target: 'all' }                         → grant to every parent
//   { target: 'parent', parentId: '...' }     → grant to one by id
//   { target: 'parent', email: '...' }        → grant to one by email
//   { autoGrantOnSignup: true|false }          → toggle auto-grant-on-signup flag
export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const db = await connectDB()

    // Toggle tester no-card free access at signup (testerFreeAccess flag).
    if (typeof body.autoGrantOnSignup === 'boolean') {
      await db.collection('feature_flags').updateOne(
        { _id: 'main' },
        { $set: { testerFreeAccess: body.autoGrantOnSignup, updatedAt: new Date() } },
        { upsert: true }
      )
      return NextResponse.json({ success: true, autoGrantOnSignup: body.autoGrantOnSignup })
    }

    // Toggle the public Stripe-trial launch promo (freeFirstMonth flag). When on,
    // create-checkout starts a card-captured 30-day trial that auto-converts.
    if (typeof body.stripeTrialPromo === 'boolean') {
      await db.collection('feature_flags').updateOne(
        { _id: 'main' },
        { $set: { freeFirstMonth: body.stripeTrialPromo, updatedAt: new Date() } },
        { upsert: true }
      )
      return NextResponse.json({ success: true, stripeTrialPromo: body.stripeTrialPromo })
    }

    if (body.target === 'all') {
      const parents = await db.collection('parents').find({}).project({ id: 1 }).toArray()
      let granted = 0
      for (const p of parents) { await grantToParent(db, p); granted++ }
      return NextResponse.json({ success: true, granted })
    }

    if (body.target === 'parent') {
      let parent = null
      if (body.parentId) parent = await db.collection('parents').findOne({ id: body.parentId })
      else if (body.email) parent = await db.collection('parents').findOne({ email: String(body.email).trim().toLowerCase() })
      if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
      const until = await grantToParent(db, parent)
      return NextResponse.json({
        success: true,
        parentId: parent.id,
        plan: resolveEffectivePlan({ ...parent, ...buildFreeTrialGrant() }),
        freeTrialUntil: until,
      })
    }

    return NextResponse.json({ error: 'Invalid request. Use target "all" | "parent", or autoGrantOnSignup.' }, { status: 400 })
  } catch (error) {
    console.error('[admin/free-trial] POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
