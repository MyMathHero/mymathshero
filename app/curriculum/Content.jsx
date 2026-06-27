'use client'

import Link from 'next/link'
import Footer from '@/components/Footer'
import { BookOpen, CheckCircle2, ArrowRight, Sparkles, Target, TrendingUp, Users } from 'lucide-react'

const learningAreas = [
  'Number and place value', 'Addition and subtraction', 'Multiplication and division',
  'Fractions and decimals', 'Money and financial maths', 'Measurement',
  'Shapes and space', 'Patterns and algebra', 'Data and statistics',
  'Probability', 'Problem solving',
]

const yearLevels = [
  { level: 'Prep', title: 'Prep Maths', desc: 'Children begin building early number confidence — recognising numbers, counting, comparing quantities, understanding patterns and exploring basic shapes. Maths feels simple, visual and encouraging.' },
  { level: 'Year 1', title: 'Year 1 Maths', desc: 'Students continue developing number skills, early addition and subtraction, patterns, measurement and shape recognition — practised in a supportive way that builds confidence from the beginning.' },
  { level: 'Year 2', title: 'Year 2 Maths', desc: 'More structured problem solving, number patterns, place value, simple multiplication ideas, measurement and basic data skills — strengthened with regular, personalised practice.' },
  { level: 'Year 3', title: 'Year 3 Maths', desc: 'Children begin working with larger numbers, multiplication and division, fractions, measurement, time, shapes and simple data — with targeted practice and step-by-step support from Hero.' },
  { level: 'Year 4', title: 'Year 4 Maths', desc: 'Stronger skills in multiplication, division, fractions, decimals, measurement, geometry, data and problem solving — building confidence and reducing maths frustration.' },
  { level: 'Year 5', title: 'Year 5 Maths', desc: 'Larger numbers, decimals, fractions, percentages, area, angles, data and multi-step problem solving — supported with personalised practice and guidance from Hero.' },
  { level: 'Year 6', title: 'Year 6 Maths', desc: 'An important year for preparing students for secondary school. Children revise and strengthen key concepts across number, algebra, measurement, space, statistics, probability and problem solving.' },
]

export default function CurriculumContent() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8">
                <BookOpen size={16} style={{ color: 'var(--accent-gold)' }} />
                Australian Curriculum Aligned
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Maths Learning Aligned to the <span style={{ color: 'var(--accent-gold)' }}>Australian Curriculum</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-2xl mb-8">
                Personalised maths support for Prep to Year 6 that follows the skills and concepts taught across Australian primary schools.
              </p>
              <a href="/#waitlist" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all duration-200" style={{ background: 'var(--accent-gold)', color: '#1B2B4B' }}>
                Join the Early Access Waitlist
                <ArrowRight size={18} />
              </a>
            </div>
            {/* Hero PNG — Hero robot over the map of Australia with connected kids.
                Drop the file at public/assets/marketing/hero-australia.png. Hides
                gracefully if the asset isn't present yet. */}
            <div className="flex justify-center lg:justify-end">
              <img
                src="/assets/marketing/hero-australia.png"
                alt="Hero, the AI maths tutor, connecting children across Australia"
                className="w-full max-w-sm h-auto drop-shadow-2xl"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Connected to the curriculum */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue dark:bg-[#C49A1A]/15 text-electric dark:text-[#D9B23A] text-sm font-semibold mb-4">The Australian Curriculum</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">Maths learning connected to the Australian Curriculum</h2>
          <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg">
            The Australian Curriculum: Mathematics is presented by year level from Foundation to Year 10, organised across key areas including <strong className="text-navy dark:text-slate-100">Number, Algebra, Measurement, Space, Statistics and Probability</strong>. MyMathsHero uses this structure to guide personalised maths practice — helping children practise the right skills at the right level, while giving parents a clearer view of where their child is improving.
          </p>
        </div>
      </section>

      {/* Learning areas */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">Key maths areas we support</h2>
            <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto text-lg">Designed for Australian primary school students from Prep to Year 6.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {learningAreas.map((area, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-white/10 shadow-sm">
                <CheckCircle2 size={20} className="text-success flex-shrink-0" />
                <span className="text-navy dark:text-slate-100 font-medium text-sm">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Year-by-year */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue dark:bg-[#C49A1A]/15 text-electric dark:text-[#D9B23A] text-sm font-semibold mb-4">Prep to Year 6</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">Personalised learning, year by year</h2>
            <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto text-lg">Every child learns at a different pace. MyMathsHero identifies your child&apos;s current level and provides practice suited to their needs.</p>
          </div>
          <div className="space-y-4">
            {yearLevels.map((y, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 rounded-2xl bg-[#F0F4F8] dark:bg-[#141414] border border-gray-100 dark:border-white/10">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl font-bold text-white" style={{ background: 'var(--bg-header)' }}>{y.level}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy dark:text-slate-100 mb-1">{y.title}</h3>
                  <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-sm">{y.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Target, title: 'The right skills, the right level', desc: 'Your child works on the areas that matter most — not simply moving through the same content as everyone else.' },
              { icon: TrendingUp, title: 'Steady, visible progress', desc: 'Regular personalised practice builds fluency, understanding and confidence over time.' },
              { icon: Users, title: 'Clearer for parents', desc: 'See where your child is improving and which areas may need more support.' },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-white/10 shadow-lg">
                <div className="w-14 h-14 rounded-xl bg-electric/10 dark:bg-[#C49A1A]/15 flex items-center justify-center mb-6">
                  <f.icon size={28} className="text-electric dark:text-[#D9B23A]" />
                </div>
                <h3 className="text-xl font-bold text-navy dark:text-slate-100 mb-2">{f.title}</h3>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles size={32} className="mx-auto mb-6" style={{ color: 'var(--accent-gold)' }} />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Australian Curriculum aligned maths learning made simple</h2>
          <p className="text-white/70 text-lg mb-8">With curriculum-aligned learning from Prep to Year 6, MyMathsHero helps your child practise the right skills, understand tricky questions and make steady progress.</p>
          <a href="/#waitlist" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all duration-200" style={{ background: 'var(--accent-gold)', color: '#1B2B4B' }}>
            Join the Early Access Waitlist
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  )
}
