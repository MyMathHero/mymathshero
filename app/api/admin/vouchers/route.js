import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Gate: this endpoint exposes voucher codes, student names, and lets the
// caller send "your code is ready" emails. Public access would be a fraud +
// child-safety failure. Always require x-admin-key.
function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/vouchers] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const db = await connectDB()
    const query = status && status !== 'all' ? { status } : {}

    const vouchers = await db.collection('vouchers')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    // Enrich with student names. Use a single batched lookup rather than N
    // round-trips when the page is large.
    const studentIds = [...new Set(vouchers.map(v => v.studentId).filter(Boolean))]
    const students = studentIds.length > 0
      ? await db.collection('children')
          .find({ id: { $in: studentIds } }, { projection: { id: 1, name: 1, _id: 0 } })
          .toArray()
      : []
    const nameById = Object.fromEntries(students.map(s => [s.id, s.name]))

    const enriched = vouchers.map(v => ({
      ...v,
      studentName: nameById[v.studentId] || 'Unknown',
    }))

    return NextResponse.json({ vouchers: enriched })
  } catch (error) {
    console.error('[admin/vouchers GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { voucherId, action, partnerCode } = await request.json()

    if (action !== 'fulfil') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (!voucherId || !ObjectId.isValid(voucherId)) {
      return NextResponse.json({ error: 'Invalid voucherId' }, { status: 400 })
    }
    if (!partnerCode || typeof partnerCode !== 'string' || partnerCode.trim().length < 4) {
      return NextResponse.json({ error: 'partnerCode required (min 4 chars)' }, { status: 400 })
    }
    const cleanCode = partnerCode.trim().slice(0, 64)

    const db = await connectDB()
    const voucher = await db.collection('vouchers').findOne({ _id: new ObjectId(voucherId) })
    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
    }
    if (voucher.status !== 'pending') {
      return NextResponse.json(
        { error: `Voucher already ${voucher.status}; cannot re-fulfil` },
        { status: 409 }
      )
    }

    await db.collection('vouchers').updateOne(
      { _id: new ObjectId(voucherId) },
      { $set: {
        status: 'sent',
        partnerCode: cleanCode,
        fulfilledAt: new Date(),
      } }
    )

    // Email the parent the redemption code.
    const student = await db.collection('children').findOne({ id: voucher.studentId })
    const parentId = student?.parentId ?? student?.parent_id ?? null
    const parent = parentId ? await db.collection('parents').findOne({ id: parentId }) : null

    if (parent?.email) {
      await sendEmail({
        to: parent.email,
        subject: '🎟️ Your Hero Voucher Code is Here!',
        from: 'hello',
        html: parentFulfilmentHtml(student, voucher, cleanCode),
      }).catch(err => console.error('[admin/vouchers] parent email failed:', err?.message))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/vouchers POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parentFulfilmentHtml(student, voucher, code) {
  const childName = student?.name || 'your child'
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1B2B4B;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0">MyMaths<span style="color:#C49A1A">Hero</span></h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E2E8F0">
        <h2 style="color:#1B2B4B">🎟️ Your Hero Arcade Voucher</h2>
        <p>Here's the ${escapeHtml(voucher.tierName)} voucher code for ${escapeHtml(childName)}:</p>
        <div style="background:#1B2B4B;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
          <p style="color:rgba(255,255,255,0.6);margin:0 0 8px;font-size:14px">Voucher Code</p>
          <p style="color:#C49A1A;font-size:32px;font-weight:900;font-family:monospace;margin:0;letter-spacing:3px">${escapeHtml(code)}</p>
          <p style="color:rgba(255,255,255,0.5);margin:8px 0 0;font-size:12px">Value: ${escapeHtml(voucher.tierValue)}</p>
        </div>
        <p style="color:#64748B;font-size:14px">Redeem this code at the participating arcade venue to claim ${escapeHtml(voucher.tierValue)} in credits. Terms and expiry apply.</p>
        <p style="color:#64748B;font-size:14px">Thank you for being part of MyMathsHero — ${escapeHtml(childName)} earned this through fantastic Maths work. 🌟</p>
      </div>
    </div>
  `
}
