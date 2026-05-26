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
    if (!parentId) return NextResponse.json({ error: 'parentId required' }, { status: 400 })

    const db = await connectDB()
    // Support both new (parentId) and legacy (parent_id) fields, restrict to private students.
    const children = await db.collection('children')
      .find({
        type: 'private',
        $or: [{ parentId }, { parent_id: parentId }],
      })
      .toArray()

    const safe = children.map(({ _id, pin, ...rest }) => rest)
    return NextResponse.json({ children: safe })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
