import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

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

// Money-sensitive (grants free extra-child slots that normally cost $10/mo),
// so require the admin key like free-trial / promo-toggle / vouchers.
function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/extra-student] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

async function findParent(db, { parentId, email }) {
  if (parentId) return db.collection('parents').findOne({ id: parentId })
  if (email) return db.collection('parents').findOne({ email: String(email).trim().toLowerCase() })
  return null
}

// GET — report how many admin-granted extra-student slots a parent currently has
// and how many children they've already created (so the admin sees headroom).
//   /api/admin/extra-student?parentId=...   or   ?email=...
export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const { searchParams } = new URL(request.url)
    const db = await connectDB()
    const parent = await findParent(db, {
      parentId: searchParams.get('parentId'),
      email: searchParams.get('email'),
    })
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

    const childCount = await db.collection('children').countDocuments({
      $or: [{ parentId: parent.id }, { parent_id: parent.id }],
    })
    const adminExtraStudents = Math.max(0, Number(parent.adminExtraStudents) || 0)

    return NextResponse.json({
      parentId: parent.id,
      email: parent.email,
      childCount,
      adminExtraStudents,
      // Total children this parent may have without buying the paid add-on.
      allowedWithoutAddon: 1 + adminExtraStudents,
      siblingAddonActive: parent.siblingAddonActive === true,
    })
  } catch (error) {
    console.error('[admin/extra-student] GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — grant or set the number of admin-granted extra-student slots.
// Body shapes (target a parent by parentId OR email):
//   { parentId: '...', grant: 1 }     → add 1 extra slot (relative; default 1)
//   { email: '...', grant: 2 }        → add 2 extra slots
//   { parentId: '...', set: 0 }       → set the slot count to an absolute value
//
// This only touches parent.adminExtraStudents. It never changes the paid
// siblingAddonActive flag or any subscription/plan field, so it cannot affect
// billing on the main site.
export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json().catch(() => ({}))
    const db = await connectDB()

    const parent = await findParent(db, body)
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

    const current = Math.max(0, Number(parent.adminExtraStudents) || 0)

    let next
    if (typeof body.set === 'number') {
      next = Math.max(0, Math.floor(body.set))
    } else {
      // Relative grant; defaults to +1 when no amount is supplied.
      const delta = body.grant === undefined ? 1 : Math.floor(Number(body.grant))
      if (!Number.isFinite(delta)) {
        return NextResponse.json({ error: 'grant must be a number' }, { status: 400 })
      }
      next = Math.max(0, current + delta)
    }

    await db.collection('parents').updateOne(
      { id: parent.id },
      { $set: { adminExtraStudents: next, adminExtraStudentsUpdatedAt: new Date() } }
    )

    return NextResponse.json({
      success: true,
      parentId: parent.id,
      email: parent.email,
      adminExtraStudents: next,
      allowedWithoutAddon: 1 + next,
    })
  } catch (error) {
    console.error('[admin/extra-student] POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
