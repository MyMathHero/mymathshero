import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { adjustCoins, getCoinHistory } from '@/lib/coins'

// Admin coin wallet + ledger. Lets the admin console see a student's current
// coins/XP and full transaction history, and grant/adjust coins (one-click
// restore) — every adjustment is itself logged to the ledger.
//
// Auth: x-admin-key header (same as other main-repo admin endpoints).

let client
async function connectDB() {
  if (!client) { client = new MongoClient(process.env.MONGODB_URI); await client.connect() }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

function authed(request) {
  const expected = process.env.ADMIN_API_KEY
  return expected && request.headers.get('x-admin-key') === expected
}

// GET /api/admin/coins?studentId=... → { coins, xp, history[] }
export async function GET(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const studentId = new URL(request.url).searchParams.get('studentId')
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

  const db = await connectDB()
  const student = await db.collection('children').findOne(
    { id: studentId }, { projection: { coins: 1, xp: 1, name: 1 } },
  )
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  const history = await getCoinHistory(db, studentId, 100)

  return NextResponse.json({
    studentId,
    name: student.name || null,
    coins: student.coins || 0,
    xp: student.xp || 0,
    history: history.map(h => ({
      coins: h.coins, xp: h.xp, reason: h.reason,
      balanceAfter: h.balanceAfter || null,
      at: h.at, meta: h.meta || null,
    })),
  })
}

// POST /api/admin/coins  body: { studentId, coins?, xp?, reason? }
// Grants (or removes, with negatives) coins/XP and logs it. Use for restores.
export async function POST(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body = {}
  try { body = await request.json() } catch { /* empty */ }
  const { studentId, coins = 0, xp = 0, reason } = body
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })
  const coinsN = Number(coins) || 0
  const xpN = Number(xp) || 0
  if (!coinsN && !xpN) return NextResponse.json({ error: 'Nothing to adjust' }, { status: 400 })

  const db = await connectDB()
  const result = await adjustCoins(db, studentId, {
    coins: coinsN, xp: xpN,
    reason: reason ? `admin:${reason}` : 'admin-grant',
    meta: { by: 'admin' },
  })
  if (!result) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  return NextResponse.json({ success: true, coins: result.coins, xp: result.xp })
}
