import { NextResponse } from 'next/server'

// Set COMING_SOON_MODE=true in the environment to flip the gate. We deliberately
// read from env (not Mongo) so the middleware can run at the edge with zero DB
// calls and zero fail-open risk. Flipping the gate is a redeploy, not an admin
// toggle — see /admin "Coming Soon Mode" panel for the exact commands.
const COMING_SOON = process.env.COMING_SOON_MODE === 'true'

// HTML routes that bypass the gate even when coming-soon is on. /login and
// /admin are intentionally exempt so the team can still get in. /coming-soon
// itself must be exempt or we'd infinite-redirect.
const ALWAYS_ALLOWED_PAGES = [
  '/coming-soon',
  '/login',
  '/admin',
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
  //   - favicon/sw/manifest
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|manifest.json|robots.txt).*)',
  ],
}
