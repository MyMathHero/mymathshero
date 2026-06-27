import ForParentsContent from './Content'

export const metadata = {
  title: 'For Parents — Help Your Child Build Maths Confidence at Home | MyMathsHero',
  description:
    'MyMathsHero helps parents support children from Prep to Year 6 with personalised maths practice, step-by-step help from Hero, homework support, progress updates and learning-first rewards.',
  keywords: [
    'maths help for parents', 'homework help maths', 'build maths confidence',
    'maths practice at home', 'AI maths tutor for kids', 'parent progress reports maths',
  ],
  alternates: { canonical: '/for-parents' },
  openGraph: {
    title: 'For Parents — Help Your Child Build Maths Confidence at Home',
    description:
      'Personalised maths practice, step-by-step help from Hero, and progress updates parents can understand. Prep to Year 6.',
    url: '/for-parents',
    type: 'website',
  },
}

export default function ForParentsPage() {
  return <ForParentsContent />
}
