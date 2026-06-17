import { NextResponse } from 'next/server'

// Hit by Vercel Cron — see crons[] in vercel.json. Schedule is `0 2 * * *`
// (nightly 02:00 UTC). Spaced-repetition decay: mastered skills not practised in
// 30+ days lose a little SmartScore so they resurface in recommendations.
//
// /api/admin/skill-decay is gated by `x-admin-key`. This cron reads
// ADMIN_API_KEY from env and forwards it (same pattern as streak-reminders).

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ADMIN_API_KEY) {
    console.error('[cron skill-decay] ADMIN_API_KEY missing — call will 401')
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
    const res = await fetch(`${baseUrl}/api/admin/skill-decay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': process.env.ADMIN_API_KEY,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[cron skill-decay] upstream returned', res.status, data)
      return NextResponse.json(
        { success: false, status: res.status, ...data },
        { status: 502 }
      )
    }
    console.log('[cron skill-decay] ok:', data?.message)
    return NextResponse.json({ success: true, ...data })
  } catch (err) {
    console.error('[cron skill-decay] network error:', err?.message)
    return NextResponse.json(
      { success: false, error: err?.message || 'network error' },
      { status: 502 }
    )
  }
}
