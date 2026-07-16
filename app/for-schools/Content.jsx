'use client'

import { useState } from 'react'
import Footer from '@/components/Footer'
import { Users, BarChart3, Brain, MessageSquare, AlertTriangle, Eye, BookOpen, Shield, CheckCircle2, ArrowRight, X, School, Phone, Mail, Sparkles } from 'lucide-react'

const painPoints = [
  {
    icon: AlertTriangle,
    title: 'One-Size-Fits-All Teaching',
    description: 'Every student in a class of 28 gets the same worksheet, regardless of whether they are ahead or struggling behind.',
  },
  {
    icon: Eye,
    title: 'No Real-Time Data',
    description: 'Teachers rely on end-of-term tests to discover gaps. By then, students have already fallen behind.',
  },
  {
    icon: MessageSquare,
    title: 'Parents Out of the Loop',
    description: 'Most parents only hear about their child\'s progress twice a year at parent-teacher conferences.',
  },
]

const solutions = [
  {
    icon: BarChart3,
    title: 'Class Skill Heatmap',
    description: 'See every student\'s mastery level across all skills in one glance. Green, amber, and red cells show you exactly where to focus.',
  },
  {
    icon: Brain,
    title: 'AI Teacher Insights',
    description: 'Automated alerts like "5 students are struggling with fractions" help you plan targeted group lessons.',
  },
  {
    icon: BookOpen,
    title: 'Curriculum-Aligned Diagnostics',
    description: 'Every question maps directly to the Australian Curriculum v9.0. No extra planning required.',
  },
  {
    icon: Users,
    title: 'Parent Communication Tools',
    description: 'Automated weekly progress emails keep parents informed and engaged without any extra work from teachers.',
  },
]

const pricingPlans = [
  {
    name: 'Free Pilot',
    price: '$0',
    period: '60 days',
    description: 'Try MyMathsHero risk-free with your class',
    features: ['Up to 30 students', 'Full feature access', 'All 3 subjects', 'Teacher dashboard', 'Email support'],
    cta: 'Start Free Pilot',
    highlighted: false,
  },
  {
    name: 'School Licence',
    price: '$800',
    period: 'per year',
    description: 'For individual schools ready to scale',
    features: ['Unlimited students', 'Teacher dashboard', 'Class heatmaps', 'Parent reports', 'Priority support', 'Data export'],
    cta: 'Book a Demo',
    highlighted: true,
  },
  {
    name: 'District Licence',
    price: 'Custom',
    period: 'contact us',
    description: 'For multiple schools and districts',
    features: ['Multiple schools', 'Admin console', 'Cross-school analytics', 'Data export & API', 'Dedicated support', 'Custom onboarding'],
    cta: 'Contact Us',
    highlighted: false,
  },
]

export default function ForSchoolsContent() {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', school_name: '', role: '', email: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleDemoSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8">
              <School size={16} className="text-electric" />
              For Schools & Educators
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Give Every Student in Your Class a{' '}
              <span className="text-electric">Personal Tutor</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/70 mb-10 leading-relaxed max-w-2xl">
              MyMathsHero gives principals and teachers the tools to personalise learning at scale — without more workload.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-[#C49A1A] hover:bg-[#1B2B4B] text-white px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 shadow-lg"
            >
              Book a Free Demo
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-sm font-semibold mb-4">The Problem</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Challenges Schools Face Every Day</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {painPoints.map((p, i) => (
              <div key={i} className="bg-red-50/50 rounded-2xl p-8 border border-red-100">
                <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center mb-6">
                  <p.icon size={28} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-3">{p.title}</h3>
                <p className="text-gray-600 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue text-electric text-sm font-semibold mb-4">The Solution</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">How MyMathsHero Helps Your School</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {solutions.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-electric/20 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                    <s.icon size={28} className="text-electric" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-navy mb-2">{s.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-skyblue text-electric text-sm font-semibold mb-4">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Start with a free pilot. Scale when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <div key={i} className={`rounded-2xl p-8 border-2 transition-all duration-300 ${plan.highlighted ? 'border-electric bg-electric/5 shadow-xl shadow-electric/10 md:scale-105' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                {plan.highlighted && (
                  <span className="inline-block px-3 py-1 rounded-full bg-electric text-white text-xs font-semibold mb-4">Most Popular</span>
                )}
                <h3 className="text-xl font-bold text-navy">{plan.name}</h3>
                <div className="mt-4 mb-2">
                  <span className="text-4xl font-bold text-navy">{plan.price}</span>
                  <span className="text-gray-500 ml-2">/{plan.period}</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-gray-700 text-sm">
                      <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setShowModal(true)}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${plan.highlighted ? 'bg-electric text-white hover:bg-electric/90 shadow-lg shadow-electric/25' : 'bg-navy/5 text-navy hover:bg-navy/10'}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield size={20} className="text-electric" />
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Trusted by Schools Across Australia</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 opacity-40">
            {['Sydney Grammar', 'Melbourne Primary', 'Brisbane State School', 'Perth Academy', 'Adelaide College'].map((school, i) => (
              <div key={i} className="text-lg font-bold text-gray-400">{school}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 gradient-navy">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles size={32} className="text-electric mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Transform Your Classroom?</h2>
          <p className="text-white/60 text-lg mb-8">Book a free demo and see how MyMathsHero can help every student in your school.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-[#C49A1A] hover:bg-[#1B2B4B] text-white px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 shadow-lg"
          >
            Book a Free Demo
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <Footer />

      {/* Demo Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative animate-scale-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} className="text-gray-400" />
            </button>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-success" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">Demo Request Submitted!</h3>
                <p className="text-gray-500">We'll be in touch within 24 hours to schedule your demo.</p>
                <button onClick={() => { setShowModal(false); setSubmitted(false); setFormData({ name: '', school_name: '', role: '', email: '', phone: '' }) }} className="mt-6 bg-electric text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-navy mb-2">Book a Free Demo</h3>
                <p className="text-gray-500 mb-6">Fill in your details and we'll schedule a personalised demo for your school.</p>

                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="John Smith" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                    <input type="text" required value={formData.school_name} onChange={e => setFormData({...formData, school_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="Sydney Primary School" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Role *</label>
                    <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm appearance-none bg-white">
                      <option value="">Select your role</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Principal">Principal</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="john@school.edu.au" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="04XX XXX XXX" />
                  </div>

                  {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

                  <button type="submit" disabled={submitting} className="w-full bg-electric hover:bg-electric/90 disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2">
                    {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ArrowRight size={16} /> Submit Request</>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
