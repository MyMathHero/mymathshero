// Metadata for /coming-soon. The page itself is a client component (it can't
// export metadata), and in prod EVERYONE sees this page while COMING_SOON_MODE
// is on — so its social preview is the most-shared card of the whole site.
// A route-level layout can be a server component even when its page is client,
// which is how we attach OG/Twitter tags here.
export const metadata = {
  title: 'MyMathsHero — Coming September 2026 | AI Maths Tutor for Prep–Year 6',
  description:
    "Your child's own AI maths tutor is coming. Personalised, Australian Curriculum-aligned maths for Prep to Year 6. Join the waitlist for early access.",
  alternates: { canonical: '/coming-soon' },
  openGraph: {
    type: 'website',
    siteName: 'MyMathsHero',
    locale: 'en_AU',
    url: '/coming-soon',
    title: 'MyMathsHero — Your child’s own AI maths tutor. Coming September 2026.',
    description:
      'Personalised, curriculum-aligned maths for Prep to Year 6. Join the waitlist for early access.',
    images: [
      {
        url: '/assets/og/coming-soon.png',
        width: 1200,
        height: 630,
        alt: 'MyMathsHero — AI maths tutor coming September 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyMathsHero — Your child’s own AI maths tutor. Coming September 2026.',
    description: 'Personalised, curriculum-aligned maths for Prep to Year 6. Join the waitlist.',
    images: ['/assets/og/coming-soon.png'],
  },
}

export default function ComingSoonLayout({ children }) {
  return children
}
