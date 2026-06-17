import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Gate: same x-admin-key pattern as the other admin endpoints.
function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/skill-decay] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

// Spaced-repetition decay parameters.
const STALE_DAYS = 30   // mastered skills untouched this long start to decay
const DECAY_POINTS = 5  // SmartScore lost per decay run
const MASTERY_THRESHOLD = 80

// POST — decay stale mastered skills. Idempotent and bounded: each run lowers a
// stale mastered skill by DECAY_POINTS and, if it drops below the mastery
// threshold, flips mastered:false so the recommender resurfaces it. A skill
// practised within STALE_DAYS is untouched (its updatedAt is recent).
export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = await connectDB()
    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)

    const stale = await db.collection('skill_scores')
      .find({ mastered: true, updatedAt: { $lt: cutoff } })
      .toArray()

    let decayed = 0
    let demoted = 0
    for (const s of stale) {
      const newScore = Math.max(0, (s.score ?? MASTERY_THRESHOLD) - DECAY_POINTS)
      const stillMastered = newScore >= MASTERY_THRESHOLD
      if (!stillMastered) demoted++
      await db.collection('skill_scores').updateOne(
        { _id: s._id },
        {
          $set: {
            score: parseFloat(newScore.toFixed(1)),
            mastered: stillMastered,
            // Stamp a separate field so decay itself doesn't reset the
            // "last practised" clock — only real practice updates updatedAt
            // via the answer route. This lets a skill keep decaying nightly
            // until it's practised again.
            lastDecayedAt: new Date(),
          },
        }
      )
      decayed++
    }

    return NextResponse.json({
      success: true,
      message: `Decayed ${decayed} stale skill(s), ${demoted} dropped below mastery.`,
      decayed,
      demoted,
      staleThresholdDays: STALE_DAYS,
    })
  } catch (error) {
    console.error('[admin/skill-decay] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
