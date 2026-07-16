// Next.js generates /robots.txt from this. Allow the public marketing site;
// keep the app, auth, API and account flows out of search results.
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/student-dashboard',
        '/parent-dashboard',
        '/teacher-dashboard',
        '/onboarding',
        '/login',
        '/diagnostic',
        '/subscribe',
        '/manage-subscription',
        '/payment-success',
        '/reset-password',
        '/forgot-password',
        '/vouchers',
        '/avatar-customisation',
        '/arcade',
        '/junior',
        '/coming-soon',
        '/thankyou',
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
