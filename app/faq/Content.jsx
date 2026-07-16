'use client'

import { useState } from 'react'
import Footer from '@/components/Footer'
import { FAQS } from './faqData'
import { HelpCircle, ChevronDown, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
      >
        <span className="text-base sm:text-lg font-bold text-navy dark:text-slate-100">{item.q}</span>
        <ChevronDown
          size={22}
          className={`flex-shrink-0 text-electric dark:text-[#D9B23A] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 -mt-1 animate-fade-in">
          <p className="text-gray-600 dark:text-slate-300 leading-relaxed">{item.a}</p>
          {item.bullets && (
            <ul className="mt-4 grid sm:grid-cols-2 gap-2.5">
              {item.bullets.map((b, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-navy dark:text-slate-200">
                  <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default function FaqContent() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8">
            <HelpCircle size={16} style={{ color: 'var(--accent-gold)' }} />
            Frequently Asked Questions
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Everything you need to know about <span style={{ color: 'var(--accent-gold)' }}>MyMathsHero</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
            Choosing the right learning platform for your child is an important decision. We've answered the most common questions parents ask about MyMathsHero, Hero, and our personalised AI maths learning platform.
          </p>
        </div>
      </section>

      {/* FAQ list */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((item, i) => (
            <FaqItem
              key={i}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </section>

      {/* Still have a question */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles size={32} className="mx-auto mb-6" style={{ color: 'var(--accent-gold)' }} />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Still have a question?</h2>
          <p className="text-white/70 text-lg mb-8">
            Our team is here to help. If you have any questions about MyMathsHero, Hero or our personalised maths learning platform, we'd love to hear from you. Join the waitlist to stay updated on our September 2026 launch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/#waitlist" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all duration-200" style={{ background: 'var(--accent-gold)', color: '#1B2B4B' }}>
              Join the Early Access Waitlist
              <ArrowRight size={18} />
            </a>
            <a href="mailto:hello@mymathshero.com.au" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold border border-white/25 text-white hover:bg-white/10 transition-all duration-200">
              Contact us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
