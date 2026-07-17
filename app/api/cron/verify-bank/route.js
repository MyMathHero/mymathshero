import { NextResponse } from 'next/server'

// Hit by Vercel Cron — see crons[] in vercel.json. Schedule is `0 3 1,15 * *`
// (03:00 UTC on the 1st and 15th — fortnightly). Safety net for the question
// bank: new questions are ALREADY dedup-guarded + verified at creation, so this
// only mops up stragglers — e.g. a question saved while the verifier API was
// down (`unverified`), or anything that slipped through unscanned.
//
// It runs a few CHEAP scan batches (Haiku screens, Opus arbitrates disagreements)
// and stops. It deliberately does NOT auto-fix: a wrong question is withheld from
// students the moment it's flagged (the serving filter drops verifierFlagged),
// so the urgent part is automatic, and a human decides on corrections in the
// admin Verify Bank panel.
//
// /api/admin/verify-bank is gated by `x-admin-key`. This cron reads
// ADMIN_API_KEY from env and forwards it (same pattern as skill-decay).

// A few batches per run keeps the cost trivial and stays inside the function
// budget. A clean bank finishes in one batch (scanned: 0).
const MAX_BATCHES = 5

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ADMIN_API_KEY) {
    console.error('[cron verify-bank] ADMIN_API_KEY missing — call will 401')
    return NextResponse.json(
      { success: false, error: 'ADMIN_API_KEY not configured' },
      { status: 500 }
    )
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://mymathshero.com.au'

  const totals = { batches: 0, scanned: 0, ok: 0, flagged: 0, errors: 0 }

  try {
    for (let i = 0; i < MAX_BATCHES; i++) {
      const res = await fetch(`${baseUrl}/api/admin/verify-bank`, {
        method: 'POST',
        headers: {
          'x-admin-key': process.env.ADMIN_API_KEY,
          'Content-Type': 'application/json',
        },
        // grade omitted = all grades; cheap mode keeps the run inexpensive.
        body: JSON.stringify({ mode: 'scan', limit: 60, cheap: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error('[cron verify-bank] upstream returned', res.status, data)
        return NextResponse.json(
          { success: false, error: data?.error || `Upstream ${res.status}`, totals },
          { status: 502 }
        )
      }

      totals.batches++
      totals.scanned += data.scanned || 0
      totals.ok += data.ok || 0
      totals.flagged += data.suspect || 0
      totals.errors += data.errors || 0

      // Nothing left to scan → the bank is clean; stop early.
      if (!data.scanned || (data.remainingUnscanned ?? 0) <= 0) break
    }

    // Email the admin ONLY when this run flagged something. Flagged questions are
    // already withheld from students, so this is a "come approve the fixes" nudge,
    // not an outage alert. Never let a mail failure fail the cron.
    let emailed = false
    if (totals.flagged > 0) {
      try {
        const statsRes = await fetch(`${baseUrl}/api/admin/verify-bank`, {
          headers: { 'x-admin-key': process.env.ADMIN_API_KEY },
        })
        const byGrade = statsRes.ok ? ((await statsRes.json())?.flaggedByGrade || {}) : {}
        const { sendQuestionBankAlert } = await import('@/lib/emails/sender')
        const r = await sendQuestionBankAlert({
          flagged: totals.flagged,
          scanned: totals.scanned,
          byGrade,
          adminUrl: process.env.ADMIN_PANEL_URL || 'https://admin.mymathshero.com.au/questions',
        })
        emailed = !!r?.success
      } catch (e) {
        console.error('[cron verify-bank] alert email failed:', e?.message)
      }
    }

    console.log('[cron verify-bank] ok:', JSON.stringify({ ...totals, emailed }))
    return NextResponse.json({ success: true, ...totals, emailed })
  } catch (err) {
    console.error('[cron verify-bank] network error:', err?.message)
    return NextResponse.json(
      { success: false, error: err?.message || 'Network error', totals },
      { status: 502 }
    )
  }
}
