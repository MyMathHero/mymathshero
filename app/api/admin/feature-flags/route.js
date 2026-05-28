import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function GET() {
  try {
    const db = await connectDB()
    const doc = await db.collection('feature_flags').findOne({ _id: 'main' })
    // Merge stored values over defaults so newly-added flags always have a value.
    const { _id, updatedAt, ...stored } = doc || {}
    return NextResponse.json({ ...FEATURE_FLAGS, ...stored })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    // Only persist known flag keys, coerced to boolean.
    const update = {}
    for (const key of Object.keys(FEATURE_FLAGS)) {
      if (key in body) update[key] = body[key] === true
    }
    const db = await connectDB()
    await db.collection('feature_flags').updateOne(
      { _id: 'main' },
      { $set: { ...update, updatedAt: new Date() } },
      { upsert: true }
    )
    const doc = await db.collection('feature_flags').findOne({ _id: 'main' })
    const { _id, updatedAt, ...stored } = doc || {}
    return NextResponse.json({ success: true, flags: { ...FEATURE_FLAGS, ...stored } })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
