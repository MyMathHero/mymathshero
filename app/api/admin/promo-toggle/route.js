import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

// Gate: turning a 100%-off promo on/off is money-sensitive. Require x-admin-key.
function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/promo-toggle] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

// Return the current active state of the FREE1MONTH promo code.
export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

  try {
    const list = await stripe.promotionCodes.list({ code: 'FREE1MONTH', limit: 1 })
    const promo = list.data[0]
    if (!promo) return NextResponse.json({ exists: false, active: false })
    return NextResponse.json({ exists: true, active: promo.active, id: promo.id })
  } catch (error) {
    console.error('[admin/promo-toggle] GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Body: { active: boolean }
export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

  try {
    const { active } = await request.json()
    const list = await stripe.promotionCodes.list({ code: 'FREE1MONTH', limit: 1 })
    const promo = list.data[0]
    if (!promo) {
      return NextResponse.json({ error: 'FREE1MONTH promo code not found' }, { status: 404 })
    }

    const updated = await stripe.promotionCodes.update(promo.id, { active: !!active })
    return NextResponse.json({ id: updated.id, active: updated.active })
  } catch (error) {
    console.error('[admin/promo-toggle] POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
