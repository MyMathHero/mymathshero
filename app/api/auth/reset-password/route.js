import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

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
    const { token, newPassword } = await request.json()
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and password required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const db = await connectDB()
    const parent = await db.collection('parents').findOne({
      resetToken: token,
      resetExpiry: { $gt: new Date() },
    })

    if (!parent) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await db.collection('parents').updateOne(
      { resetToken: token },
      {
        $set: { password: hashedPassword },
        $unset: { resetToken: '', resetExpiry: '' },
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('reset-password error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
