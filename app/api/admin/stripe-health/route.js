import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { STRIPE_CONFIG } from '@/lib/stripeConfig'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Stripe launch-readiness check ────────────────────────────────────────────
// Admin-only (x-admin-key). Answers ONE question: "is production actually wired
// to live Stripe correctly?" — without ever exposing a key. It reports modes,
// whether every configured price resolves, and whether the webhook subscribes to
// every event the handler implements.
//
//   curl -H "x-admin-key: $ADMIN_API_KEY" https://mymathshero.com.au/api/admin/stripe-health

// Every event app/api/payments/webhook/route.js has a `case` for. If the webhook
// endpoint doesn't subscribe to one of these, that code path never runs.
const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
]

const WEBHOOK_PATH = '/api/payments/webhook'

function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) return { ok: false, status: 500, error: 'ADMIN_API_KEY not configured' }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const problems = []
  const secret = process.env.STRIPE_SECRET_KEY || ''
  const mode = secret.startsWith('sk_live_') ? 'live'
    : secret.startsWith('sk_test_') ? 'test'
    : secret ? 'unknown' : 'missing'

  if (mode !== 'live') problems.push(`STRIPE_SECRET_KEY is ${mode} (expected live)`)
  if (!process.env.STRIPE_WEBHOOK_SECRET) problems.push('STRIPE_WEBHOOK_SECRET is not set')

  const report = {
    stripeMode: mode,
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || null,
    comingSoonMode: process.env.COMING_SOON_MODE === 'true',
  }

  if (!secret) {
    return NextResponse.json({ ...report, verdict: 'NOT READY', problems }, { status: 200 })
  }

  const stripe = new Stripe(secret)

  // ── Account ──
  try {
    const acct = await stripe.accounts.retrieve()
    report.account = {
      name: acct.business_profile?.name || acct.settings?.dashboard?.display_name || acct.id,
      country: acct.country,
      currency: acct.default_currency,
      chargesEnabled: acct.charges_enabled,
      payoutsEnabled: acct.payouts_enabled,
    }
    if (!acct.charges_enabled) problems.push('Stripe account cannot accept charges yet')
  } catch (e) {
    problems.push(`Account lookup failed: ${e.message}`)
  }

  // ── Prices: does every configured ID resolve, and is it in the right mode? ──
  report.prices = {}
  for (const [name, id] of Object.entries(STRIPE_CONFIG.prices)) {
    if (!id) { report.prices[name] = { set: false }; problems.push(`Price ${name} is not set`); continue }
    try {
      const p = await stripe.prices.retrieve(id, { expand: ['product'] })
      const wrongMode = (mode === 'live') !== p.livemode
      report.prices[name] = {
        set: true,
        amount: `${p.currency.toUpperCase()} ${(p.unit_amount / 100).toFixed(2)}/${p.recurring?.interval || 'once'}`,
        product: p.product?.name,
        active: p.active,
        livemode: p.livemode,
      }
      if (wrongMode) problems.push(`Price ${name} is ${p.livemode ? 'live' : 'test'} but the key is ${mode}`)
      if (!p.active) problems.push(`Price ${name} is archived/inactive`)
    } catch (e) {
      report.prices[name] = { set: true, error: e.message }
      problems.push(`Price ${name} (${id}) does not resolve — wrong mode or deleted`)
    }
  }

  // ── Webhook: is an endpoint pointing at us, and does it cover every event? ──
  try {
    const list = await stripe.webhookEndpoints.list({ limit: 100 })
    const ours = list.data.filter(w => (w.url || '').includes(WEBHOOK_PATH))
    if (!ours.length) {
      report.webhook = { found: false }
      problems.push(`No webhook endpoint found for ${WEBHOOK_PATH} in ${mode} mode`)
    } else {
      report.webhook = ours.map(w => {
        const events = w.enabled_events || []
        // '*' means "all events", which satisfies everything.
        const all = events.includes('*')
        const missing = all ? [] : REQUIRED_EVENTS.filter(e => !events.includes(e))
        if (w.status !== 'enabled') problems.push(`Webhook ${w.url} is ${w.status}`)
        if (missing.length) problems.push(`Webhook missing events: ${missing.join(', ')}`)
        return { url: w.url, status: w.status, livemode: w.livemode, eventCount: events.length, missingEvents: missing }
      })
    }
  } catch (e) {
    problems.push(`Webhook lookup failed: ${e.message}`)
  }

  report.problems = problems
  report.verdict = problems.length ? 'NOT READY' : 'READY ✅'
  return NextResponse.json(report)
}
