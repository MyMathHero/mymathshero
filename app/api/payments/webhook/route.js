import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { MongoClient } from 'mongodb'
import { getPlanFromPriceId, STRIPE_CONFIG } from '@/lib/stripeConfig'
import { sendEmail } from '@/lib/email'

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

// ── Field extractors (resilient across Stripe API versions) ──────────────────
// The 2026-03-25 API moved several fields. We read the new locations first and
// fall back to the legacy ones so this keeps working if the API version shifts.

function priceIdFromInvoice(invoice) {
  const line = invoice?.lines?.data?.[0]
  return (
    line?.pricing?.price_details?.price ||
    line?.price?.id ||
    line?.plan?.id ||
    null
  )
}

function subscriptionIdFromInvoice(invoice) {
  return (
    invoice?.parent?.subscription_details?.subscription ||
    invoice?.subscription ||
    null
  )
}

function priceIdFromSubscription(sub) {
  const item = sub?.items?.data?.[0]
  return item?.price?.id || item?.plan?.id || null
}

function periodEndFromSubscription(sub) {
  const item = sub?.items?.data?.[0]
  const ts = item?.current_period_end || sub?.current_period_end
  return ts ? new Date(ts * 1000) : null
}

// ── Email templates ──────────────────────────────────────────────────────────
function welcomeHtml({ name, plan, foundingFamily }) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1B2B4B;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0">MyMaths<span style="color:#C49A1A">Hero</span></h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E2E8F0">
        <h2 style="color:#1B2B4B">✅ You are in!</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your <strong>${plan === 'premium' ? 'Premium' : 'Standard'}</strong> subscription is now active.</p>
        ${foundingFamily
          ? '<p>🏅 As a <strong>Founding Family</strong> you get 1 month free, then just $19.99/month for your first year. After that it moves to $24.99/month.</p>'
          : ''}
        <a href="https://mymathshero.com.au/parent-dashboard"
          style="display:block;background:#1B2B4B;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:800;border:2px solid #C49A1A;margin-top:20px">
          Go to Dashboard →
        </a>
      </div>
    </div>
  `
}

function paymentFailedHtml({ name, attemptCount }) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1B2B4B;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0">MyMaths<span style="color:#C49A1A">Hero</span></h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E2E8F0">
        <h2 style="color:#EF4444">⚠️ Payment Failed</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We could not process your MyMathsHero payment${attemptCount ? ` (attempt ${attemptCount})` : ''}.</p>
        <p>Please update your payment method to keep your child's access.</p>
        <a href="https://mymathshero.com.au/manage-subscription"
          style="display:block;background:#EF4444;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:800;margin-top:20px">
          Update Payment Method →
        </a>
      </div>
    </div>
  `
}

function cancelledHtml({ name }) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1B2B4B;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0">MyMaths<span style="color:#C49A1A">Hero</span></h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E2E8F0">
        <h2 style="color:#1B2B4B">Subscription Ended</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your MyMathsHero subscription has ended and your child's access has been paused.</p>
        <p>We would love to have you back — resubscribe anytime to restore access immediately.</p>
        <a href="https://mymathshero.com.au/pricing"
          style="display:block;background:#1B2B4B;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:800;border:2px solid #C49A1A;margin-top:20px">
          Resubscribe →
        </a>
      </div>
    </div>
  `
}

function trialEndingHtml({ name, trialEnd, isFoundingFam }) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1B2B4B;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0">MyMaths<span style="color:#C49A1A">Hero</span></h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E2E8F0">
        <h2 style="color:#1B2B4B">⏰ Trial ending ${trialEnd ? trialEnd.toLocaleDateString('en-AU') : 'soon'}</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your free trial ends in 3 days.</p>
        ${isFoundingFam
          ? `<div style="background:#FFFBEB;border:2px solid #C49A1A;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:800;color:#1B2B4B">🏅 Founding Family Offer</p>
              <p style="margin:8px 0 0;color:#64748B">After your free month, you will be charged just <strong>$19.99/month for your first year</strong>. That is a saving of $60 compared to the regular price!</p>
              <p style="margin:8px 0 0;color:#64748B">After your first year it moves to $24.99/month.</p>
            </div>`
          : '<p>Your subscription will continue automatically. Make sure your payment details are up to date.</p>'
        }
        <a href="https://mymathshero.com.au/manage-subscription"
          style="display:block;background:#1B2B4B;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:800;border:2px solid #C49A1A;margin-top:20px">
          Manage Subscription →
        </a>
      </div>
    </div>
  `
}

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return NextResponse.json(
      { error: 'Invalid signature' }, { status: 400 }
    )
  }

  const db = await connectDB()

  try {
    switch (event.type) {

      // ✅ CHECKOUT COMPLETED — keep the existing payment_sessions flow in sync
      case 'checkout.session.completed': {
        const session = event.data.object
        const parentId = session.metadata?.parentId

        await db.collection('payment_sessions').updateOne(
          { sessionId: session.id },
          { $set: {
            status: 'active',
            subscriptionId: session.subscription,
            customerId: session.customer,
            updatedAt: new Date(),
          }}
        )

        if (parentId) {
          await db.collection('parents').updateOne(
            { id: parentId },
            { $set: {
              subscribed: true,
              stripeCustomerId: session.customer,
              customerId: session.customer,
              subscriptionId: session.subscription,
              subscribedAt: new Date(),
              accessBlocked: false,
            }}
          )
        }
        break
      }

      // ✅ PAYMENT SUCCEEDED
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const customerId = invoice.customer
        const priceId = priceIdFromInvoice(invoice)
        const subscriptionId = subscriptionIdFromInvoice(invoice)
        const plan = getPlanFromPriceId(priceId)

        await db.collection('parents').updateOne(
          { stripeCustomerId: customerId },
          { $set: {
            plan,
            subscribed: true,
            subscriptionStatus: 'active',
            subscriptionId,
            lastPaymentAt: new Date(),
            accessBlocked: false,
          }}
        )

        // Update all children
        const parent = await db.collection('parents')
          .findOne({ stripeCustomerId: customerId })
        if (parent?.id) {
          await db.collection('children').updateMany(
            { parentId: parent.id },
            { $set: { plan, accessBlocked: false } }
          )
        }

        // Send receipt only on first payment (not renewals)
        if (invoice.billing_reason === 'subscription_create' && parent?.email) {
          await sendEmail({
            to: parent.email,
            subject: '✅ Welcome to MyMathsHero!',
            from: 'hello',
            html: welcomeHtml({ name: parent.name, plan, foundingFamily: parent.foundingFamily }),
          }).catch(() => {})
        }
        break
      }

      // ❌ PAYMENT FAILED
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = invoice.customer
        const attemptCount = invoice.attempt_count

        await db.collection('parents').updateOne(
          { stripeCustomerId: customerId },
          { $set: {
            subscriptionStatus: 'past_due',
            lastPaymentFailedAt: new Date(),
          }}
        )

        const parent = await db.collection('parents')
          .findOne({ stripeCustomerId: customerId })

        if (parent?.email) {
          await sendEmail({
            to: parent.email,
            subject: '⚠️ Payment failed — MyMathsHero',
            from: 'hello',
            html: paymentFailedHtml({ name: parent.name, attemptCount }),
          }).catch(() => {})
        }
        break
      }

      // 🚫 SUBSCRIPTION CANCELLED
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const customerId = sub.customer

        await db.collection('parents').updateOne(
          { stripeCustomerId: customerId },
          { $set: {
            plan: 'free',
            subscribed: false,
            subscriptionStatus: 'cancelled',
            accessBlocked: true,
            cancelledAt: new Date(),
            subscriptionId: null,
          }}
        )

        const parent = await db.collection('parents')
          .findOne({ stripeCustomerId: customerId })

        if (parent?.id) {
          await db.collection('children').updateMany(
            { parentId: parent.id },
            { $set: { accessBlocked: true, plan: 'free' } }
          )

          if (parent?.email) {
            await sendEmail({
              to: parent.email,
              subject: 'Your MyMathsHero subscription has ended',
              from: 'hello',
              html: cancelledHtml({ name: parent.name }),
            }).catch(() => {})
          }
        }
        break
      }

      // 🔄 SUBSCRIPTION UPDATED
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const customerId = sub.customer
        const priceId = priceIdFromSubscription(sub)
        const plan = getPlanFromPriceId(priceId)
        const status = sub.status
        const isActive = status === 'active' || status === 'trialing'
        const periodEnd = periodEndFromSubscription(sub)

        await db.collection('parents').updateOne(
          { stripeCustomerId: customerId },
          { $set: {
            plan,
            subscriptionStatus: status,
            subscribed: isActive,
            accessBlocked: !isActive,
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
          }}
        )

        const parent = await db.collection('parents')
          .findOne({ stripeCustomerId: customerId })
        if (parent?.id) {
          await db.collection('children').updateMany(
            { parentId: parent.id },
            { $set: { plan, accessBlocked: !isActive } }
          )
        }

        // ==================
        // FOUNDING FAMILY SCHEDULE
        // When subscription is active for a founding family, create a Stripe
        // Subscription Schedule so after 12 cycles it auto-moves to $24.99/mo.
        // ==================
        if (
          status === 'active' &&
          sub.metadata?.foundingFamily === 'true' &&
          sub.metadata?.createSchedule === 'true' &&
          !sub.schedule // not already on a schedule
        ) {
          try {
            await stripe.subscriptionSchedules.create({
              from_subscription: sub.id,
              end_behavior: 'release',
              phases: [
                {
                  // Phase 1: $19.99/mo for 12 cycles
                  items: [{
                    price: STRIPE_CONFIG.prices.foundingMonthly,
                    quantity: 1,
                  }],
                  iterations: 12,
                },
                {
                  // Phase 2: $24.99/mo forever after
                  items: [{
                    price: STRIPE_CONFIG.prices.premiumMonthly,
                    quantity: 1,
                  }],
                },
              ],
            })
            console.log('✅ Subscription schedule created for', customerId)

            // Clear the createSchedule flag so we don't create again
            await stripe.subscriptions.update(sub.id, {
              metadata: {
                ...sub.metadata,
                createSchedule: 'done',
              },
            })
          } catch (schedErr) {
            console.error('Schedule creation failed:', schedErr.message)
          }
        }
        break
      }

      // ⏰ TRIAL ENDING SOON (3 days before)
      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object
        const customerId = sub.customer
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null
        const isFoundingFam = sub.metadata?.foundingFamily === 'true'

        const parent = await db.collection('parents')
          .findOne({ stripeCustomerId: customerId })

        if (parent?.email) {
          await sendEmail({
            to: parent.email,
            subject: '⏰ Your free trial ends in 3 days',
            from: 'hello',
            html: trialEndingHtml({ name: parent.name, trialEnd, isFoundingFam }),
          }).catch(() => {})
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ received: true })
}
