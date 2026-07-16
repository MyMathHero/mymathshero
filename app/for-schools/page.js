import ForSchoolsContent from './Content'

export const metadata = {
  title: 'For Schools & Educators — Curriculum-Aligned Maths Support | MyMathsHero',
  description:
    'MyMathsHero supports teachers and schools with personalised, Australian Curriculum-aligned maths practice, Hero AI tutoring and student progress insights for Prep to Year 6.',
  keywords: [
    'maths software for schools', 'classroom maths practice', 'Australian Curriculum maths',
    'teacher maths tool', 'student progress tracking maths',
  ],
  alternates: { canonical: '/for-schools' },
  openGraph: {
    title: 'MyMathsHero for Schools & Educators',
    description:
      'Curriculum-aligned, personalised maths practice and progress insights to support classroom learning.',
    url: '/for-schools',
    type: 'website',
  },
}

export default function ForSchoolsPage() {
  return <ForSchoolsContent />
}
