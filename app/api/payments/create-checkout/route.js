import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { MongoClient } from 'mongodb'
import { STRIPE_CONFIG } from '@/lib/stripeConfig'
import { getRequestToken, verifyToken } from '@/lib/auth'

// Whether the launch "first month free" promo is on (admin feature flag).
async function freeFirstMonthEnabled(db) {
  const doc = await db.collection('feature_flags').findOne({ _id: 'main' })
  return doc?.freeFirstMonth === true
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// The price IDs live in server-only env vars, so the client can't read them.
// It sends a stable `planKey` (e.g. "standardMonthly") which we resolve here.
// A raw `priceId` is still accepted as a fallback / for internal callers.
function resolvePriceId({ planKey, priceId }) {
  if (planKey && STRIPE_CONFIG.prices[planKey]) {
    return STRIPE_CONFIG.prices[planKey]
  }
  // Only allow a raw priceId if it matches one of our known prices.
  if (priceId && Object.values(STRIPE_CONFIG.prices).includes(priceId)) {
    return priceId
  }
  return null
}

const baseUrl =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000'

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    }

    // ── Auth: the caller must be a logged-in parent, and may only start a
    //    checkout for THEIR OWN account. Identity comes from the token, never
    //    from the request body — so nobody can pass someone else's parentId. ──
    const token = getRequestToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const auth = await verifyToken(token)
    if (!auth?.userId || auth.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      parentId, priceId, planKey, email,
      isFoundingFamily, applyFreeMonth,
      isSiblingAddOn,
    } = await request.json()

    if (!parentId) {
      return NextResponse.json({ error: 'parentId is required' }, { status: 400 })
    }
    // Reject any attempt to check out for a different account.
    if (parentId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = await connectDB()
    const parent = await db.collection('parents')
      .findOne({ id: parentId })

    // Get or create Stripe customer
    let stripeCustomerId = parent?.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email || parent?.email,
        name: parent?.name,
        metadata: {
          parentId,
          foundingFamily: isFoundingFamily ? 'true' : 'false',
        },
      })
      stripeCustomerId = customer.id
      await db.collection('parents').updateOne(
        { id: parentId },
        { $set: {
          stripeCustomerId,
          foundingFamily: isFoundingFamily || false,
        }}
      )
    }

    // ==================
    // FOUNDING FAMILY FLOW
    // Month 1: free trial
    // Month 2-12: $19.99/mo (foundingMonthly)
    // Month 13+: $24.99/mo (premiumMonthly)
    // Uses Stripe Subscription Schedule for auto price switch (created in webhook)
    // ==================
    if (isFoundingFamily) {
      if (!STRIPE_CONFIG.prices.foundingMonthly) {
        return NextResponse.json(
          { error: 'Founding price is not configured' }, { status: 503 }
        )
      }
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        line_items: [{
          price: STRIPE_CONFIG.prices.foundingMonthly,
          quantity: 1,
        }],
        success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing`,
        billing_address_collection: 'auto',
        subscription_data: {
          trial_period_days: 30,
          metadata: {
            parentId,
            foundingFamily: 'true',
            // Flag so webhook creates the schedule
            createSchedule: 'true',
            scheduleAfterCycles: '12',
            scheduleSwitchToPriceId:
              STRIPE_CONFIG.prices.premiumMonthly,
          },
        },
        metadata: {
          parentId,
          foundingFamily: 'true',
        },
        // Show "Founding Family" label at checkout
        custom_text: {
          submit: {
            message: '🏅 Founding Family offer: 1 month free, then $19.99/month for your first year, then $24.99/month.',
          },
        },
      })

      await db.collection('payment_sessions').insertOne({
        parentId,
        sessionId: session.id,
        status: 'pending',
        founding: true,
        createdAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        url: session.url,
        sessionId: session.id,
      })
    }

    // ==================
    // STANDARD/PREMIUM FLOW
    // ==================
    const resolvedPriceId = resolvePriceId({ planKey, priceId })
    if (!resolvedPriceId) {
      return NextResponse.json(
        { error: 'A valid plan must be selected' }, { status: 400 }
      )
    }

    const sessionParams = {
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Mark sibling add-on purchases so the webhook can flip
      // parent.siblingAddonActive once Stripe confirms the checkout.
      metadata: {
        parentId,
        ...(isSiblingAddOn === true ? { isSiblingAddOn: 'true' } : {}),
      },
      subscription_data: {
        metadata: {
          parentId,
          ...(isSiblingAddOn === true ? { isSiblingAddOn: 'true' } : {}),
        },
      },
    }

    // "First month free" trial that converts to paid.
    // A card IS collected at checkout, the first 30 days are free, the parent can
    // cancel anytime in the trial (via the billing portal) and never be charged,
    // and if they do nothing the subscription auto-charges on day 31.
    //
    // Eligibility: the caller can force it with applyFreeMonth, OR the launch
    // promo flag is on AND this parent has never used the free month before
    // (one trial per parent — prevents repeat free months by re-subscribing).
    const promoOn = await freeFirstMonthEnabled(db)
    const everHadTrial = !!parent?.freeTrialUsed || !!parent?.freeTrialUntil
    const useFreeMonth = applyFreeMonth || (promoOn && !everHadTrial && !isSiblingAddOn)

    if (useFreeMonth) {
      sessionParams.subscription_data.trial_period_days = 30
      // Force card collection up front so the trial can convert to paid.
      sessionParams.payment_method_collection = 'always'
      // If the card can't be charged when the trial ends, cancel rather than
      // leaving them in an unpaid limbo.
      sessionParams.subscription_data.trial_settings = {
        end_behavior: { missing_payment_method: 'cancel' },
      }
      // Mark so we don't grant the trial twice and so the webhook knows.
      sessionParams.subscription_data.metadata.freeFirstMonth = 'true'
      await db.collection('parents').updateOne(
        { id: parentId },
        { $set: { freeTrialUsed: true } }
      )
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams
    )

    await db.collection('payment_sessions').insertOne({
      parentId,
      sessionId: session.id,
      status: 'pending',
      priceId: resolvedPriceId,
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}
