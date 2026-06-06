import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { MongoClient } from 'mongodb'

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

const baseUrl =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000'

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    }

    const { parentId } = await request.json()
    if (!parentId) {
      return NextResponse.json({ error: 'parentId is required' }, { status: 400 })
    }

    const db = await connectDB()
    const parent = await db.collection('parents').findOne({ id: parentId })

    const customerId = parent?.stripeCustomerId || parent?.customerId
    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe customer on file' }, { status: 404 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/parent-dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
