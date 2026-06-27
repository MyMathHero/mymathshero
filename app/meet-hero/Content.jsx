'use client'

import Footer from '@/components/Footer'
import RoboVideo from '@/components/RoboVideo'
import { Sparkles, ArrowRight, CheckCircle2, Brain, Target, Heart, Gift, Users } from 'lucide-react'

const helps = [
  'Guiding children through difficult maths questions',
  'Giving step-by-step support when they feel stuck',
  'Helping children understand why an answer is correct or incorrect',
  'Encouraging regular maths practice',
  'Adapting learning based on each child\'s strengths and weaknesses',
  'Supporting Australian curriculum-aligned maths learning',
  'Helping children build confidence over time',
]

const designedTo = [
  'Support learning at your child\'s level',
  'Help explain difficult questions',
  'Encourage independent practice',
  'Reduce maths frustration',
  'Build confidence through regular progress',
]

export default function MeetHeroContent() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8">
              <Sparkles size={16} style={{ color: 'var(--accent-gold)' }} />
              Meet Hero
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Meet Hero — Your Child&apos;s <span style={{ color: 'var(--accent-gold)' }}>AI Maths Tutor</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/70 max-w-2xl mb-8">
              A friendly AI maths tutor for children from Prep to Year 6. Hero supports children step by step — helping them learn from mistakes, build confidence and keep moving forward.
            </p>
            <a href="/#waitlist" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all duration-200" style={{ background: 'var(--accent-gold)', color: '#1B2B4B' }}>
              Join the Early Access Waitlist
              <ArrowRight size={18} />
            </a>
          </div>
          <div className="hidden lg:flex justify-center items-center">
            <RoboVideo src="/assets/robot/wavingrobo.MP4" width={300} blend="auto" loop />
          </div>
        </div>
      </section>

      {/* What is Hero */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue dark:bg-[#C49A1A]/15 text-electric dark:text-[#D9B23A] text-sm font-semibold mb-4">What is Hero?</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">Your child&apos;s personalised AI maths partner</h2>
          <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg">
            Inside MyMathsHero, Hero helps children practise maths at the right level, explains tricky questions, and gives support when they need it most. If a child feels unsure, they can use <strong className="text-navy dark:text-slate-100">Ask Hero</strong> to receive helpful guidance. Hero gives children extra support between school, homework and tutoring — helping them understand maths, practise with confidence, and feel proud of their progress.
          </p>
        </div>
      </section>

      {/* How Hero helps */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">How Hero helps your child</h2>
            <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto text-lg">Every child learns differently — some need extra time, some more practice, some a clearer explanation. Hero helps by:</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {helps.map((h, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-white/10 shadow-sm">
                <CheckCircle2 size={20} className="text-success flex-shrink-0 mt-0.5" />
                <span className="text-navy dark:text-slate-100 text-sm">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature trio */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: Brain, title: 'Personalised maths learning', desc: 'MyMathsHero understands your child\'s current level, then creates practice around their needs — not random worksheets.' },
            { icon: Target, title: 'Help when your child gets stuck', desc: 'When a question feels too hard, your child can ask Hero. Guidance and step-by-step support help them keep trying.' },
            { icon: Heart, title: 'Built to build confidence', desc: 'When children understand what they\'re doing, they practise more, improve, and begin to believe in themselves.' },
          ].map((f, i) => (
            <div key={i} className="p-8 rounded-2xl bg-[#F0F4F8] dark:bg-[#141414] border border-gray-100 dark:border-white/10">
              <div className="w-14 h-14 rounded-xl bg-electric/10 dark:bg-[#C49A1A]/15 flex items-center justify-center mb-6">
                <f.icon size={28} className="text-electric dark:text-[#D9B23A]" />
              </div>
              <h3 className="text-xl font-bold text-navy dark:text-slate-100 mb-2">{f.title}</h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why an AI tutor */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue dark:bg-[#C49A1A]/15 text-electric dark:text-[#D9B23A] text-sm font-semibold mb-4">Why an AI maths tutor?</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">Support when your child needs it — not just at school</h2>
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed">With Hero, your child can receive guidance while practising at home, making maths support more accessible, consistent and personalised. Hero is designed to:</p>
          </div>
          <ul className="space-y-3">
            {designedTo.map((d, i) => (
              <li key={i} className="flex items-center gap-3 text-navy dark:text-slate-200">
                <CheckCircle2 size={18} className="text-success flex-shrink-0" />
                <span className="text-sm font-medium">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Rewards + parents strip */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-[#F0F4F8] dark:bg-[#141414] border border-gray-100 dark:border-white/10">
            <Gift size={28} className="text-electric dark:text-[#D9B23A] mb-4" />
            <h3 className="text-xl font-bold text-navy dark:text-slate-100 mb-2">Motivation through rewards</h3>
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-sm">Children earn coins and unlock rewards as they practise and progress — encouraging consistency and effort while keeping the focus on learning.</p>
          </div>
          <div className="p-8 rounded-2xl bg-[#F0F4F8] dark:bg-[#141414] border border-gray-100 dark:border-white/10">
            <Users size={28} className="text-electric dark:text-[#D9B23A] mb-4" />
            <h3 className="text-xl font-bold text-navy dark:text-slate-100 mb-2">Parent-friendly progress</h3>
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-sm">While Hero supports your child during practice, MyMathsHero helps you see where they&apos;re improving, where they need more support, and how their confidence is developing.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles size={32} className="mx-auto mb-6" style={{ color: 'var(--accent-gold)' }} />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Hero helps maths make sense</h2>
          <p className="text-white/70 text-lg mb-8">Hero is here to guide, encourage and support your child through their maths journey — one question, one step, and one win at a time.</p>
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
