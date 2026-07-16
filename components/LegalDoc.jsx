'use client'

import Footer from '@/components/Footer'
import { ArrowRight } from 'lucide-react'

// Shared layout for long legal documents (Privacy Policy, Terms & Conditions).
// Matches the marketing design system: gradient hero + a clean, readable
// document body with numbered sections. Content is data-driven so the two pages
// stay visually identical.
//
// `sections` is an array of blocks:
//   { heading, subheading?, blocks: [ ...content ] }
// where each content item is one of:
//   { p: 'paragraph text' }
//   { list: ['item', 'item'] }
//   { note: 'callout text' }   → highlighted aside
//   { subheading: 'text' }     → bold sub-title inside a section
//   { contact: [ ['Label','value'] ] }

function Block({ item }) {
  if (item.p) return <p className="text-gray-600 dark:text-slate-300 leading-relaxed mb-4">{item.p}</p>
  if (item.subheading) return <h3 className="text-lg font-bold text-navy dark:text-slate-100 mt-6 mb-3">{item.subheading}</h3>
  if (item.list) {
    return (
      <ul className="mb-4 space-y-2">
        {item.list.map((li, i) => (
          <li key={i} className="flex gap-3 text-gray-600 dark:text-slate-300 leading-relaxed">
            <span className="mt-2.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-gold)' }} />
            <span>{li}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (item.note) {
    return (
      <div className="mb-4 rounded-xl border-l-4 px-5 py-4 bg-skyblue/50 dark:bg-[#C49A1A]/10" style={{ borderColor: 'var(--accent-gold)' }}>
        <p className="text-navy dark:text-slate-200 text-sm leading-relaxed m-0">{item.note}</p>
      </div>
    )
  }
  if (item.contact) {
    return (
      <div className="mb-4 rounded-2xl bg-[#F0F4F8] dark:bg-[#141414] border border-gray-100 dark:border-white/10 p-6 space-y-1.5">
        {item.contact.map(([label, value, href], i) => (
          <p key={i} className="text-sm text-navy dark:text-slate-200 m-0">
            <span className="font-bold">{label}: </span>
            {href ? (
              <a href={href} className="text-electric dark:text-[#D9B23A] hover:underline">{value}</a>
            ) : (
              <span className="text-gray-600 dark:text-slate-300">{value}</span>
            )}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function LegalDoc({ badge, title, intro, effective, updated, sections, summary }) {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {badge && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8">
              {badge}
            </div>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">{title}</h1>
          {intro && <p className="text-lg text-white/70 max-w-2xl mx-auto">{intro}</p>}
          {(effective || updated) && (
            <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/60">
              {effective && <span><span className="text-white/80 font-semibold">Effective date:</span> {effective}</span>}
              {updated && <span><span className="text-white/80 font-semibold">Last updated:</span> {updated}</span>}
            </div>
          )}
        </div>
      </section>

      {/* Document body */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-3xl mx-auto">
          {sections.map((sec, i) => (
            <div key={i} className="mb-12 scroll-mt-24">
              <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-white/10">
                {sec.number != null && (
                  <span className="text-sm font-bold text-electric dark:text-[#D9B23A] flex-shrink-0">{sec.number}.</span>
                )}
                <h2 className="text-2xl font-bold text-navy dark:text-slate-100">{sec.heading}</h2>
              </div>
              {sec.blocks.map((b, j) => <Block key={j} item={b} />)}
            </div>
          ))}

          {summary && (
            <div className="mt-16 rounded-2xl border-2 p-8" style={{ borderColor: 'rgba(196,154,26,0.35)', background: 'linear-gradient(135deg, rgba(196,154,26,0.08), rgba(196,154,26,0.02))' }}>
              <h2 className="text-2xl font-bold text-navy dark:text-slate-100 mb-2">{summary.heading}</h2>
              {summary.subheading && <p className="text-electric dark:text-[#D9B23A] font-semibold mb-4">{summary.subheading}</p>}
              {summary.blocks.map((b, j) => <Block key={j} item={b} />)}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Questions about this policy?</h2>
          <p className="text-white/70 mb-8">We're happy to help. Reach out any time.</p>
          <a href="mailto:admin@mymathshero.com.au" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all duration-200" style={{ background: 'var(--accent-gold)', color: '#1B2B4B' }}>
            Contact us
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  )
}
