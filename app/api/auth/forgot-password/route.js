import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { sendPasswordReset } from '@/lib/email'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const db = await connectDB()
    const normalizedEmail = email.toLowerCase().trim()
    const parent = await db.collection('parents').findOne({ email: normalizedEmail })

    // Always return success so we don't reveal whether an account exists.
    if (!parent) {
      return NextResponse.json({ success: true })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.collection('parents').updateOne(
      { email: normalizedEmail },
      { $set: { resetToken, resetExpiry } }
    )

    const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`

    // Fire-and-forget so the response time doesn't reveal sender latency.
    sendPasswordReset({
      userEmail: parent.email,
      userName: parent.name || 'there',
      resetUrl,
      expiresIn: '1 hour',
    }).catch(err => console.error('Reset email failed:', err.message))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('forgot-password error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
