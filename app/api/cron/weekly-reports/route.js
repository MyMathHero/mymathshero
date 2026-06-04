import { NextResponse } from 'next/server'

// Hit by Vercel Cron — see crons[] in vercel.json. Schedule is `0 22 * * 0`
// (Sundays at 22:00 UTC). That maps to 08:00 AEST in Australian winter and
// 09:00 AEDT in summer — Sydney observes DST, but cron is on UTC, so the
// landing time shifts ±1h across the year. Acceptable for parent reports.

export async function GET(request) {
  // Vercel Cron sends the configured secret in the Authorization header.
  // Refuse anyone else so this can't be hit publicly.
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://mymathshero.com.au'

  try {
    const res = await fetch(`${baseUrl}/api/admin/send-all-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal': '1',
        // Forward the admin key in case send-all-reports is ever gated.
        // Today the route is open, so this header is just future-proofing.
        ...(process.env.ADMIN_API_KEY ? { 'x-admin-key': process.env.ADMIN_API_KEY } : {}),
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[cron weekly-reports] upstream returned', res.status, data)
      return NextResponse.json(
        { success: false, status: res.status, ...data },
        { status: 502 }
      )
    }
    console.log('[cron weekly-reports] ok:', data?.message)
    return NextResponse.json({ success: true, ...data })
  } catch (err) {
    console.error('[cron weekly-reports] network error:', err?.message)
    return NextResponse.json(
      { success: false, error: err?.message || 'network error' },
      { status: 502 }
    )
  }
}
