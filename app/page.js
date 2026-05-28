'use client'

import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import RoboVideo from '@/components/RoboVideo'
import { useFeatureFlags } from '@/lib/useFeatureFlags'
import { Brain, CheckCircle2, BarChart3, BookOpen, Calculator, ArrowRight, Star, Sparkles, ChevronRight, Flag } from 'lucide-react'

const trustBadges = [
  { label: 'Personalised Learning' },
  { label: 'Curriculum-aligned' },
  { label: 'Step-by-step help' },
]

const stats = [
  { value: '120+', label: 'Maths Skills' },
  { value: 'Prep–6', label: 'Year Levels' },
  { value: 'AI', label: 'Tutor — Ask Hero' },
  { value: '24/7', label: 'Help Available' },
]

const features = [
  {
    icon: Brain,
    title: 'Adapts to Every Child',
    description: 'Hero learns how your child solves problems — their speed, common slip-ups, and strengths — to personalise every question and skill path.',
  },
  {
    icon: Flag,
    title: 'Australian Curriculum Aligned',
    description: 'Every skill, question, and learning path is mapped to the Australian Curriculum v9.0, from Prep to Year 6.',
  },
  {
    icon: BarChart3,
    title: 'Real Insights for Parents',
    description: 'A live dashboard shows exactly where your child stands — skill heatmaps, weekly activity, and Hero Reports delivered straight to your inbox.',
  },
]

const steps = [
  { num: '01', title: 'Take a Diagnostic Test', description: 'A short adaptive quiz pinpoints exactly where your child stands across maths skills for their year level.' },
  { num: '02', title: 'Practice With Hero', description: 'Hero serves the perfect difficulty level — challenging enough to grow, gentle enough to stay motivated.' },
  { num: '03', title: 'Watch Confidence Grow', description: 'Track Hero Points rising, unlock Hero Badges, and see mastery build week after week.' },
]

const subjects = [
  { name: 'Number & Algebra', color: 'bg-[#1B2B4B]', icon: Calculator, grades: 'Prep–6', skills: ['Place Value', 'Addition & Subtraction', 'Multiplication & Division', 'Fractions & Decimals', 'Patterns'], count: '60+ skills', emoji: '🔢', tagline: 'From counting to algebra' },
  { name: 'Measurement & Geometry', color: 'bg-[#1B2B4B]', icon: BookOpen, grades: 'Prep–6', skills: ['Length & Area', 'Volume & Capacity', 'Time', 'Shape & Symmetry', 'Location'], count: '40+ skills', emoji: '📐', tagline: 'Shapes, space and measuring' },
  { name: 'Statistics & Probability', color: 'bg-[#1B2B4B]', icon: BarChart3, grades: 'Prep–6', skills: ['Data Collection', 'Graphs & Charts', 'Chance', 'Mean, Median, Mode'], count: '20+ skills', emoji: '📊', tagline: 'Thinking with data' },
]

const testimonials = [
  { name: 'Sarah', role: 'Parent of Year 3 student', quote: 'My daughter used to dread maths homework. Now she asks to practice on MyMathsHero every evening. Her confidence has completely transformed.', stars: 5 },
  { name: 'David', role: 'Parent of Year 4 student', quote: 'The weekly Hero Report is a game-changer. I can see at a glance which skills my son has mastered and where he needs a little extra help.', stars: 5 },
  { name: 'Emma, Age 9', role: 'Student', quote: 'I love getting Hero Badges when I master a skill! And when I get stuck I just press Ask Hero and it shows me the steps.', stars: 5 },
]

export default function LandingPage() {
  const { flags } = useFeatureFlags()
  const [formData, setFormData] = useState({ name: '', email: '', role: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [visibleSections, setVisibleSections] = useState({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setSubmitted(true)
        setFormData({ name: '', email: '', role: '' })
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8]">

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[#F0F4F8]">
        {/* Subtle maths equations background decoration */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <span className="absolute text-[#1B2B4B] opacity-5 text-6xl font-bold" style={{ top: '12%', left: '6%' }}>2x+3=7</span>
          <span className="absolute text-[#1B2B4B] opacity-5 text-7xl font-bold" style={{ top: '20%', right: '8%' }}>a²+b²=c²</span>
          <span className="absolute text-[#1B2B4B] opacity-5 text-8xl font-bold" style={{ top: '55%', left: '4%' }}>π</span>
          <span className="absolute text-[#1B2B4B] opacity-5 text-8xl font-bold" style={{ bottom: '15%', right: '12%' }}>∑</span>
          <span className="absolute text-[#1B2B4B] opacity-5 text-5xl font-bold" style={{ top: '70%', left: '40%' }}>½ + ¼</span>
          <span className="absolute text-[#1B2B4B] opacity-5 text-6xl font-bold" style={{ top: '40%', left: '55%' }}>√25 = 5</span>
          <span className="absolute text-[#1B2B4B] opacity-5 text-7xl font-bold" style={{ bottom: '25%', left: '25%' }}>12 × 8</span>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E2E8F0] text-[#1B2B4B] text-sm mb-6 shadow-sm">
                <Sparkles size={16} className="text-[#C49A1A]" />
                Personalised AI Maths Learning — Prep to Year 6
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1B2B4B] leading-tight mb-6">
                Meet Hero —{' '}
                <span className="text-[#C49A1A]">Your Child&apos;s AI Maths Tutor</span>
              </h1>

              <p className="text-lg sm:text-xl text-[#64748B] mb-8 leading-relaxed max-w-2xl">
                Personalised maths support that adapts to your child, builds confidence, and helps them learn step by step.
              </p>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-2 mb-8">
                {trustBadges.map((badge, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E2E8F0] text-[#1B2B4B] text-sm font-medium shadow-sm"
                  >
                    <CheckCircle2 size={14} className="text-[#C49A1A]" />
                    {badge.label}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <a
                  href="#waitlist"
                  className="inline-flex items-center justify-center gap-2 bg-[#1B2B4B] text-white border-2 border-[#C49A1A] hover:bg-[#0f1d3a] px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 shadow-lg hover:translate-y-[-2px]"
                >
                  Ask Hero ✦
                  <ArrowRight size={18} />
                </a>
                <a
                  href="#waitlist"
                  className="inline-flex items-center justify-center gap-2 text-[#C49A1A] hover:text-[#1B2B4B] px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200"
                >
                  Join the waitlist
                </a>
              </div>
            </div>

            {/* Hero waving video */}
            <div className="hidden lg:flex justify-center items-center">
              <RoboVideo
                src="/assets/robot/wavingrobo.MP4"
                width={300}
                loop={true}
                className="mx-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="relative -mt-8 z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-6 sm:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-[#1B2B4B]">{stat.value}</div>
                <div className="text-sm text-[#64748B] mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" data-animate className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#C49A1A]/10 text-[#C49A1A] text-sm font-semibold mb-4">Why MyMathsHero?</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2B4B] mb-4">Built for How Children Actually Learn Maths</h2>
            <p className="text-[#64748B] max-w-2xl mx-auto text-lg">Every child is different. Hero adapts in real-time to give every student exactly what they need.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-8 border border-[#E2E8F0] hover:border-[#C49A1A]/40 transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px] ${visibleSections['features'] ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="w-14 h-14 rounded-xl bg-[#C49A1A]/10 flex items-center justify-center mb-6">
                  <f.icon size={28} className="text-[#C49A1A]" />
                </div>
                <h3 className="text-xl font-bold text-[#1B2B4B] mb-3">{f.title}</h3>
                <p className="text-[#64748B] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" data-animate className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#C49A1A]/10 text-[#C49A1A] text-sm font-semibold mb-4">Simple Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2B4B] mb-4">How It Works</h2>
            <p className="text-[#64748B] max-w-2xl mx-auto text-lg">Three simple steps to personalised maths learning</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-2xl border border-[#E2E8F0] hover:border-[#C49A1A]/40 transition-all duration-300 hover:shadow-lg group ${visibleSections['how-it-works'] ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div className="text-6xl font-bold text-[#C49A1A]/10 group-hover:text-[#C49A1A]/20 transition-colors absolute top-4 right-6">{s.num}</div>
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#1B2B4B] text-white flex items-center justify-center text-lg font-bold mb-6">{i + 1}</div>
                  <h3 className="text-xl font-bold text-[#1B2B4B] mb-3">{s.title}</h3>
                  <p className="text-[#64748B] leading-relaxed">{s.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-5 transform -translate-y-1/2 z-10">
                    <ChevronRight size={24} className="text-[#C49A1A]/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SUBJECTS ===== */}
      <section id="subjects" data-animate className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#C49A1A]/10 text-[#C49A1A] text-sm font-semibold mb-4">Curriculum</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2B4B] mb-4">Maths, Covered End to End</h2>
            <p className="text-[#64748B] max-w-2xl mx-auto text-lg">Aligned to the Australian Curriculum v9.0</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {subjects.map((sub, i) => (
              <div
                key={i}
                className={`rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-[-4px] ${visibleSections['subjects'] ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className={`${sub.color} p-6 text-white border-b-4 border-[#C49A1A]`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <sub.icon size={28} className="opacity-80 mb-2" />
                      <h3 className="text-xl font-bold">{sub.name}</h3>
                      <p className="text-white/60 text-sm mt-1">{sub.tagline}</p>
                    </div>
                    <span className="text-5xl opacity-30">{sub.emoji}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-white/80 text-sm">
                    <span>Years {sub.grades}</span>
                    <span className="w-1 h-1 rounded-full bg-white/40" />
                    <span>{sub.count}</span>
                  </div>
                </div>
                <div className="bg-white p-6">
                  <h4 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-3">Key Skills</h4>
                  <ul className="space-y-2.5">
                    {sub.skills.map((skill, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-[#1B2B4B] text-sm">
                        <CheckCircle2 size={16} className="text-[#C49A1A] flex-shrink-0" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section data-animate id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#C49A1A]/10 text-[#C49A1A] text-sm font-semibold mb-4">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1B2B4B] mb-4">Loved by Students &amp; Parents</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={`bg-[#F0F4F8] rounded-2xl p-8 border border-[#E2E8F0] hover:border-[#C49A1A]/40 transition-all duration-300 hover:shadow-lg ${visibleSections['testimonials'] ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={18} className="fill-[#C49A1A] text-[#C49A1A]" />
                  ))}
                </div>
                <p className="text-[#1B2B4B] leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C49A1A]/10 flex items-center justify-center text-[#C49A1A] font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-[#1B2B4B] text-sm">{t.name}</div>
                    <div className="text-[#64748B] text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WAITLIST SIGNUP ===== */}
      <section id="waitlist" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#1B2B4B]">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles size={32} className="text-[#C49A1A] mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Be First to Meet Hero
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Join our waitlist and get early access when MyMathsHero launches. Limited spots for our free pilot program.
          </p>

          {submitted ? (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-8 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-[#22C55E]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-[#22C55E]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">You&apos;re on the list!</h3>
              <p className="text-white/60">We&apos;ll be in touch soon with early access details.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="bg-white/10 border border-white/20 rounded-2xl p-8 backdrop-blur-sm">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#C49A1A] focus:ring-1 focus:ring-[#C49A1A] transition-all"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#C49A1A] focus:ring-1 focus:ring-[#C49A1A] transition-all"
                />
              </div>
              <div className="mb-6">
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#C49A1A] focus:ring-1 focus:ring-[#C49A1A] transition-all appearance-none"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" className="bg-[#1B2B4B] text-white/40">I am a...</option>
                  <option value="Parent" className="bg-[#1B2B4B] text-white">Parent</option>
                  <option value="Student" className="bg-[#1B2B4B] text-white">Student</option>
                  {/* Teacher / School options hidden until teachersEnabled flag is on */}
                  {flags.teachersEnabled && (
                    <>
                      <option value="Teacher" className="bg-[#1B2B4B] text-white">Teacher</option>
                      <option value="School Administrator" className="bg-[#1B2B4B] text-white">School Administrator</option>
                    </>
                  )}
                </select>
              </div>

              {error && (
                <div className="mb-4 text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#C49A1A] hover:bg-white hover:text-[#1B2B4B] disabled:opacity-60 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Join the Waitlist
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
