'use client'

import Footer from '@/components/Footer'
import {
  Sparkles, Heart, BookOpen, TrendingUp, Gift, Shield, ArrowRight,
  Target, Rocket, Users, CheckCircle2, MessageSquare,
} from 'lucide-react'

const learningFeatures = [
  { icon: BookOpen, label: 'Personalised daily learning tasks' },
  { icon: MessageSquare, label: 'Step-by-step maths support' },
  { icon: Target, label: 'Adaptive difficulty' },
  { icon: Heart, label: 'Confidence-building encouragement' },
  { icon: TrendingUp, label: 'Parent progress tracking' },
  { icon: Gift, label: 'Reward-based motivation through safe games' },
]

export default function AboutContent() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8">
              <Sparkles size={16} style={{ color: 'var(--accent-gold)' }} />
              About MyMathsHero
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Helping every child build <span style={{ color: 'var(--accent-gold)' }}>confidence</span> in maths
            </h1>
            <p className="text-lg sm:text-xl text-white/70 mb-8">
              Not every child learns the same way, or at the same pace. That's why we created Hero — a friendly AI maths tutor designed to personalise learning, build confidence and make maths easier to understand.
            </p>
            <a href="/#waitlist" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all duration-200" style={{ background: 'var(--accent-gold)', color: '#1B2B4B' }}>
              Become a Founding Family
              <ArrowRight size={18} />
            </a>
          </div>
          <div className="flex justify-center">
            <div className="rounded-3xl bg-white p-5 shadow-2xl border-4" style={{ borderColor: 'rgba(196,154,26,0.4)' }}>
              <img src="/assets/robot/HeroEnjoying.png" alt="Hero, the MyMathsHero AI maths tutor" className="w-56 sm:w-64 h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue dark:bg-[#C49A1A]/15 text-electric dark:text-[#D9B23A] text-sm font-semibold mb-4">Our Mission</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">Every child deserves to succeed in maths</h2>
          <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg">
            Our mission is simple: to help children develop confidence, enjoy learning and reach their full potential through personalised AI-powered education. Whether your child needs extra support, wants to strengthen key skills, or is ready for greater challenges, Hero is there to guide them every step of the way.
          </p>
        </div>
      </section>

      {/* Meet Hero */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="flex justify-center order-2 md:order-1">
            <img src="/assets/robot/heroprofilepic.png" alt="Hero the AI maths tutor" className="w-48 h-48 rounded-3xl object-cover shadow-xl border-4 border-white dark:border-white/10" />
          </div>
          <div className="order-1 md:order-2">
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue dark:bg-[#C49A1A]/15 text-electric dark:text-[#D9B23A] text-sm font-semibold mb-4">Meet Hero</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">More than just an AI tutor</h2>
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed mb-4">
              Hero is your child's personalised learning partner. By understanding each child's strengths, areas for improvement and learning progress, Hero creates personalised daily maths tasks designed to match individual learning needs.
            </p>
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
              Instead of simply marking answers as right or wrong, Hero provides step-by-step guidance, encouragement and helpful explanations that build understanding rather than memorisation.
            </p>
          </div>
        </div>
      </section>

      {/* Learning designed around every child */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">Learning designed around every child</h2>
            <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto text-lg">Hero continually analyses learning progress to keep children engaged while developing strong mathematical understanding.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {learningFeatures.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#F0F4F8] dark:bg-[#141414] border border-gray-100 dark:border-white/10">
                <div className="w-12 h-12 rounded-xl bg-electric/10 dark:bg-[#C49A1A]/15 flex items-center justify-center mb-4">
                  <f.icon size={24} className="text-electric dark:text-[#D9B23A]" />
                </div>
                <p className="text-navy dark:text-slate-100 font-semibold">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supporting families + built with parents */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-white/10 shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-electric/10 dark:bg-[#C49A1A]/15 flex items-center justify-center mb-6">
              <Users size={28} className="text-electric dark:text-[#D9B23A]" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-slate-100 mb-2">Supporting Australian families</h3>
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-sm">
              MyMathsHero has been designed specifically for Australian primary school students from Prep to Year 6. Our learning content aligns with the Australian Curriculum, helping children practise the same concepts they learn at school while building confidence at home.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-white/10 shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-electric/10 dark:bg-[#C49A1A]/15 flex items-center justify-center mb-6">
              <TrendingUp size={28} className="text-electric dark:text-[#D9B23A]" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-slate-100 mb-2">Built with parents in mind</h3>
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-sm">
              Parents receive easy-to-understand progress reports showing learning achievements, completed Hero Tasks, strengths, areas needing improvement and confidence growth — making it easy to stay involved in their child's learning journey.
            </p>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-3xl mx-auto text-center">
          <Rocket size={32} className="mx-auto mb-6 text-electric dark:text-[#D9B23A]" />
          <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-slate-100 mb-4">More than maths</h2>
          <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg mb-4">
            We believe technology should make learning more personal, not more complicated. By combining artificial intelligence with engaging learning experiences and curriculum-aligned content, we're creating a future where every child can learn with confidence, curiosity and independence.
          </p>
          <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg">
            MyMathsHero is only the beginning. Our long-term vision is to expand into subjects such as English through <span className="font-semibold text-navy dark:text-slate-100">MyEnglishHero</span> — while keeping Hero at the centre of every child's learning journey.
          </p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {['Australian Curriculum aligned', 'Prep to Year 6', 'Safe for children', 'Learning-first rewards'].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-navy dark:text-slate-200">
              <CheckCircle2 size={18} className="text-success flex-shrink-0" />
              <span className="text-sm font-semibold">{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <Shield size={32} className="mx-auto mb-6" style={{ color: 'var(--accent-gold)' }} />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Join the MyMathsHero community</h2>
          <p className="text-white/70 text-lg mb-8">
            We're excited to welcome families as we prepare for launch. Become one of our Founding Families and discover how Hero can support your child's learning journey through personalised AI-powered maths learning.
          </p>
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
