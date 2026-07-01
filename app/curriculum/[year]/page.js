import { notFound } from 'next/navigation'
import YearPageContent from '@/components/YearPageContent'
import { YEAR_CONTENT, YEAR_ORDER } from '@/lib/yearContent'

// One dynamic route generates all 7 year pages (Prep, Year 1–6) from the shared
// content. Pre-rendered at build time via generateStaticParams; each gets its own
// SEO metadata.
export function generateStaticParams() {
  return YEAR_ORDER.map(year => ({ year }))
}

export function generateMetadata({ params }) {
  const y = YEAR_CONTENT[params.year]
  if (!y) return {}
  return {
    title: y.title,
    description: y.description,
    alternates: { canonical: `/curriculum/${y.slug}` },
    openGraph: {
      title: y.title,
      description: y.description,
      url: `/curriculum/${y.slug}`,
      type: 'website',
    },
  }
}

export default function YearPage({ params }) {
  const year = YEAR_CONTENT[params.year]
  if (!year) notFound()
  return <YearPageContent year={year} />
}
