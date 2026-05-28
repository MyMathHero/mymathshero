'use client'

import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { User, Mail, Phone, Lock, Plus, ArrowRight, CheckCircle2, Eye } from 'lucide-react'

const DEMO_STUDENT_ID = 'student_test_001'
const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'

const avatarOptions = ['🦊', '🐱', '🐶', '🦁', '🐼', '🦄', '🐸', '🦋']
const gradeOptions = ['Prep', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5']

export default function ParentDashboard() {
  const [step, setStep] = useState('landing') // landing, register, addChild, childCreated, dashboard
  const [showPin, setShowPin] = useState(false)
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [childForm, setChildForm] = useState({ name: '', grade: '', avatar: '🦊' })
  const [parentData, setParentData] = useState(null)
  const [children, setChildren] = useState([])
  const [childData, setChildData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  // Check auth on mount — load real parent's children, or redirect, or stay on landing.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me')
        const auth = res.ok ? await res.json() : { authenticated: false }
        if (cancelled) return

        if (auth.authenticated && auth.user?.role === 'parent') {
          const parentId = auth.user.userId
          setParentData({ id: parentId, name: auth.user.name, email: auth.user.email })
          const cr = await fetch(`/api/parent/children?parentId=${parentId}`)
          const cdata = await cr.json()
          if (!cancelled && cr.ok && cdata.children?.length > 0) {
            setChildren(cdata.children)
            setChildData(cdata.children[0])
            setStep('dashboard')
          }
          return
        }
        if (auth.authenticated && auth.user?.role === 'student') {
          window.location.href = '/student-dashboard'
          return
        }
        if (auth.authenticated && auth.user?.role === 'teacher') {
          window.location.href = '/teacher-dashboard'
          return
        }
      } catch {
        // Network error — fall through to landing.
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...registerForm, role: 'parent' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSubmitting(false); return }
      setParentData(data.data)
      setStep('addChild')
    } catch { setError('Network error') }
    setSubmitting(false)
  }

  const handleAddChild = async (e) => {
    e.preventDefault()
    if (!parentData) return
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: parentData.id, child_name: childForm.name, grade: childForm.grade, avatar: childForm.avatar }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSubmitting(false); return }
      setChildData(data.data)
      setChildren(prev => [...prev, data.data])
      setStep('childCreated')
    } catch { setError('Network error') }
    setSubmitting(false)
  }

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <img src="/assets/logos/logo-icon.png" alt="MyMathsHero" style={{ width: 80, animation: 'pulse 1.5s infinite' }} />
        <p style={{ color: NAVY, fontWeight: 600 }}>Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-offwhite">

      {/* Landing */}
      {step === 'landing' && (
        <>
          <section className="gradient-hero pt-32 pb-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Parent <span className="text-electric">Portal</span></h1>
              <p className="text-lg text-white/70 mb-8">Create your account, add your child, and track their learning journey</p>
              <button onClick={() => setStep('register')} className="bg-[#C49A1A] hover:bg-white hover:text-[#1B2B4B] text-white px-8 py-4 rounded-xl text-base font-semibold shadow-lg inline-flex items-center gap-2">
                Create Parent Account <ArrowRight size={18} />
              </button>
              <p className="text-white/40 text-sm mt-6">Already have an account? <button onClick={() => setStep('dashboard')} className="text-electric underline">View Demo Dashboard</button></p>
            </div>
          </section>
          <Footer />
        </>
      )}

      {/* Register */}
      {step === 'register' && (
        <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4"><User size={28} className="text-electric" /></div>
              <h2 className="text-2xl font-bold text-navy">Create Parent Account</h2>
              <p className="text-gray-500 text-sm mt-1">Step 1 of 2</p>
            </div>
            <form onSubmit={handleRegister} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" required value={registerForm.name} onChange={e => setRegisterForm({...registerForm, name: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="Sarah Johnson" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" required value={registerForm.email} onChange={e => setRegisterForm({...registerForm, email: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="sarah@email.com" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" required minLength={6} value={registerForm.password} onChange={e => setRegisterForm({...registerForm, password: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="Min 6 characters" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <div className="relative"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="tel" value={registerForm.phone} onChange={e => setRegisterForm({...registerForm, phone: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="04XX XXX XXX" /></div>
              </div>
              {error && <div className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">{error}</div>}
              <button type="submit" disabled={submitting} className="w-full bg-[#1B2B4B] hover:bg-[#C49A1A] disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Continue <ArrowRight size={16} /></>}
              </button>
              <button type="button" onClick={() => setStep('landing')} className="w-full text-gray-500 text-sm hover:text-gray-700">Back</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Child */}
      {step === 'addChild' && (
        <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4"><Plus size={28} className="text-green-600" /></div>
              <h2 className="text-2xl font-bold text-navy">Add Your Child</h2>
              <p className="text-gray-500 text-sm mt-1">Step 2 of 2 — Welcome, {parentData?.name}!</p>
            </div>
            <form onSubmit={handleAddChild} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child&apos;s Name</label>
                <input type="text" required value={childForm.name} onChange={e => setChildForm({...childForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="Alex" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                <select required value={childForm.grade} onChange={e => setChildForm({...childForm, grade: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm bg-white appearance-none">
                  <option value="">Select grade</option>
                  {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose an Avatar</label>
                <div className="flex gap-2 flex-wrap">
                  {avatarOptions.map(a => (
                    <button key={a} type="button" onClick={() => setChildForm({...childForm, avatar: a})} className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${childForm.avatar === a ? 'bg-electric/10 border-2 border-electric scale-110 shadow-md' : 'bg-gray-50 border-2 border-gray-100 hover:border-gray-300'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">{error}</div>}
              <button type="submit" disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Add Child <CheckCircle2 size={16} /></>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Child Created */}
      {step === 'childCreated' && childData && (
        <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-lg">
              <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4 text-5xl">{childData.avatar}</div>
              <h2 className="text-2xl font-bold text-navy mb-2">{childData.name} is Ready!</h2>
              <p className="text-gray-500 text-sm mb-6">{childData.grade} account created successfully</p>
              <div className="bg-navy rounded-xl p-5 text-left mb-6">
                <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Child Login Credentials</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Username</span>
                    <span className="text-white font-bold font-mono text-sm bg-white/10 px-3 py-1 rounded-lg">{childData.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">PIN</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold font-mono text-sm bg-white/10 px-3 py-1 rounded-lg">{showPin ? childData.pin : '••••'}</span>
                      <button onClick={() => setShowPin(!showPin)} className="text-white/40 hover:text-white/70"><Eye size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-xs mb-6">Share these credentials with your child to log in on their device.</p>
              <button onClick={() => setStep('dashboard')} className="w-full bg-[#1B2B4B] hover:bg-[#C49A1A] text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                Go to Parent Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {step === 'dashboard' && (
        <DashboardView
          parentData={parentData}
          children={children}
          childData={childData}
          setChildData={setChildData}
          onAddChild={() => setStep('addChild')}
        />
      )}
    </div>
  )
}

// ── Data-rich dashboard view ──────────────────────────────────────────────────

function DashboardView({ parentData, children, childData, setChildData, onAddChild }) {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState('')
  const [insightLoading, setInsightLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [reportMsg, setReportMsg] = useState('')
  const [lastReportSent, setLastReportSent] = useState(null)

  const studentId = childData?.id || DEMO_STUDENT_ID
  const parentId = parentData?.id

  // Fetch progress + AI insight whenever the selected child changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true); setInsightLoading(true)
    ;(async () => {
      try {
        const url = parentId
          ? `/api/student/progress?studentId=${studentId}&parentId=${parentId}`
          : `/api/student/progress?studentId=${studentId}`
        const res = await fetch(url)
        const data = await res.json()
        if (!cancelled && res.ok) setProgress(data)
      } catch {} finally {
        if (!cancelled) setLoading(false)
      }
    })()
    ;(async () => {
      try {
        const url = parentId
          ? `/api/parent/insights?studentId=${studentId}&parentId=${parentId}`
          : `/api/parent/insights?studentId=${studentId}`
        const res = await fetch(url)
        const data = await res.json()
        if (!cancelled && res.ok && data.insight) setInsight(data.insight)
      } catch {} finally {
        if (!cancelled) setInsightLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [studentId, parentId])

  const student = progress?.student
  const stats = progress?.stats || {}
  const weeklyActivity = progress?.weeklyActivity || []
  const skillTree = progress?.skillTree || []

  // Maths-only skill list for the heatmap.
  const mathsSkills = skillTree.filter(s => s.subject === 'Maths' || s.subject === 'Mathematics')

  const totalQuestionsThisWeek = weeklyActivity.reduce((s, d) => s + d.questions, 0)
  const accuracy = stats.accuracy ?? 0
  const mastered = stats.mastered ?? 0
  const streak = student?.streak ?? childData?.streak ?? 0

  const chartData = weeklyActivity.length > 0
    ? weeklyActivity.map(d => ({ day: d.day, questions: d.questions, correct: d.correct }))
    : []

  async function sendReport() {
    if (!parentId || !studentId) {
      setReportMsg('Sign in as a parent to email reports.')
      return
    }
    setReportSending(true); setReportMsg('')
    try {
      const res = await fetch('/api/parent/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, studentId }),
      })
      const data = await res.json()
      setReportMsg(data.message || (data.sent ? 'Report sent!' : 'Could not send report.'))
      if (data.sent) setLastReportSent(new Date())
    } catch {
      setReportMsg('Network error sending report.')
    } finally {
      setReportSending(false)
    }
  }

  function heatColor(score) {
    if (score >= 80) return { bg: '#DCFCE7', border: '#22C55E', text: '#15803D' } // mastered
    if (score >= 50) return { bg: '#FEF3C7', border: GOLD, text: '#92400E' }       // progressing
    return { bg: '#F1F5F9', border: '#CBD5E1', text: '#64748B' }                   // needs work
  }

  const cardStyle = { background: 'white', borderRadius: 16, padding: 20, border: '1px solid #E2E8F0' }

  return (
    <div style={{ background: '#F0F4F8', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: '24px 16px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, margin: 0 }}>Parent Hub</h1>
            <p style={{ color: '#94A3B8', fontSize: 14, margin: '4px 0 0' }}>Welcome back, {parentData?.name || 'Parent'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {children.length > 1 && (
              <select
                value={studentId}
                onChange={e => setChildData(children.find(c => c.id === e.target.value))}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 14px', fontWeight: 600, fontSize: 14 }}
              >
                {children.map(c => <option key={c.id} value={c.id} style={{ color: NAVY }}>{c.avatar} {c.name}</option>)}
              </select>
            )}
            <a href="/student-dashboard" style={{ background: GOLD, color: 'white', padding: '8px 18px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              👦 Switch to Child View →
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ width: 40, height: 40, border: `4px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: '#64748B' }}>Loading {childData?.name || 'your child'}&apos;s progress...</p>
          </div>
        ) : (
          <>
            {/* B) Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <StatCard label="Questions This Week" value={totalQuestionsThisWeek} accent="#3B82F6" />
              <StatCard label="Overall Accuracy" value={`${accuracy}%`} accent="#22C55E" />
              <StatCard label="Skills Mastered" value={mastered} accent={GOLD} />
              <StatCard label="Current Streak" value={`${streak} 🔥`} accent="#F97316" />
            </div>

            {/* C) AI Daily Insight */}
            <div style={{ background: NAVY, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}` }}>
              <p style={{ color: GOLD, fontWeight: 800, margin: '0 0 8px', fontSize: 15 }}>🤖 Hero&apos;s Daily Insight</p>
              {insightLoading ? (
                <p style={{ color: '#94A3B8', fontSize: 14, margin: 0 }}>Hero is reviewing {childData?.name || 'your child'}&apos;s progress…</p>
              ) : (
                <p style={{ color: 'white', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{insight}</p>
              )}
            </div>

            {/* D) Skills Heatmap */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ color: NAVY, fontWeight: 800, margin: 0, fontSize: 16 }}>Maths Skills Heatmap</h3>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748B' }}>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#22C55E', borderRadius: 3, marginRight: 5 }} />Mastered</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: GOLD, borderRadius: 3, marginRight: 5 }} />Progressing</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#CBD5E1', borderRadius: 3, marginRight: 5 }} />Needs work</span>
                </div>
              </div>
              {mathsSkills.length === 0 ? (
                <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>No skill data yet — once {childData?.name || 'your child'} starts practising, their progress appears here.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                  {mathsSkills.map(skill => {
                    const c = heatColor(skill.score || 0)
                    return (
                      <div key={skill.id} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ color: NAVY, fontWeight: 700, fontSize: 12, marginBottom: 4, lineHeight: 1.3 }}>{skill.name}</div>
                        <div style={{ color: c.text, fontWeight: 800, fontSize: 18 }}>{skill.score || 0}<span style={{ fontSize: 11, fontWeight: 600 }}>/100</span></div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* E) Weekly Activity Chart */}
            <div style={cardStyle}>
              <h3 style={{ color: NAVY, fontWeight: 800, margin: '0 0 14px', fontSize: 16 }}>Weekly Activity</h3>
              {chartData.length > 0 ? (
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(196,154,26,0.08)' }}
                        contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }}
                        formatter={(value, name) => [value, name === 'questions' ? 'Questions' : 'Correct']}
                      />
                      <Bar dataKey="questions" fill={GOLD} radius={[6, 6, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>No activity recorded this week yet.</p>
              )}
            </div>

            {/* F) Recent Sessions (per-day this week) */}
            <div style={cardStyle}>
              <h3 style={{ color: NAVY, fontWeight: 800, margin: '0 0 12px', fontSize: 16 }}>This Week&apos;s Sessions</h3>
              {weeklyActivity.some(d => d.questions > 0) ? (
                <div>
                  {weeklyActivity.filter(d => d.questions > 0).slice(-5).reverse().map((d, i) => {
                    const acc = d.questions > 0 ? Math.round((d.correct / d.questions) * 100) : 0
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F0F4F8' }}>
                        <span style={{ color: NAVY, fontWeight: 700, fontSize: 14 }}>{d.day}</span>
                        <span style={{ color: '#64748B', fontSize: 13 }}>{d.questions} questions · {acc}% correct</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>No sessions logged this week.</p>
              )}
            </div>

            {/* G) Hero Report */}
            <div style={{ ...cardStyle, borderColor: GOLD, background: '#FFFBEB' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ color: NAVY, fontWeight: 800, margin: '0 0 4px', fontSize: 16 }}>📧 Hero Report</h3>
                  <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
                    {lastReportSent
                      ? `Last sent ${lastReportSent.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                      : 'No report sent yet this session'}
                  </p>
                  {reportMsg && <p style={{ color: NAVY, fontSize: 13, margin: '6px 0 0', fontWeight: 600 }}>{reportMsg}</p>}
                </div>
                <button
                  onClick={sendReport}
                  disabled={reportSending}
                  style={{ background: NAVY, color: 'white', border: `2px solid ${GOLD}`, borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: reportSending ? 'wait' : 'pointer', opacity: reportSending ? 0.7 : 1 }}
                >
                  {reportSending ? 'Sending…' : 'Send Hero Report to my email'}
                </button>
              </div>
            </div>

            {/* H) Account Settings */}
            <div style={cardStyle}>
              <button
                onClick={() => setShowSettings(s => !s)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0 }}
              >
                <h3 style={{ color: NAVY, fontWeight: 800, margin: 0, fontSize: 16 }}>Account Settings</h3>
                <span style={{ color: '#64748B', fontSize: 18 }}>{showSettings ? '▲' : '▼'}</span>
              </button>
              {showSettings && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '12px 16px', background: '#F0F4F8', borderRadius: 8 }}>
                    <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>Name</p>
                    <p style={{ color: NAVY, fontWeight: 600, margin: 0 }}>{parentData?.name || 'Not available'}</p>
                  </div>
                  {parentData?.email && (
                    <div style={{ padding: '12px 16px', background: '#F0F4F8', borderRadius: 8 }}>
                      <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>Email</p>
                      <p style={{ color: NAVY, fontWeight: 600, margin: 0 }}>{parentData.email}</p>
                    </div>
                  )}
                  <button onClick={onAddChild} style={{ background: GOLD, color: 'white', border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                    + Add Another Child
                  </button>
                  <button
                    onClick={() => { fetch('/api/auth/logout', { method: 'POST' }).then(() => { window.location.href = '/login' }) }}
                    style={{ background: NAVY, color: 'white', border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 18, border: '1px solid #E2E8F0', borderTop: `3px solid ${accent}` }}>
      <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#1B2B4B', fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  )
}
