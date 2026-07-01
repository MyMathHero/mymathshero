// Next.js generates /sitemap.xml from this. Only public, indexable marketing
// pages are listed — app/auth/onboarding routes are intentionally excluded.
import { YEAR_ORDER } from '@/lib/yearContent'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au'

export default function sitemap() {
  const now = new Date()
  const routes = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/how-it-works', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/curriculum', priority: 0.9, changeFrequency: 'monthly' },
    // Per-year curriculum pages (Prep–Year 6).
    ...YEAR_ORDER.map(y => ({ path: `/curriculum/${y}`, priority: 0.8, changeFrequency: 'monthly' })),
    { path: '/for-parents', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/meet-hero', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/for-schools', priority: 0.7, changeFrequency: 'monthly' },
  ]
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
