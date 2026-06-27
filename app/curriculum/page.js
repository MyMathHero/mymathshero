import CurriculumContent from './Content'

// SEO — Server Component metadata (the content is a separate client component).
export const metadata = {
  title: 'Australian Curriculum Aligned Maths Learning (Prep–Year 6) | MyMathsHero',
  description:
    'Personalised maths support for Prep to Year 6, aligned to the Australian Curriculum: Mathematics. Help your child practise the right skills at the right level with Hero, their AI maths tutor.',
  keywords: [
    'Australian Curriculum maths', 'primary maths Prep to Year 6', 'personalised maths practice',
    'maths tutor for kids', 'curriculum aligned maths learning', 'AI maths tutor Australia',
  ],
  alternates: { canonical: '/curriculum' },
  openGraph: {
    title: 'Australian Curriculum Aligned Maths Learning (Prep–Year 6)',
    description:
      'Personalised, curriculum-aligned maths practice for Australian primary school children, with step-by-step support from Hero.',
    url: '/curriculum',
    type: 'website',
  },
}

export default function CurriculumPage() {
  return <CurriculumContent />
}
