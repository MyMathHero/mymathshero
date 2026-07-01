'use client'

import Link from 'next/link'
import Footer from '@/components/Footer'
import { BookOpen, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { STATE_CURRICULUM, MATHS_STRANDS } from '@/lib/stateCurriculum'

// One reusable template for every year page (Prep, Year 1–6). Pass the year's
// content; the layout, strands, state links and CTA are shared. Matches the
// existing marketing style + dark theme.
export default function YearPageContent({ year }) {
  const { label, heading, tagline, paragraphs, skills } = year
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-6">
            <BookOpen size={16} style={{ color: 'var(--accent-gold)' }} />
            Australian Curriculum Aligned
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            {label} <span style={{ color: 'var(--accent-gold)' }}>Maths</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8">{tagline}</p>
          <a href="/#waitlist" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all duration-200" style={{ background: 'var(--accent-gold)', color: '#1B2B4B' }}>
            Join the Early Access Waitlist
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Strands */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C] border-b border-gray-100 dark:border-white/10">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3">
          {MATHS_STRANDS.map(s => (
            <span key={s} className="px-4 py-1.5 rounded-full bg-skyblue dark:bg-[#C49A1A]/15 text-electric dark:text-[#D9B23A] text-sm font-semibold">{s}</span>
          ))}
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy dark:text-slate-100 mb-6">{heading}</h2>
          <div className="space-y-5">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg">{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Key skills */}
      {skills?.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy dark:text-slate-100 mb-8 text-center">{label} skills your child will practise</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {skills.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-[#F0F4F8] dark:bg-[#141414] border border-gray-100 dark:border-white/10">
                  <CheckCircle2 size={20} className="text-success flex-shrink-0" />
                  <span className="text-navy dark:text-slate-100 font-medium text-sm">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* State curriculum links */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy dark:text-slate-100 mb-3">Aligned to your state&apos;s curriculum</h2>
          <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
            MyMathsHero can identify your child&apos;s Australian state or territory and align practice to the relevant curriculum. Explore the official curriculum for your state:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATE_CURRICULUM.map(s => (
              <a key={s.code} href={s.url} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center justify-center py-4 rounded-xl font-bold text-white transition-all duration-200 hover:opacity-90"
                style={{ background: 'var(--bg-header)' }}
                title={`${s.name} maths curriculum (${s.authority})`}>
                <span className="text-sm">{s.code}</span>
                <span className="text-[10px] font-medium text-white/60 mt-0.5">{s.authority}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 gradient-hero">
        <div className="max-w-2xl mx-auto text-center">
          <Sparkles size={32} className="mx-auto mb-6" style={{ color: 'var(--accent-gold)' }} />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Give your child a strong start in {label} maths</h2>
          <p className="text-white/70 text-lg mb-8">Personalised, Australian Curriculum aligned practice with Hero, your child&apos;s AI maths tutor.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/#waitlist" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all duration-200" style={{ background: 'var(--accent-gold)', color: '#1B2B4B' }}>
              Join the Early Access Waitlist
              <ArrowRight size={18} />
            </a>
            <Link href="/curriculum" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white border-2 border-white/30 hover:border-white/60 transition-all duration-200">
              All year levels
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
