import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export const dynamic = 'force-dynamic'

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
    const count = await db.collection('parents')
      .countDocuments({ foundingFamily: true })
    return NextResponse.json({
      count,
      spotsLeft: Math.max(0, 1000 - count),
      isFull: count >= 1000,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}
