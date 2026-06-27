'use client'

import Footer from '@/components/Footer'
import { Heart, Shield, BookOpen, TrendingUp, Gift, Home, CheckCircle2, ArrowRight, MessageSquare, Sparkles } from 'lucide-react'

const reasons = [
  'Personalised maths practice', 'Homework support', 'Confidence building',
  'Step-by-step explanations from Hero', 'Australian curriculum-aligned learning',
  'Parent progress updates', 'Motivation through rewards', 'Independent learning habits',
]

const trust = [
  'Age-appropriate maths learning', 'A child-friendly learning experience',
  'Supportive explanations', 'Parent visibility', 'Learning-first rewards',
  'Safe and structured use of AI support',
]

const progress = [
  'What your child has been practising', 'Where they are improving',
  'Which areas may need more support', 'How consistently they are using the platform',
  'How their confidence and learning habits are developing',
]

export default function ForParentsContent() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8">
            <Heart size={16} style={{ color: 'var(--accent-gold)' }} />
            For Parents
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Helping your child build <span style={{ color: 'var(--accent-gold)' }}>maths confidence</span> at home
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8">
            Personalised maths learning, step-by-step help, and confidence-building practice for children from Prep to Year 6 — without adding more stress.
          </p>
          <a href="/#waitlist" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all duration-200" style={{ background: 'var(--accent-gold)', color: '#1B2B4B' }}>
            Join the Early Access Waitlist
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Why parents choose */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">Why parents choose MyMathsHero</h2>
            <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto text-lg">Built for busy families who want extra maths support at home — a simple, supportive way to make maths part of the routine.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-[#F0F4F8] dark:bg-[#141414] border border-gray-100 dark:border-white/10">
                <CheckCircle2 size={20} className="text-success flex-shrink-0" />
                <span className="text-navy dark:text-slate-100 font-medium text-sm">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature trio */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: 'A safer, more supportive way to practise', desc: 'A calm, encouraging environment where children can practise without feeling embarrassed or rushed. Hero supports learning — it doesn\'t replace parents, teachers or tutors.' },
            { icon: BookOpen, title: 'Homework support without the stress', desc: 'Maths methods may have changed since you were at school. When your child is unsure, Hero gives step-by-step help — so they\'re not left stuck and you don\'t have to explain every question.' },
            { icon: MessageSquare, title: 'Help the moment they get stuck', desc: 'Instead of marking an answer right or wrong, Hero helps children think through the problem — turning "I can\'t do this" into "I can try this step by step."' },
          ].map((f, i) => (
            <div key={i} className="p-8 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-white/10 shadow-lg">
              <div className="w-14 h-14 rounded-xl bg-electric/10 dark:bg-[#C49A1A]/15 flex items-center justify-center mb-6">
                <f.icon size={28} className="text-electric dark:text-[#D9B23A]" />
              </div>
              <h3 className="text-xl font-bold text-navy dark:text-slate-100 mb-2">{f.title}</h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & safety */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue dark:bg-[#C49A1A]/15 text-electric dark:text-[#D9B23A] text-sm font-semibold mb-4">Trust &amp; Safety</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">Designed with families in mind</h2>
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed">The experience is focused on learning, progress and child-friendly support. Hero helps children understand maths — not distract them from it — and parents stay part of the journey through clear progress updates.</p>
          </div>
          <ul className="space-y-3">
            {trust.map((t, i) => (
              <li key={i} className="flex items-center gap-3 text-navy dark:text-slate-200">
                <Shield size={18} className="text-electric dark:text-[#D9B23A] flex-shrink-0" />
                <span className="text-sm font-medium">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Progress + rewards */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          <div className="p-8 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-white/10 shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-electric/10 dark:bg-[#C49A1A]/15 flex items-center justify-center mb-6">
              <TrendingUp size={28} className="text-electric dark:text-[#D9B23A]" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-slate-100 mb-4">Progress reports for parents</h3>
            <ul className="space-y-2.5">
              {progress.map((p, i) => (
                <li key={i} className="flex items-center gap-2.5 text-gray-600 dark:text-slate-300 text-sm">
                  <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-white/10 shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-electric/10 dark:bg-[#C49A1A]/15 flex items-center justify-center mb-6">
              <Gift size={28} className="text-electric dark:text-[#D9B23A]" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-slate-100 mb-4">Motivation through learning-first rewards</h3>
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-sm">Children earn coins as they complete maths activities and make progress. The reward system encourages effort, consistency and positive learning habits — always keeping learning first.</p>
          </div>
        </div>
      </section>

      {/* Routine / school + home */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-3xl mx-auto text-center">
          <Home size={32} className="mx-auto mb-6 text-electric dark:text-[#D9B23A]" />
          <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">A better maths routine at home</h2>
          <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg">Even short, regular practice sessions help children build confidence over time. MyMathsHero can support school learning, homework, tutoring or extra practice at home — giving children consistent support, not more pressure.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles size={32} className="mx-auto mb-6" style={{ color: 'var(--accent-gold)' }} />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Give your child a maths partner they can turn to</h2>
          <p className="text-white/70 text-lg mb-8">With personalised learning, step-by-step support, parent progress reports and learning-first rewards, MyMathsHero makes maths more positive for children and easier for parents to support.</p>
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
