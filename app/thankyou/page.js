import ThankYouContent from './Content'

export const metadata = {
  title: "You're on the list! | MyMathsHero",
  description: 'Thanks for joining the MyMathsHero founding-family waitlist. Watch your inbox for early-access updates ahead of our September 2026 launch.',
  alternates: { canonical: '/thankyou' },
  // Keep this out of search — it's a post-signup confirmation, not landing
  // content — but DO give it a rich preview: parents share this excited moment.
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'MyMathsHero',
    locale: 'en_AU',
    url: '/thankyou',
    title: "Welcome to the founding family — MyMathsHero",
    description: "You're in early for MyMathsHero. Personalised AI maths for Prep to Year 6, launching September 2026.",
    images: [
      {
        url: '/assets/og/thankyou.png',
        width: 1200,
        height: 630,
        alt: "You're on the MyMathsHero founding-family waitlist",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@mymathsheroau',
    title: "Welcome to the founding family — MyMathsHero",
    description: "You're in early for MyMathsHero. Personalised AI maths for Prep to Year 6.",
    images: ['/assets/og/thankyou.png'],
  },
}

export default function ThankYouPage() {
  return <ThankYouContent />
}
