import FaqContent from './Content'
import { FAQS } from './faqData'

export const metadata = {
  title: 'Frequently Asked Questions | MyMathsHero',
  description:
    'Answers to common questions about MyMathsHero and Hero, our AI maths tutor — year levels, Australian Curriculum alignment, safety, pricing, the Founding Family offer and more.',
  keywords: [
    'MyMathsHero FAQ', 'AI maths tutor questions', 'maths app for kids',
    'Australian Curriculum maths', 'is MyMathsHero safe', 'Founding Family offer',
  ],
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'Frequently Asked Questions | MyMathsHero',
    description:
      'Everything you need to know about MyMathsHero, Hero and our personalised AI maths learning platform for Prep to Year 6.',
    url: '/faq',
    type: 'website',
  },
}

// FAQPage structured data — lets Google show this page as a rich result with
// expandable questions. Built from the SAME source as the on-page content.
function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <FaqContent />
    </>
  )
}
