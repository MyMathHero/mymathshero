'use client'

import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import { Brain, Zap, Trophy, Target, Lock, Unlock, Star, TrendingUp, Award, Flame, Users, BarChart3, Mail, ChevronRight, Sparkles, BookOpen, Clock, Lightbulb, CheckCircle2 } from 'lucide-react'

const detailedSteps = [
  {
    num: 1,
    title: 'Take a Diagnostic Test',
    subtitle: 'Understand where your child stands',
    description: 'A short, engaging 10-minute adaptive quiz covers key skills for your child\'s grade level. The AI adjusts question difficulty in real-time based on responses.',
    details: ['Questions adapt as the student answers', 'Covers all 3 subjects', 'Takes only 10-15 minutes', 'Results available immediately'],
    icon: Target,
  },
  {
    num: 2,
    title: 'Practice Your Skills',
    subtitle: 'AI-powered personalised practice',
    description: 'Based on diagnostic results, MyMathsHero creates a custom learning path. Each question is carefully selected to be challenging but achievable.',
    details: ['Questions match skill level exactly', 'Hints available when stuck', 'Instant feedback on every answer', 'Multiple question formats'],
    icon: Zap,
  },
  {
    num: 3,
    title: 'Watch Yourself Grow',
    subtitle: 'Track progress and celebrate wins',
    description: 'SmartScores rise as skills are mastered. Students earn badges, maintain streaks, and unlock new challenges. Parents and teachers see real-time progress.',
    details: ['SmartScore tracks mastery 0-100', 'Earn badges and rewards', 'Weekly progress reports', 'Visible skill tree progression'],
    icon: Trophy,
  },
]

const skillTreeData = [
  { name: 'Addition', score: 95, unlocked: true, mastered: true },
  { name: 'Subtraction', score: 88, unlocked: true, mastered: true },
  { name: 'Multiplication', score: 72, unlocked: true, mastered: false },
  { name: 'Division', score: 45, unlocked: true, mastered: false },
  { name: 'Fractions', score: 20, unlocked: true, mastered: false },
  { name: 'Decimals', score: 0, unlocked: false, mastered: false },
  { name: 'Percentages', score: 0, unlocked: false, mastered: false },
  { name: 'Algebra Basics', score: 0, unlocked: false, mastered: false },
]

const studentFeatures = [
  { icon: Award, title: 'Badges & Rewards', description: 'Earn badges like "Fraction Master" and "Science Explorer" as you master skills.' },
  { icon: Flame, title: 'Daily Streaks', description: 'Keep your streak alive by practising every day. Special rewards at 7, 14, and 30 days.' },
  { icon: Star, title: 'Avatar Customisation', description: 'Unlock new avatar items and accessories as you progress through skill trees.' },
  { icon: Trophy, title: 'Leaderboard', description: 'See how you rank in your class (optional, teacher-controlled). Celebrate top learners.' },
]

export default function HowItWorksPage() {
  const [smartScore, setSmartScore] = useState(0)
  const [animateScore, setAnimateScore] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateScore(true)
      let current = 0
      const target = 73
      const interval = setInterval(() => {
        current += 1
        setSmartScore(current)
        if (current >= target) clearInterval(interval)
      }, 20)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8">
            <Brain size={16} className="text-electric" />
            Deep Dive
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            How <span className="text-electric">MyMathsHero</span> Works
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
            From diagnostic to mastery — here's how our AI creates a truly personalised learning experience.
          </p>
        </div>
      </section>

      {/* Detailed Steps */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-16">
            {detailedSteps.map((step, i) => (
              <div key={i} className={`flex flex-col ${i % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 items-center`}>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-electric/10 text-electric text-sm font-semibold mb-4">
                    Step {step.num}
                  </div>
                  <h2 className="text-3xl font-bold text-navy mb-2">{step.title}</h2>
                  <p className="text-electric font-medium mb-4">{step.subtitle}</p>
                  <p className="text-gray-600 leading-relaxed mb-6">{step.description}</p>
                  <ul className="space-y-3">
                    {step.details.map((d, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-gray-700">
                        <CheckCircle2 size={18} className="text-success flex-shrink-0" />
                        <span className="text-sm">{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-lg">
                    <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mb-6">
                      <step.icon size={32} className="text-electric" />
                    </div>
                    <div className="space-y-3">
                      {step.details.map((d, j) => (
                        <div key={j} className="h-3 bg-skyblue rounded-full" style={{ width: `${100 - j * 15}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SmartScore */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue text-electric text-sm font-semibold mb-4">SmartScore</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Your Child's Learning, Quantified</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                SmartScore is a 0–100 measure of skill mastery. Unlike simple percentages, it factors in response time, error patterns, hint usage, and consistency to give a true picture of understanding.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600"><strong>0–39:</strong> Needs Practice — skill not yet understood</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm text-gray-600"><strong>40–69:</strong> Getting There — building understanding</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm text-gray-600"><strong>70–100:</strong> Mastered — confident and consistent</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  <circle cx="100" cy="100" r="85" fill="none" stroke="#DBEAFE" strokeWidth="12" />
                  <circle
                    cx="100" cy="100" r="85" fill="none" stroke="#1B2B4B" strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    strokeDashoffset={`${2 * Math.PI * 85 * (1 - smartScore / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-navy">{smartScore}</span>
                  <span className="text-sm text-gray-500 font-medium">SmartScore</span>
                  <span className="text-xs text-success font-semibold mt-1">Mastered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skill Tree */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue text-electric text-sm font-semibold mb-4">Skill Tree</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Visual Skill Progression</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Skills unlock as prerequisites are mastered, creating a clear learning pathway.</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {skillTreeData.map((skill, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${skill.unlocked ? 'bg-white border-gray-100 hover:border-electric/20 hover:shadow-md' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${skill.mastered ? 'bg-success/10' : skill.unlocked ? 'bg-electric/10' : 'bg-gray-100'}`}>
                    {skill.unlocked ? (
                      skill.mastered ? <CheckCircle2 size={20} className="text-success" /> : <Unlock size={20} className="text-electric" />
                    ) : (
                      <Lock size={20} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold text-sm ${skill.unlocked ? 'text-navy' : 'text-gray-400'}`}>{skill.name}</span>
                      {skill.unlocked && <span className="text-sm font-bold text-navy">{skill.score}/100</span>}
                    </div>
                    {skill.unlocked && (
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${skill.score >= 70 ? 'bg-success' : skill.score >= 40 ? 'bg-warning' : 'bg-red-400'}`}
                          style={{ width: `${skill.score}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue text-electric text-sm font-semibold mb-4">AI Engine</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Our AI Watches How Your Child Learns</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                MyMathsHero's AI doesn't just check if an answer is right or wrong. It analyses the entire learning process to build a complete picture of each student.
              </p>
              <div className="space-y-5">
                {[
                  { icon: Clock, title: 'Response Time', desc: 'How long a student takes indicates confidence level. Quick correct answers signal mastery.' },
                  { icon: Target, title: 'Error Patterns', desc: 'Repeated mistakes on similar questions reveal specific misconceptions the AI can target.' },
                  { icon: Lightbulb, title: 'Hint Usage', desc: 'Students who need hints get gentler progression. Those who don\'t are challenged faster.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center flex-shrink-0">
                      <item.icon size={20} className="text-electric" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy text-sm">{item.title}</h4>
                      <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-navy to-navy/90 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <Brain size={24} className="text-electric" />
                <span className="font-semibold">AI Learning Profile</span>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Response Speed', value: 'Fast', bar: 82 },
                  { label: 'Accuracy', value: 'High', bar: 88 },
                  { label: 'Hint Reliance', value: 'Low', bar: 15 },
                  { label: 'Consistency', value: 'Growing', bar: 65 },
                  { label: 'Overall Mastery', value: '73%', bar: 73 },
                ].map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">{m.label}</span>
                      <span className="text-white font-medium">{m.value}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-electric rounded-full transition-all duration-1000" style={{ width: `${m.bar}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Students */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue text-electric text-sm font-semibold mb-4">For Students</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Learning That Feels Like Playing</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {studentFeatures.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-electric/20 hover:shadow-lg transition-all duration-300 text-center">
                <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon size={28} className="text-electric" />
                </div>
                <h3 className="font-bold text-navy mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
          {/* Leaderboard Preview */}
          <div className="mt-12 max-w-lg mx-auto bg-white rounded-2xl p-6 border border-gray-100 shadow-md">
            <h4 className="font-bold text-navy mb-4 flex items-center gap-2"><Trophy size={18} className="text-warning" /> Class Leaderboard</h4>
            {[
              { rank: 1, name: 'Emma', xp: 2840, avatar: 'E' },
              { rank: 2, name: 'Alex', xp: 2650, avatar: 'A' },
              { rank: 3, name: 'Sophie', xp: 2420, avatar: 'S' },
              { rank: 4, name: 'Liam', xp: 2180, avatar: 'L' },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-warning/10 text-warning' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>{s.rank}</span>
                <div className="w-8 h-8 rounded-full bg-electric/10 flex items-center justify-center text-electric font-bold text-xs">{s.avatar}</div>
                <span className="font-medium text-navy text-sm flex-1">{s.name}</span>
                <span className="text-sm text-gray-500">{s.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Teachers */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue text-electric text-sm font-semibold mb-4">For Teachers</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Your Classroom, Supercharged</h2>
          </div>
          <div className="bg-offwhite rounded-2xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 size={20} className="text-electric" />
              <span className="font-semibold text-navy">Class Skill Heatmap — Grade 4</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-500">Student</th>
                    {['Addition', 'Subtraction', 'Multiply', 'Fractions', 'Decimals', 'Geometry'].map(s => (
                      <th key={s} className="py-3 px-2 font-semibold text-gray-500 text-center">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Alex', scores: [92, 85, 67, 45, 30, 78] },
                    { name: 'Emma', scores: [98, 95, 88, 72, 65, 90] },
                    { name: 'Liam', scores: [75, 68, 42, 25, 15, 55] },
                    { name: 'Sophie', scores: [88, 82, 78, 60, 48, 72] },
                  ].map((student, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-3 px-2 font-medium text-navy">{student.name}</td>
                      {student.scores.map((score, j) => (
                        <td key={j} className="py-3 px-2 text-center">
                          <span className={`inline-block w-10 h-7 rounded text-xs font-bold flex items-center justify-center ${score >= 70 ? 'bg-success/15 text-success' : score >= 40 ? 'bg-warning/15 text-warning' : 'bg-red-100 text-red-600'}`}>
                            {score}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* For Parents */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue text-electric text-sm font-semibold mb-4">For Parents</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Stay in the Loop, Every Week</h2>
          </div>
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="bg-navy p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Mail size={18} className="text-electric" />
                  <span className="text-white/60 text-sm">Weekly Progress Report</span>
                </div>
                <h3 className="text-white font-bold text-lg">Alex's Week in Review</h3>
                <p className="text-white/50 text-sm">Week of 16–22 June 2025</p>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <h4 className="font-semibold text-navy text-sm mb-3">Highlights</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={16} className="text-success" />
                      Mastered "Multiplication Tables" (SmartScore: 92)
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Flame size={16} className="text-orange-500" />
                      5-day practice streak maintained
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp size={16} className="text-electric" />
                      Fractions improved from 38 to 52
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="font-semibold text-navy text-sm mb-3">Focus Areas</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Fractions</span>
                      <span className="text-warning font-semibold">52/100</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Decimals</span>
                      <span className="text-red-500 font-semibold">30/100</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="font-semibold text-navy text-sm mb-2">Week Stats</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-skyblue/50 rounded-lg p-3">
                      <div className="text-xl font-bold text-navy">47</div>
                      <div className="text-xs text-gray-500">Questions</div>
                    </div>
                    <div className="bg-skyblue/50 rounded-lg p-3">
                      <div className="text-xl font-bold text-navy">78%</div>
                      <div className="text-xs text-gray-500">Accuracy</div>
                    </div>
                    <div className="bg-skyblue/50 rounded-lg p-3">
                      <div className="text-xl font-bold text-navy">3</div>
                      <div className="text-xs text-gray-500">Skills Up</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
