'use client'

import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import { Users, Brain, X, Trophy, Target, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Download, Plus, User, Mail, Phone, Lock, ArrowRight, CheckCircle2, Eye } from 'lucide-react'

const DEMO_STUDENT_ID = 'student_test_001'

const avatarOptions = ['🦊', '🐱', '🐶', '🦁', '🐼', '🦄', '🐸', '🦋']
const gradeOptions = ['Prep', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5']

// Same heatmap colour ramp the teacher dashboard uses.
function getCellStyle(score) {
  if (score >= 80) return { bg: 'rgba(22, 163, 74, 0.25)', text: '#15803d', fontWeight: 700 }
  if (score >= 70) return { bg: 'rgba(22, 163, 74, 0.15)', text: '#16a34a', fontWeight: 600 }
  if (score >= 60) return { bg: 'rgba(34, 197, 94, 0.10)', text: '#4ade80', fontWeight: 600 }
  if (score >= 50) return { bg: 'rgba(217, 119, 6, 0.10)', text: '#b45309', fontWeight: 600 }
  if (score >= 40) return { bg: 'rgba(217, 119, 6, 0.18)', text: '#92400e', fontWeight: 600 }
  if (score >= 25) return { bg: 'rgba(220, 38, 38, 0.12)', text: '#dc2626', fontWeight: 600 }
  if (score === 0) return { bg: 'rgba(200,200,200,0.15)', text: '#9ca3af', fontWeight: 400 }
  return { bg: 'rgba(220, 38, 38, 0.22)', text: '#991b1b', fontWeight: 700 }
}

// Same insight styling the teacher dashboard uses.
function getInsightStyle(type) {
  switch (type) {
    case 'high':   return { dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700',         label: 'HIGH' }
    case 'medium': return { dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700',     label: 'MED' }
    case 'low':    return { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'LOW' }
    default:       return { dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700',       label: 'INFO' }
  }
}

export default function ParentDashboard() {
  const [step, setStep] = useState('loading') // loading, landing, register, addChild, childCreated, dashboard
  const [showPin, setShowPin] = useState(false)
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [childForm, setChildForm] = useState({ name: '', grade: '', avatar: '🦊' })
  const [parentData, setParentData] = useState(null)
  const [children, setChildren] = useState([])
  const [childData, setChildData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Dashboard data
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(null)
  const [insights, setInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsSource, setInsightsSource] = useState(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [reportMsg, setReportMsg] = useState('')
  const [lastReportSent, setLastReportSent] = useState(null)

  // ── Auth check on mount ────────────────────────────────────────────────────
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
          } else {
            setStep('landing')
          }
          return
        }
        if (auth.authenticated && auth.user?.role === 'student') { window.location.href = '/student-dashboard'; return }
        if (auth.authenticated && auth.user?.role === 'teacher') { window.location.href = '/teacher-dashboard'; return }
        setStep('landing')
      } catch {
        setStep('landing')
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Fetch progress + AI insight whenever the selected child changes ─────────
  useEffect(() => {
    if (step !== 'dashboard') return
    let cancelled = false
    const studentId = childData?.id || DEMO_STUDENT_ID
    const parentId = parentData?.id
    setLoading(true)
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
    fetchInsights(studentId, parentId, cancelled)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, childData?.id])

  async function fetchInsights(studentId, parentId, cancelledRef) {
    setInsightsLoading(true)
    try {
      const url = parentId
        ? `/api/parent/insights?studentId=${studentId}&parentId=${parentId}`
        : `/api/parent/insights?studentId=${studentId}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        // The parent insights endpoint returns one AI string + stats; expand it
        // into the same timeline-item shape the teacher dashboard renders.
        const items = []
        if (data.insight) {
          items.push({ type: 'info', title: "Hero's Daily Insight", description: data.insight, actionLabel: null })
        }
        const st = data.stats || {}
        if (st.totalToday > 0) {
          items.push({ type: 'low', title: `${st.totalToday} question${st.totalToday === 1 ? '' : 's'} answered today`, description: `Accuracy is sitting at ${st.accuracy}%. Consistent daily practice keeps progress strong.`, actionLabel: null })
        } else {
          items.push({ type: 'medium', title: 'No practice yet today', description: `A short session keeps the ${st.streak || 0}-day streak alive and builds momentum.`, actionLabel: null })
        }
        if (st.mastered > 0) {
          items.push({ type: 'low', title: `${st.mastered} skill${st.mastered === 1 ? '' : 's'} mastered`, description: 'Great milestone! Mastered skills mean your child has reached 80%+ on them.', actionLabel: null })
        }
        setInsights(items)
        setInsightsSource(data.insight ? 'ai' : 'rules')
      }
    } catch (e) {
      console.error('Failed to load insights:', e)
    } finally {
      setInsightsLoading(false)
    }
  }

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

  async function sendReport() {
    const parentId = parentData?.id
    const studentId = childData?.id
    if (!parentId || !studentId) { setReportMsg('Sign in as a parent to email reports.'); return }
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

  // ── Loading splash (matches teacher dashboard) ──────────────────────────────
  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <img src="/assets/logos/logo-icon.png" alt="MyMathsHero" style={{ width: 80, animation: 'pulse 1.5s infinite' }} />
        <p style={{ color: '#1B2B4B', fontWeight: 600 }}>Loading your dashboard...</p>
      </div>
    )
  }

  // ── Registration / onboarding flow (unauthenticated) ────────────────────────
  if (step === 'landing' || step === 'register' || step === 'addChild' || step === 'childCreated') {
    return (
      <div className="min-h-screen bg-offwhite">
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
      </div>
    )
  }

  // ── DASHBOARD (mirrors teacher dashboard layout) ────────────────────────────
  const student = progress?.student
  const stats = progress?.stats || {}
  const weeklyActivity = progress?.weeklyActivity || []
  const skillTree = progress?.skillTree || []
  const mathsSkills = skillTree.filter(s => s.subject === 'Maths' || s.subject === 'Mathematics')

  const totalQuestionsThisWeek = stats.totalQuestionsThisWeek ?? weeklyActivity.reduce((s, d) => s + d.questions, 0)
  const accuracy = stats.accuracy ?? 0
  const mastered = stats.mastered ?? 0
  const streak = student?.streak ?? childData?.streak ?? 0
  const childName = student?.name || childData?.name || 'Your Child'
  const childGrade = student?.grade ?? childData?.grade ?? 3

  const scoredSkills = mathsSkills.filter(s => s.score > 0)
  const childAvg = scoredSkills.length > 0
    ? Math.round(scoredSkills.reduce((a, s) => a + s.score, 0) / scoredSkills.length)
    : 0

  // Overview cards — same component/colour set as the teacher dashboard.
  const overviewCards = [
    { label: 'Skills Mastered', value: String(mastered), change: 'total', changeLabel: 'reached 80%+', icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', positive: true },
    { label: 'Overall Accuracy', value: `${accuracy}%`, change: 'this week', changeLabel: 'of answers correct', icon: Target, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', positive: accuracy >= 50 },
    { label: 'Questions This Week', value: String(totalQuestionsThisWeek), change: 'activity', changeLabel: 'answered in 7 days', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', positive: true },
    { label: 'Current Streak', value: `${streak}🔥`, change: 'days', changeLabel: 'keep it going', icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', positive: streak > 0 },
  ]

  const maxWeekly = Math.max(...weeklyActivity.map(d => d.questions), 1)

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <style jsx global>{`
        @keyframes feed-in { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.5); } }
        .feed-in { animation: feed-in 0.4s ease-out forwards; }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-[#1B2B4B]">Parent Hub — MyMathsHero</h1>
              <p className="text-xs text-gray-500 mt-0.5">{childName} &middot; Grade {childGrade} &middot; {children.length || 1} child{(children.length || 1) === 1 ? '' : 'ren'}</p>
            </div>
            <div className="flex items-center gap-2">
              {children.length > 1 && (
                <select
                  value={childData?.id || ''}
                  onChange={e => setChildData(children.find(c => c.id === e.target.value))}
                  className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-electric"
                >
                  {children.map(c => <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
                </select>
              )}
              <a href="/student-dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
                <Eye size={13} />Child View
              </a>
              <button onClick={sendReport} disabled={reportSending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C49A1A] text-white text-xs font-medium hover:bg-[#1B2B4B] disabled:opacity-50 transition-colors">
                <Download size={13} />{reportSending ? 'Sending…' : 'Hero Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#C49A1A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading {childName}&apos;s progress…</p>
        </div>
      ) : (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Child Card (mirrors My Classes header strip) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-electric" />
              <h2 className="font-semibold text-navy text-sm">My Child</h2>
            </div>
            <button onClick={() => setStep('addChild')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B2B4B] text-white text-xs font-medium hover:bg-[#C49A1A] transition-colors">
              <Plus size={12} /> Add Child
            </button>
          </div>
          <div className="flex gap-2 p-3 overflow-x-auto">
            {(children.length > 0 ? children : [childData].filter(Boolean)).map(c => (
              <button
                key={c.id}
                onClick={() => setChildData(c)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-left border transition-all min-w-[160px] ${
                  childData?.id === c.id
                    ? 'bg-[#1B2B4B] text-white border-[#C49A1A] shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-[#C49A1A]/60'
                }`}
              >
                <span className="text-xl">{c.avatar || '🦊'}</span>
                <div className="leading-tight">
                  <span className="font-semibold text-xs block">{c.name}</span>
                  <span className={`text-[10px] ${childData?.id === c.id ? 'text-white/80' : 'text-gray-400'}`}>Grade {c.grade}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {overviewCards.map((card, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 border ${card.border} hover:shadow-sm transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{card.label}</span>
                <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon size={14} className={card.color} />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-navy">{card.value}</span>
                <span className={`text-xs font-semibold mb-0.5 flex items-center gap-0.5 ${card.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {card.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.change}
                </span>
              </div>
              <span className="text-[10px] text-gray-400">{card.changeLabel}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Skill Heatmap */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-electric" />
                  <h2 className="font-semibold text-navy text-sm">{childName}&apos;s Skill Heatmap</h2>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(22,163,74,0.25)' }} /> 80+</span>
                  <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(22,163,74,0.12)' }} /> 60+</span>
                  <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(217,119,6,0.15)' }} /> 40+</span>
                  <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(220,38,38,0.2)' }} /> &lt;40</span>
                </div>
              </div>

              {mathsSkills.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No skill data yet — once {childName} starts practising, progress appears here.</p>
                </div>
              ) : (
                <>
                  {/* Per-skill rows (same bar style as teacher's skill breakdown) */}
                  <div className="p-4 space-y-2.5">
                    {mathsSkills.map((skill) => {
                      const cellStyle = getCellStyle(skill.score || 0)
                      return (
                        <div key={skill.id} className="flex items-center gap-3">
                          <div className="w-[150px] text-xs font-medium text-gray-600 truncate flex items-center gap-1.5">
                            <span>{skill.name}</span>
                            {skill.status === 'mastered' && <Trophy size={11} className="text-emerald-500 flex-shrink-0" />}
                          </div>
                          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
                            <div className="h-full rounded transition-all duration-700" style={{ width: `${skill.score}%`, backgroundColor: cellStyle.bg.replace(/[\d.]+\)$/, '0.6)') }} />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: cellStyle.text }}>
                              {skill.score > 0 ? skill.score : '—'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Average row (mirrors teacher "Class Avg" row) */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-navy/[0.03] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Overall Average</span>
                    <span className={`text-sm font-bold ${childAvg >= 70 ? 'text-emerald-700' : childAvg >= 50 ? 'text-amber-700' : childAvg > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                      {childAvg > 0 ? childAvg : '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Weekly Activity (extra parent card, same card chrome) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Activity size={15} className="text-electric" />
                <h2 className="font-semibold text-navy text-sm">Weekly Activity</h2>
              </div>
              <div className="p-4">
                {weeklyActivity.some(d => d.questions > 0) ? (
                  <div className="flex items-end gap-2 h-28">
                    {weeklyActivity.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t min-h-[3px]" style={{
                          height: `${(d.questions / maxWeekly) * 88}px`,
                          background: d.questions >= 10 ? '#16a34a' : d.questions >= 5 ? '#C49A1A' : d.questions > 0 ? '#60a5fa' : '#e5e7eb',
                        }} title={`${d.questions} questions · ${d.correct} correct`} />
                        <span className="text-[9px] text-gray-400 font-medium">{d.day?.charAt(0)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">No activity recorded this week yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* AI Insights (mirrors teacher AI Insights panel exactly) */}
          <div className="w-full xl:w-[340px] flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-blue-50/50">
                <div className="flex items-center gap-2">
                  <Brain size={15} className="text-electric" />
                  <h2 className="font-semibold text-navy text-sm">AI Insights</h2>
                  {insightsSource && (
                    <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {insightsSource === 'ai' ? '✨ Hero' : '📋 Rules'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fetchInsights(childData?.id || DEMO_STUDENT_ID, parentData?.id, false)}
                  disabled={insightsLoading}
                  className="text-[10px] text-electric font-semibold px-2 py-1 rounded-lg hover:bg-electric/5 disabled:opacity-40 transition-all"
                >
                  {insightsLoading ? '…' : '↻ Refresh'}
                </button>
              </div>

              {insightsLoading && insights.length === 0 ? (
                <div className="divide-y divide-gray-50">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="px-4 py-3.5 animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-gray-200 mt-1 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-2.5 bg-gray-200 rounded w-16" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                          <div className="h-2.5 bg-gray-100 rounded w-full" />
                          <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {insights.map((insight, i) => {
                    const style = getInsightStyle(insight.type)
                    return (
                      <div key={i} className="px-4 py-3.5 hover:bg-gray-50/50 transition-all feed-in" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center pt-1 flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full ${style.dot} ${i === 0 ? 'pulse-dot' : ''}`} />
                            {i < insights.length - 1 && <div className="w-px h-full bg-gray-100 mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
                            </div>
                            <h4 className="font-semibold text-navy text-[13px] leading-snug mb-1">{insight.title}</h4>
                            <p className="text-gray-500 text-[11px] leading-relaxed mb-2">{insight.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {insights.length === 0 && !insightsLoading && (
                    <div className="px-4 py-8 text-center text-xs text-gray-400">No insights yet — once your child practises, Hero will share insights</div>
                  )}
                </div>
              )}

              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{insights.length} insight{insights.length !== 1 ? 's' : ''}</span>
                {insightsLoading && <span className="text-[10px] text-electric animate-pulse">Analysing {childName}&apos;s data…</span>}
              </div>
            </div>

            {/* Recent Sessions (mirrors teacher's secondary list) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Activity size={15} className="text-electric" />
                <h2 className="font-semibold text-navy text-sm">Recent Sessions</h2>
              </div>
              {weeklyActivity.some(d => d.questions > 0) ? (
                <div className="divide-y divide-gray-50">
                  {weeklyActivity.filter(d => d.questions > 0).slice(-5).reverse().map((d, i) => {
                    const acc = d.questions > 0 ? Math.round((d.correct / d.questions) * 100) : 0
                    return (
                      <div key={i} className="px-4 py-3 flex items-center justify-between">
                        <span className="font-medium text-navy text-xs">{d.day}</span>
                        <span className="text-[11px] text-gray-500">{d.questions} questions · {acc}% correct</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-gray-400">No sessions logged this week</div>
              )}
            </div>

            {reportMsg && (
              <p className="text-[11px] text-navy font-medium mt-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                {reportMsg}{lastReportSent ? ` · ${lastReportSent.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Account Settings Sidebar (mirrors teacher's student detail sidebar) */}
      {showSidebar && (
        <div className="fixed inset-0 z-[100] flex justify-end" onClick={() => setShowSidebar(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-[420px] bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between z-10">
              <h3 className="font-semibold text-navy text-sm">Account Settings</h3>
              <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Name</p>
                <p className="text-sm font-bold text-navy">{parentData?.name || 'Not available'}</p>
              </div>
              {parentData?.email && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Email</p>
                  <p className="text-sm font-bold text-navy">{parentData.email}</p>
                </div>
              )}
              <button onClick={() => setStep('addChild')} className="w-full bg-[#C49A1A] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#1B2B4B] transition-colors">Add Another Child</button>
              <button onClick={() => { fetch('/api/auth/logout', { method: 'POST' }).then(() => { window.location.href = '/login' }) }} className="w-full bg-[#1B2B4B] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#C49A1A] transition-colors">Log out</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings launcher (floating, like teacher's affordances) */}
      {step === 'dashboard' && !loading && (
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#1B2B4B] text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-[#C49A1A] transition-colors text-xs font-semibold"
        >
          <User size={14} /> Account
        </button>
      )}
    </div>
  )
}
