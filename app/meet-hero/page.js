import MeetHeroContent from './Content'

export const metadata = {
  title: 'Meet Hero — Your Child’s AI Maths Tutor (Prep–Year 6) | MyMathsHero',
  description:
    'Hero is a friendly AI maths tutor for children from Prep to Year 6. Step-by-step support, personalised practice, and encouragement that helps children understand maths and build real confidence.',
  keywords: [
    'AI maths tutor', 'maths tutor for kids', 'Ask Hero', 'step-by-step maths help',
    'personalised maths tutor Australia', 'primary maths help Prep to Year 6',
  ],
  alternates: { canonical: '/meet-hero' },
  openGraph: {
    title: 'Meet Hero — Your Child’s AI Maths Tutor',
    description:
      'A friendly AI maths tutor for Prep to Year 6. Step-by-step help, personalised practice, and confidence-building support.',
    url: '/meet-hero',
    type: 'website',
  },
}

export default function MeetHeroPage() {
  return <MeetHeroContent />
}
