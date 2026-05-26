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

export async function POST(request) {
  try {
    const { parentId, childName, email } = await request.json()

    if (!parentId || !email) {
      return NextResponse.json({ error: 'parentId and email are required' }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            recurring: { interval: 'month' },
            product_data: {
              name: 'MyMathsHero Monthly Plan',
              description: childName
                ? `Personalised learning for ${childName}`
                : 'Personalised adaptive learning',
            },
            unit_amount: 1400, // $14.00 AUD
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: { parentId },
      },
      metadata: { parentId },
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/onboarding`,
    })

    const db = await connectDB()
    await db.collection('payment_sessions').insertOne({
      parentId,
      sessionId: session.id,
      status: 'pending',
      createdAt: new Date(),
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Create checkout error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
