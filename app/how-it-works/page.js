import HowItWorksContent from './Content'

export const metadata = {
  title: 'How It Works — Diagnostic, Personalised Practice & Progress | MyMathsHero',
  description:
    'See how MyMathsHero works: a short diagnostic pinpoints your child\'s level, Hero serves personalised maths practice at the right difficulty, and parents track progress — Prep to Year 6.',
  keywords: [
    'how MyMathsHero works', 'maths diagnostic test', 'personalised maths practice',
    'adaptive maths learning', 'AI maths tutor for kids',
  ],
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    title: 'How MyMathsHero Works',
    description:
      'A diagnostic, personalised practice with Hero, and progress you can see. Curriculum-aligned maths for Prep to Year 6.',
    url: '/how-it-works',
    type: 'website',
  },
}

export default function HowItWorksPage() {
  return <HowItWorksContent />
}
