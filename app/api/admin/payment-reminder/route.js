import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Gate: sends emails to parents. Require x-admin-key.
function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/payment-reminder] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

function reminderHtml(name) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1B2B4B;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0">MyMaths<span style="color:#C49A1A">Hero</span></h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E2E8F0">
        <h2 style="color:#EF4444">⚠️ Action needed: payment overdue</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your MyMathsHero payment is overdue. To keep your child's access, please update your payment method.</p>
        <a href="https://mymathshero.com.au/manage-subscription"
          style="display:block;background:#EF4444;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:800;margin-top:20px">
          Update Payment Method →
        </a>
      </div>
    </div>
  `
}

// Body: { parentId?: string }  — if omitted, emails ALL past_due parents.
export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { parentId } = await request.json().catch(() => ({}))
    const db = await connectDB()

    const query = parentId
      ? { id: parentId }
      : { subscriptionStatus: 'past_due' }

    const targets = await db.collection('parents')
      .find(query, { projection: { id: 1, name: 1, email: 1 } })
      .toArray()

    let sent = 0
    for (const p of targets) {
      if (!p.email) continue
      const res = await sendEmail({
        to: p.email,
        from: 'hello',
        subject: '⚠️ Payment overdue — MyMathsHero',
        html: reminderHtml(p.name),
      }).catch(() => ({ success: false }))
      if (res?.success !== false) sent++
    }

    return NextResponse.json({ targeted: targets.length, sent })
  } catch (error) {
    console.error('[admin/payment-reminder] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
