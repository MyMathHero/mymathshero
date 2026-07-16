import AboutContent from './Content'

export const metadata = {
  title: 'About MyMathsHero | AI Maths Tutor for Australian Primary School Children',
  description:
    'Learn about MyMathsHero and meet Hero, the friendly AI maths tutor helping Australian primary school children build confidence through personalised, curriculum-aligned maths learning.',
  keywords: [
    'about MyMathsHero', 'AI maths tutor Australia', 'personalised maths learning',
    'maths confidence for kids', 'Prep to Year 6 maths', 'meet Hero',
  ],
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About MyMathsHero — Helping Every Child Build Confidence in Maths',
    description:
      'Our mission is to help children develop confidence, enjoy learning and reach their full potential through personalised AI-powered maths education.',
    url: '/about',
    type: 'website',
  },
}

export default function AboutPage() {
  return <AboutContent />
}
