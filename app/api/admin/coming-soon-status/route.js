import { NextResponse } from 'next/server'

// Read-only — exposes whether the middleware's coming-soon gate is currently
// active. The actual switch is the COMING_SOON_MODE env var (a redeploy), not a
// runtime toggle, so this endpoint is informational for the admin UI.
export async function GET() {
  return NextResponse.json({
    enabled: process.env.COMING_SOON_MODE === 'true',
    source: 'env:COMING_SOON_MODE',
  })
}
