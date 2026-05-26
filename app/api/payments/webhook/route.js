import Stripe from 'stripe'
import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Stripe sends raw body — read via request.text() in the handler
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const rawBody = await request.text()
    const sig = request.headers.get('stripe-signature')

    let event
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    } else {
      // Dev fallback: parse without verification (never do this in production)
      event = JSON.parse(rawBody)
    }

    const db = await connectDB()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const parentId = session.metadata?.parentId

      await db.collection('payment_sessions').updateOne(
        { sessionId: session.id },
        {
          $set: {
            status: 'active',
            subscriptionId: session.subscription,
            customerId: session.customer,
            updatedAt: new Date(),
          },
        }
      )

      if (parentId) {
        await db.collection('parents').updateOne(
          { id: parentId },
          {
            $set: {
              subscribed: true,
              subscriptionId: session.subscription,
              customerId: session.customer,
              subscribedAt: new Date(),
            },
          }
        )
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const customerId = subscription.customer

      await db.collection('parents').updateOne(
        { customerId },
        { $set: { subscribed: false, updatedAt: new Date() } }
      )

      await db.collection('payment_sessions').updateOne(
        { subscriptionId: subscription.id },
        { $set: { status: 'cancelled', updatedAt: new Date() } }
      )
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
