import ThankYouContent from './Content'

export const metadata = {
  title: "You're on the list! | MyMathsHero",
  description: 'Thanks for joining the MyMathsHero founding-family waitlist. Watch your inbox for early-access updates ahead of our September 2026 launch.',
  alternates: { canonical: '/thankyou' },
  // Keep this out of search — it's a post-signup confirmation, not landing content.
  robots: { index: false, follow: false },
}

export default function ThankYouPage() {
  return <ThankYouContent />
}
