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

export async function GET() {
  try {
    const db = await connectDB()
    const parents = await db.collection('parents')
      .find({})
      .sort({ created_at: -1 })
      .limit(200)
      .toArray()

    const enriched = await Promise.all(parents.map(async p => {
      // Children link to parents via either parentId or parent_id depending on era.
      const children = await db.collection('children')
        .find({ $or: [{ parentId: p.id }, { parent_id: p.id }] })
        .toArray()
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        plan: p.plan || 'free',
        children: children.map(c => ({ id: c.id, name: c.name })),
        createdAt: p.created_at || p.createdAt || null,
        lastLogin: p.lastLogin || p.last_login || null,
      }
    }))

    return NextResponse.json({ parents: enriched })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
