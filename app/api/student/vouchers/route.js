import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { VOUCHER_TIERS, getVoucherTier } from '@/lib/arcadeVouchers'
import { logCoinChange } from '@/lib/coins'
import { sendEmail } from '@/lib/email'
import { getRequestToken, verifyToken } from '@/lib/auth'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Resolves the authenticated student from the request's cookie (web) or
// Authorization header (mobile). Returns null when there's no valid session
// or the role isn't 'student' — admin/parent must not be able to redeem on a
// child's behalf via this endpoint.
async function getAuthedStudent(request) {
  const token = getRequestToken(request)
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'student' || !payload.userId) return null
  return payload
}

// GET — current student's XP, pending vouchers, available tiers.
export async function GET(request) {
  try {
    const session = await getAuthedStudent(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: session.userId })

    const vouchers = await db.collection('vouchers')
      .find({ studentId: session.userId, status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    return NextResponse.json({
      coins: student?.coins || 0,   // spending currency used to redeem vouchers
      xp: student?.xp || 0,         // leaderboard only; kept for display
      vouchers,
      tiers: VOUCHER_TIERS,
    })
  } catch (error) {
    console.error('[vouchers GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — redeem coins for a voucher.
//
// IMPORTANT: studentId is taken from the verified session, NOT the request
// body, so a client can't drain another kid's coins by guessing IDs.
//
// The coin deduction is atomic via findOneAndUpdate({ coins: { $gte: cost } }).
// If two redemption requests race or a client double-submits, exactly one
// will succeed — the loser sees the same "not enough coins" response a
// genuine low-balance request would.
export async function POST(request) {
  try {
    const session = await getAuthedStudent(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const studentId = session.userId

    const { tierId } = await request.json().catch(() => ({}))
    const tier = getVoucherTier(tierId)
    if (!tier) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const db = await connectDB()

    // Atomic deduct: only succeeds if the student currently has enough coins.
    const updated = await db.collection('children').findOneAndUpdate(
      { id: studentId, coins: { $gte: tier.coinsCost } },
      { $inc: { coins: -tier.coinsCost } },
      { returnDocument: 'after' }
    )

    const student = updated.value || updated // driver compatibility

    if (!student) {
      // Either student doesn't exist OR they don't have enough coins. Tell them
      // which by re-reading without the gate.
      const current = await db.collection('children').findOne({ id: studentId })
      if (!current) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      return NextResponse.json({
        error: `You need ${tier.coinsCost} coins 🪙. You have ${current.coins || 0}.`,
        needMore: tier.coinsCost - (current.coins || 0),
      }, { status: 400 })
    }
    await logCoinChange(db, studentId, { coins: -tier.coinsCost, reason: 'voucher-redeem', meta: { tierId }, after: student })

    const voucherCode = generateVoucherCode(tier.id)
    const voucher = {
      studentId,
      tierId,
      tierName: tier.name,
      tierValue: tier.value,
      emoji: tier.emoji,
      code: voucherCode,
      status: 'pending', // pending → sent → redeemed
      coinsSpent: tier.coinsCost,
      createdAt: new Date(),
    }

    let inserted
    try {
      inserted = await db.collection('vouchers').insertOne(voucher)
    } catch (insertErr) {
      // Insert failed after we already deducted coins — refund or the kid
      // silently loses coins. Best-effort refund.
      const refunded = await db.collection('children').findOneAndUpdate(
        { id: studentId },
        { $inc: { coins: tier.coinsCost } },
        { returnDocument: 'after' }
      ).catch(() => null)
      await logCoinChange(db, studentId, { coins: tier.coinsCost, reason: 'voucher-refund', meta: { tierId }, after: refunded?.value || refunded })
      throw insertErr
    }

    // Admin notification — best-effort, never block the response.
    sendEmail({
      to: 'hello@mymathshero.com.au',
      subject: `🎟️ New Voucher Redemption — ${tier.name}`,
      from: 'admin',
      html: `
        <h2>New Voucher Redemption</h2>
        <p><strong>Student:</strong> ${escapeHtml(student.name || studentId)} (ID: ${escapeHtml(studentId)})</p>
        <p><strong>Tier:</strong> ${escapeHtml(tier.name)} (${escapeHtml(tier.value)})</p>
        <p><strong>Reference code:</strong> ${escapeHtml(voucherCode)}</p>
        <p><strong>Coins spent:</strong> ${tier.coinsCost}</p>
        <p>Mark this voucher fulfilled from the admin Vouchers panel once the partner code is sent to the parent.</p>
      `,
    }).catch(err => console.error('[vouchers] admin email failed:', err?.message))

    // Parent confirmation — best-effort.
    const parentId = student.parentId ?? student.parent_id
    if (parentId) {
      const parent = await db.collection('parents').findOne({ id: parentId })
      if (parent?.email) {
        sendEmail({
          to: parent.email,
          subject: `🎉 ${student.name} earned a ${tier.name}!`,
          from: 'hello',
          html: parentConfirmationHtml(student, tier, voucherCode),
        }).catch(err => console.error('[vouchers] parent email failed:', err?.message))
      }
    }

    return NextResponse.json({
      success: true,
      voucher: { ...voucher, _id: inserted.insertedId },
      newCoins: student.coins,
      message: `${tier.name} redeemed! Check your parent's email.`,
    })
  } catch (error) {
    console.error('[vouchers POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateVoucherCode(tierId) {
  const prefix = String(tierId).toUpperCase().slice(0, 2)
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4)
  return `MMH-${prefix}-${random}-${timestamp}`
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parentConfirmationHtml(student, tier, voucherCode) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:#1B2B4B;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0">MyMaths<span style="color:#C49A1A">Hero</span></h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E2E8F0">
        <h2 style="color:#1B2B4B">🎉 ${escapeHtml(student.name)} earned a voucher!</h2>
        <p>Great news! ${escapeHtml(student.name)} redeemed <strong>${tier.coinsCost} coins</strong> for a <strong>${escapeHtml(tier.name)}</strong>!</p>
        <div style="background:#FFFBEB;border:2px solid #C49A1A;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
          <p style="font-size:48px;margin:0">${tier.emoji}</p>
          <h3 style="color:#1B2B4B;margin:8px 0">${escapeHtml(tier.name)}</h3>
          <p style="color:#C49A1A;font-weight:800;font-size:20px;margin:0">${escapeHtml(tier.value)} Hero Arcade Credits</p>
          <p style="color:#64748B;font-size:12px;margin-top:8px">Reference: ${escapeHtml(voucherCode)}</p>
        </div>
        <p style="color:#64748B">We'll email the redemption code to this address within 24 hours. Thank you for using MyMathsHero!</p>
      </div>
    </div>
  `
}
