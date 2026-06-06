import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Gate: exposes subscriber counts and revenue. Always require x-admin-key.
function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/subscription-stats] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

// Approximate monthly value per plan (AUD), used for a rough MRR figure.
const MONTHLY_VALUE = { premium: 24.99, standard: 14.99, free: 0 }

export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = await connectDB()
    const parents = db.collection('parents')

    const [
      totalParents,
      activeSubs,
      pastDue,
      cancelled,
      premiumCount,
      standardCount,
      foundingCount,
      trialing,
    ] = await Promise.all([
      parents.countDocuments({}),
      parents.countDocuments({ subscriptionStatus: { $in: ['active', 'trialing'] } }),
      parents.countDocuments({ subscriptionStatus: 'past_due' }),
      parents.countDocuments({ subscriptionStatus: 'cancelled' }),
      parents.countDocuments({ plan: 'premium' }),
      parents.countDocuments({ plan: 'standard' }),
      parents.countDocuments({ foundingFamily: true }),
      parents.countDocuments({ subscriptionStatus: 'trialing' }),
    ])

    // Rough MRR: premium + standard active subscribers at full monthly value.
    const estimatedMrr =
      premiumCount * MONTHLY_VALUE.premium +
      standardCount * MONTHLY_VALUE.standard

    return NextResponse.json({
      totalParents,
      activeSubs,
      trialing,
      pastDue,
      cancelled,
      byPlan: { premium: premiumCount, standard: standardCount },
      foundingFamilies: foundingCount,
      foundingSpotsLeft: Math.max(0, 1000 - foundingCount),
      estimatedMrr: Math.round(estimatedMrr * 100) / 100,
    })
  } catch (error) {
    console.error('[admin/subscription-stats] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
