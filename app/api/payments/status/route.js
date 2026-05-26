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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    if (!parentId) {
      return NextResponse.json({ error: 'parentId is required' }, { status: 400 })
    }

    const db = await connectDB()
    const parent = await db.collection('parents').findOne({ id: parentId })

    if (!parent) {
      return NextResponse.json({ subscribed: false, status: 'not_found', trialEndsAt: null })
    }

    // Find the most recent active payment session for this parent
    const paymentSession = await db.collection('payment_sessions').findOne(
      { parentId, status: { $in: ['active', 'pending'] } },
      { sort: { createdAt: -1 } }
    )

    let trialEndsAt = null
    if (parent.subscribedAt) {
      const trialEnd = new Date(parent.subscribedAt)
      trialEnd.setDate(trialEnd.getDate() + 14)
      trialEndsAt = trialEnd.toISOString()
    }

    return NextResponse.json({
      subscribed: parent.subscribed ?? false,
      status: paymentSession?.status ?? 'none',
      trialEndsAt,
    })
  } catch (error) {
    console.error('Payment status error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
