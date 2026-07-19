// Next.js generates /sitemap.xml from this.
//
// WAITLIST PHASE: COMING_SOON_MODE gates the site so every route redirects to
// /coming-soon. Submitting the full marketing sitemap now would list pages that
// all 3xx-redirect to a single page → Google crawl errors. So during the
// waitlist we list ONLY the live, indexable landing page.
//
// FULL LAUNCH: when COMING_SOON_MODE is turned off, restore the full route list
// (home + how-it-works + curriculum/<year> + for-parents + meet-hero + about +
// faq + for-schools + legal). The commented block below is that full list.
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au'

export default function sitemap() {
  const now = new Date()

  // ── Waitlist phase: only /coming-soon is public + indexable. ──
  const routes = [
    { path: '/coming-soon', priority: 1.0, changeFrequency: 'weekly' },
  ]

  // ── Full-launch route list (uncomment + drop the waitlist list above when
  //    COMING_SOON_MODE is turned off):
  //
  //  import { YEAR_ORDER } from '@/lib/yearContent'   // move to top of file
  //  const routes = [
  //    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  //    { path: '/how-it-works', priority: 0.9, changeFrequency: 'monthly' },
  //    { path: '/curriculum', priority: 0.9, changeFrequency: 'monthly' },
  //    ...YEAR_ORDER.map(y => ({ path: `/curriculum/${y}`, priority: 0.8, changeFrequency: 'monthly' })),
  //    { path: '/for-parents', priority: 0.9, changeFrequency: 'monthly' },
  //    { path: '/meet-hero', priority: 0.9, changeFrequency: 'monthly' },
  //    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
  //    { path: '/faq', priority: 0.8, changeFrequency: 'monthly' },
  //    { path: '/for-schools', priority: 0.7, changeFrequency: 'monthly' },
  //    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  //    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  //  ]

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
