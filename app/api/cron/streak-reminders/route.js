import { NextResponse } from 'next/server'

// Hit by Vercel Cron — see crons[] in vercel.json. Schedule is `0 7 * * *`
// (daily 07:00 UTC). That maps to 17:00 AEST winter / 18:00 AEDT summer.
//
// IMPORTANT: /api/admin/send-streak-reminders is gated by `x-admin-key`. This
// cron route reads ADMIN_API_KEY from env and forwards it as the header.
// Without that env var set, the upstream call will 401 — visible in cron logs.

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ADMIN_API_KEY) {
    console.error('[cron streak-reminders] ADMIN_API_KEY missing — call will 401')
    return NextResponse.json(
      { success: false, error: 'ADMIN_API_KEY not configured' },
      { status: 500 }
    )
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://mymathshero.com.au'

  try {
    const res = await fetch(`${baseUrl}/api/admin/send-streak-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': process.env.ADMIN_API_KEY,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[cron streak-reminders] upstream returned', res.status, data)
      return NextResponse.json(
        { success: false, status: res.status, ...data },
        { status: 502 }
      )
    }
    console.log('[cron streak-reminders] ok:', data?.message)
    return NextResponse.json({ success: true, ...data })
  } catch (err) {
    console.error('[cron streak-reminders] network error:', err?.message)
    return NextResponse.json(
      { success: false, error: err?.message || 'network error' },
      { status: 502 }
    )
  }
}
