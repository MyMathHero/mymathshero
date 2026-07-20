import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { makeInviteToken, joinUrl, FOUNDING_OFFER } from '@/lib/foundingInvite'
import { foundingInviteEmail } from '@/lib/emails/templates'

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

function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) return { ok: false, status: 500, error: 'Server misconfigured' }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

// ── GET — waitlist list + funnel counts (invited / signed up / converted) ──────
export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = await connectDB()
    const docs = await db.collection('waitlist')
      .find({}, { projection: { _id: 0, password: 0 } })
      .sort({ position: 1 })
      .toArray()

    const summary = {
      total: docs.length,
      invited: docs.filter(d => d.invitedAt).length,
      signedUp: docs.filter(d => d.signedUpAt).length,
      converted: docs.filter(d => d.convertedAt).length,
    }

    // Shape each row for the admin table (status derived from timestamps).
    const rows = docs.map(d => ({
      email: d.email,
      name: d.name || null,
      childGrade: d.childGrade ?? null,
      position: d.position ?? null,
      createdAt: d.createdAt || null,
      invitedAt: d.invitedAt || null,
      signedUpAt: d.signedUpAt || null,
      convertedAt: d.convertedAt || null,
      status: d.convertedAt ? 'converted'
        : d.signedUpAt ? 'signed-up'
        : d.invitedAt ? 'invited'
        : 'waiting',
    }))

    return NextResponse.json({ summary, rows })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ── POST — send founding invites ───────────────────────────────────────────────
// Body: { limit?: number, resend?: boolean, emails?: string[] }
//   - default: invite everyone NOT yet invited (skips already-invited)
//   - limit:   cap how many to invite this run (e.g. first 1000)
//   - resend:  also re-send to people already invited
//   - emails:  restrict to specific addresses (for testing / a single re-send)
export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json().catch(() => ({}))
    const { limit, resend = false, emails } = body

    const db = await connectDB()

    const query = {}
    if (Array.isArray(emails) && emails.length) {
      query.email = { $in: emails.map(e => String(e).trim().toLowerCase()) }
    } else if (!resend) {
      query.invitedAt = { $exists: false } // only people not yet invited
    }

    let candidates = await db.collection('waitlist')
      .find(query)
      .sort({ position: 1 })
      .toArray()

    if (typeof limit === 'number' && limit > 0) {
      candidates = candidates.slice(0, limit)
    }

    let sent = 0, failed = 0
    for (const w of candidates) {
      // Reuse an existing token on re-send; mint one otherwise.
      const token = w.inviteToken || makeInviteToken()
      const url = joinUrl(token)
      const res = await sendEmail({
        to: w.email,
        from: 'hello',
        subject: '🎁 You’re invited — your MyMathsHero founding spot is ready',
        html: foundingInviteEmail({ name: w.firstName || w.name, joinUrl: url, offer: FOUNDING_OFFER }),
      })
      if (res?.success) {
        sent++
        await db.collection('waitlist').updateOne(
          { email: w.email },
          { $set: { inviteToken: token, invitedAt: new Date() } }
        )
      } else {
        failed++
      }
      // Gentle pace so we stay well under Resend's rate limits on big batches.
      await new Promise(r => setTimeout(r, 120))
    }

    return NextResponse.json({
      success: true,
      candidates: candidates.length,
      sent,
      failed,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
