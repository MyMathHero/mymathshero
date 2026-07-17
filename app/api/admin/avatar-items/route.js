import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { allParts, applyOverrides, CATEGORIES } from '@/lib/avatarParts'

// Avatar item administration.
//
// The ARTWORK is code-drawn SVG (see lib/avatarParts.js) — that's what makes
// "9 hairstyles x 10 colours" cheap. But PRICE and AVAILABILITY are data, so
// they live in a shared `avatar_config` doc (_id 'main') that admin writes and
// the student app reads — same cross-repo pattern as feature_flags/hero_config.
// That means tuning a price or retiring an item needs no deploy.
//
//   GET  → every item with its effective cost + enabled flag + how many students
//          are wearing it (usage stats).
//   POST → { overrides: { "hat_crown": { cost: 300, enabled: false } } }
//
// Admin-gated via ADMIN_API_KEY.

const CONFIG_ID = 'main'

let client
async function connectDB() {
  if (!client) { client = new MongoClient(process.env.MONGODB_URI); await client.connect() }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

function authed(request) {
  const key = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key')
  return process.env.ADMIN_API_KEY && key === process.env.ADMIN_API_KEY
}

async function readOverrides(db) {
  const doc = await db.collection('avatar_config').findOne({ _id: CONFIG_ID })
  return (doc && doc.overrides) || {}
}

export async function GET(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const db = await connectDB()
    const overrides = await readOverrides(db)

    // Usage: how many students currently wear each part. One pass over the
    // children collection, counting each category slot.
    const catIds = CATEGORIES.filter(c => c.type === 'part').map(c => c.id)
    const usage = {}
    const cursor = db.collection('children').find(
      { avatarConfig: { $exists: true } },
      { projection: { avatarConfig: 1 } }
    )
    let wearers = 0
    for await (const child of cursor) {
      wearers++
      for (const cat of catIds) {
        const id = child.avatarConfig?.[cat]
        if (!id) continue
        const key = `${cat}_${id}`
        usage[key] = (usage[key] || 0) + 1
      }
    }

    const items = allParts().map(p => {
      const key = `${p.category}_${p.id}`
      const o = overrides[key] || {}
      return {
        ...p,
        key,
        cost: typeof o.cost === 'number' ? o.cost : p.cost,
        baseCost: p.cost,
        enabled: o.enabled !== false,
        wearing: usage[key] || 0,
      }
    })

    return NextResponse.json({
      items,
      categories: CATEGORIES.filter(c => c.type === 'part').map(c => ({ id: c.id, label: c.label, emoji: c.emoji })),
      wearers,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const incoming = body.overrides
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ error: 'overrides object required' }, { status: 400 })
    }

    // Only accept keys that name a real part, and coerce the shape — admin input
    // can never inject junk into the doc the student app reads.
    const valid = new Set(allParts().map(p => `${p.category}_${p.id}`))
    const clean = {}
    for (const [key, v] of Object.entries(incoming)) {
      if (!valid.has(key) || !v || typeof v !== 'object') continue
      const entry = {}
      if (typeof v.cost === 'number' && v.cost >= 0 && v.cost <= 100000) entry.cost = Math.round(v.cost)
      if (typeof v.enabled === 'boolean') entry.enabled = v.enabled
      if (Object.keys(entry).length) clean[key] = entry
    }

    const db = await connectDB()
    await db.collection('avatar_config').updateOne(
      { _id: CONFIG_ID },
      { $set: { overrides: clean, updatedAt: new Date() } },
      { upsert: true }
    )
    return NextResponse.json({ success: true, overrides: clean, count: Object.keys(clean).length })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
