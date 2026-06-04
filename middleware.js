import { NextResponse } from 'next/server'

// Set COMING_SOON_MODE=true in the environment to flip the gate. We deliberately
// read from env (not Mongo) so the middleware can run at the edge with zero DB
// calls and zero fail-open risk. Flipping the gate is a redeploy, not a runtime
// toggle — change the env var on Vercel and redeploy.
const COMING_SOON = process.env.COMING_SOON_MODE === 'true'

// HTML routes that bypass the gate even when coming-soon is on. /login keeps
// the team able to sign into student/parent dashboards. /coming-soon itself
// must be exempt or we'd infinite-redirect. Admin now lives at a separate
// domain (the standalone admin app) so /admin is no longer listed here.
const ALWAYS_ALLOWED_PAGES = [
  '/coming-soon',
  '/login',
]

export function middleware(request) {
  if (!COMING_SOON) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Bypass the team-access pages.
  if (ALWAYS_ALLOWED_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Redirect every other HTML route to /coming-soon. Note the matcher below
  // already excludes /api/*, /_next/*, /assets/*, so mobile API traffic and
  // static assets never reach this code.
  const url = request.nextUrl.clone()
  url.pathname = '/coming-soon'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  // Match all paths EXCEPT:
  //   - /api/*       (mobile app + waitlist signup must keep working)
  //   - /_next/*     (build assets)
  //   - /assets/*    (static images)
  //   - /games/*     (self-hosted arcade games — must load in the app WebView
  //                   and arcade iframe even while coming-soon mode is on)
  //   - favicon/sw/manifest
  matcher: [
    '/((?!api|_next/static|_next/image|assets|games|favicon.ico|sw.js|manifest.json|robots.txt).*)',
  ],
}
