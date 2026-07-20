import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { FOUNDING_OFFER } from '@/lib/foundingInvite'

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

// GET /api/founding-invite?token=<token>
// Public — validates an invite token so the /join page can show the offer and
// pre-fill the email. Returns only what the page needs (no other PII).
export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) return NextResponse.json({ valid: false }, { status: 400 })

    const db = await connectDB()
    const w = await db.collection('waitlist').findOne(
      { inviteToken: token },
      { projection: { _id: 0, email: 1, firstName: 1, name: 1, convertedAt: 1 } }
    )
    if (!w) return NextResponse.json({ valid: false })

    return NextResponse.json({
      valid: true,
      email: w.email,
      firstName: w.firstName || (w.name ? String(w.name).split(' ')[0] : '') || '',
      alreadyConverted: !!w.convertedAt,
      offer: FOUNDING_OFFER,
    })
  } catch (error) {
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 })
  }
}

// POST /api/founding-invite  { token, event: 'signed-up' }
// Stamps signedUpAt when an invited person creates an account. (convertedAt is
// stamped server-side by the Stripe webhook on first payment.)
export async function POST(request) {
  try {
    const { token, event } = await request.json().catch(() => ({}))
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
    const db = await connectDB()
    const set = {}
    if (event === 'signed-up') set.signedUpAt = new Date()
    if (!Object.keys(set).length) return NextResponse.json({ error: 'unknown event' }, { status: 400 })
    await db.collection('waitlist').updateOne(
      { inviteToken: token, [Object.keys(set)[0]]: { $exists: false } },
      { $set: set }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
