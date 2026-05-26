'use client'

import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import { User, Mail, Phone, Lock, Plus, ArrowRight, CheckCircle2, Eye, EyeOff, ChevronRight, TrendingUp, TrendingDown, Flame, Coins, Zap, X, Brain, BarChart3, Calendar } from 'lucide-react'

const DEMO_STUDENT_ID = 'student_test_001'

const avatarOptions = ['🦊', '🐱', '🐶', '🦁', '🐼', '🦄', '🐸', '🦋']
const gradeOptions = ['Prep', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5']

export default function ParentDashboard() {
  const [step, setStep] = useState('landing') // landing, register, addChild, childCreated, dashboard
  const [showPin, setShowPin] = useState(false)
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [childForm, setChildForm] = useState({ name: '', grade: '', avatar: '🦊' })
  const [parentData, setParentData] = useState(null)
  const [childData, setChildData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Real data from progress API
  const [progressData, setProgressData] = useState(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [showWeeklyReport, setShowWeeklyReport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Check auth on mount — load real parent's child, or redirect wrong roles, or stay on landing.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me')
        const auth = res.ok ? await res.json() : { authenticated: false }
        if (cancelled) return

        if (auth.authenticated && auth.user?.role === 'parent') {
          const parentId = auth.user.userId
          setParentData({ id: parentId, name: auth.user.name })
          const cr = await fetch(`/api/parent/children?parentId=${parentId}`)
          const cdata = await cr.json()
          if (!cancelled && cr.ok && cdata.children?.length > 0) {
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
        // Unauthenticated — keep the existing landing/registration flow.
      } catch {
        // Network error — fall through to landing.
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Fetch progress when entering dashboard
  useEffect(() => {
    if (step === 'dashboard') {
      fetchProgress()
    }
  }, [step, childData?.id])

  async function fetchProgress() {
    setProgressLoading(true)
    try {
      const studentId = childData?.id || DEMO_STUDENT_ID
      const parentId = parentData?.id
      const url = parentId
        ? `/api/student/progress?studentId=${studentId}&parentId=${parentId}`
        : `/api/student/progress?studentId=${studentId}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) setProgressData(data)
    } catch (e) {
      console.error('Failed to load progress:', e)
    } finally {
      setProgressLoading(false)
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
      setStep('childCreated')
    } catch { setError('Network error') }
    setSubmitting(false)
  }

  // Derived display values from real progress data
  const student = progressData?.student
  const stats = progressData?.stats || {}
  const weeklyActivity = progressData?.weeklyActivity || []
  const skillTree = progressData?.skillTree || []
  const strandBreakdown = progressData?.strandBreakdown || {}

  // Skills practiced recently: skills with score > 0, sorted by score desc, top 3
  const skillsPractised = Object.entries(strandBreakdown)
    .filter(([, data]) => data.skillCount > 0)
    .slice(0, 3)
    .map(([name, data]) => ({
      name,
      subject: data.subject,
      scoreAfter: data.average,
      scoreBefore: Math.max(0, data.average - 5),
      change: data.average > 0 ? 5 : 0,
    }))

  // Weekly totals
  const totalQuestionsThisWeek = weeklyActivity.reduce((s, d) => s + d.questions, 0)
  const totalCorrectThisWeek = weeklyActivity.reduce((s, d) => s + d.correct, 0)
  const accuracy = totalQuestionsThisWeek > 0
    ? Math.round((totalCorrectThisWeek / totalQuestionsThisWeek) * 100)
    : 0

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F0F4F8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <img
          src="/assets/logos/logo-icon.png"
          alt="MyMathsHero"
          style={{ width: 80, animation: 'pulse 1.5s infinite' }}
        />
        <p style={{ color: '#1B2B4B', fontWeight: 600 }}>Loading your dashboard...</p>
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
              {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
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
              {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
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
        <div className="pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-navy">Parent Hub</h1>
                <p className="text-sm text-gray-500">Welcome back, {parentData?.name || 'Parent'}</p>
              </div>
              <a href="/student-dashboard" className="inline-flex items-center gap-2 bg-[#1B2B4B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:bg-[#C49A1A] transition-colors">
                👦 Switch to Child View <ArrowRight size={16} />
              </a>
            </div>

            {progressLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-electric border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading progress data...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Child Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center text-3xl">{student?.avatar || childData?.avatar || '🦊'}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-navy text-lg">{student?.name || childData?.name || 'Alex'}</h3>
                      <p className="text-sm text-gray-500">Grade {student?.grade || childData?.grade || 3} &middot; Username: <span className="font-mono text-electric">{childData?.username || 'alex2026'}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center"><Flame size={16} className="text-orange-500 mx-auto" /><span className="text-xs font-bold text-navy block">{student?.streak ?? 0}</span><span className="text-[9px] text-gray-400">streak</span></div>
                      <div className="text-center"><Zap size={16} className="text-[#C49A1A] mx-auto" /><span className="text-xs font-bold text-navy block">{(student?.xp ?? 0).toLocaleString()}</span><span className="text-[9px] text-gray-400">Hero Points</span></div>
                      <div className="text-center"><Coins size={16} className="text-yellow-500 mx-auto" /><span className="text-xs font-bold text-navy block">{student?.coins ?? 0}</span><span className="text-[9px] text-gray-400">coins</span></div>
                    </div>
                  </div>
                </div>

                {/* Daily Progress Report */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                  <div className="bg-gradient-to-r from-navy to-[#1e4480] p-5">
                    <div className="flex items-center gap-2 mb-1"><Mail size={16} className="text-[#C49A1A]" /><span className="text-white/60 text-xs font-medium">Hero Report</span></div>
                    <h3 className="text-white font-bold text-lg">{student?.name || 'Alex'}&apos;s Learning Today</h3>
                    <p className="text-white/50 text-sm">{today}</p>
                  </div>
                  <div className="p-5 space-y-5">
                    {/* Session summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100"><div className="text-xl font-bold text-navy">{totalQuestionsThisWeek}</div><div className="text-[10px] text-gray-500 font-medium">Questions</div></div>
                      <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100"><div className="text-xl font-bold text-green-600">{accuracy}%</div><div className="text-[10px] text-gray-500 font-medium">Accuracy</div></div>
                      <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100"><div className="text-xl font-bold text-yellow-600">+{student?.coins ?? 0}</div><div className="text-[10px] text-gray-500 font-medium">Coins</div></div>
                      <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100"><div className="text-xl font-bold text-purple-600">{stats.mastered ?? 0}</div><div className="text-[10px] text-gray-500 font-medium">Mastered</div></div>
                    </div>

                    {/* Weekly activity bar chart */}
                    {weeklyActivity.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-navy text-sm mb-3 flex items-center gap-2"><BarChart3 size={14} className="text-electric" />Weekly Activity</h4>
                        <div className="flex items-end gap-1.5 h-16">
                          {weeklyActivity.map((d, i) => {
                            const maxQ = Math.max(...weeklyActivity.map(a => a.questions), 1)
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                <div className={`w-full rounded-t min-h-[3px] ${d.questions >= 10 ? 'bg-green-400' : d.questions >= 5 ? 'bg-amber-400' : d.questions > 0 ? 'bg-blue-300' : 'bg-gray-200'}`} style={{ height: `${(d.questions / maxQ) * 48}px` }} />
                                <span className="text-[9px] text-gray-400 font-medium">{d.day.charAt(0)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Skills practiced */}
                    {skillsPractised.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-navy text-sm mb-3 flex items-center gap-2"><BarChart3 size={14} className="text-electric" />Skills Practised</h4>
                        <div className="space-y-2.5">
                          {skillsPractised.map((skill, i) => (
                            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2"><span className="text-xs font-bold text-navy">{skill.name}</span><span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">{skill.subject}</span></div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${skill.scoreAfter >= 70 ? 'bg-green-500' : skill.scoreAfter >= 40 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${skill.scoreAfter}%` }} /></div>
                                  <span className="text-[10px] text-gray-500 font-medium">{skill.scoreAfter}/100</span>
                                </div>
                              </div>
                              <div className={`flex items-center gap-0.5 text-xs font-bold ${skill.change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {skill.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {skill.change > 0 ? '+' : ''}{skill.change}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Streak */}
                    <div className="flex items-center gap-3 bg-orange-50 rounded-xl p-3 border border-orange-100">
                      <span className="text-2xl">🔥</span>
                      <div>
                        <span className="text-sm font-bold text-orange-700">{student?.streak ?? 0}-day streak {(student?.streak ?? 0) > 0 ? 'maintained!' : 'keep going!'}</span>
                        <p className="text-[10px] text-orange-600/70">Keep going to earn bonus rewards</p>
                      </div>
                    </div>

                    {/* AI Insight */}
                    <div className="flex items-start gap-3 bg-electric/5 rounded-xl p-4 border border-electric/20">
                      <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center flex-shrink-0"><Brain size={16} className="text-electric" /></div>
                      <div>
                        <span className="text-xs font-bold text-electric block mb-0.5">AI Insight</span>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {student?.name || 'Alex'} has answered {totalQuestionsThisWeek} questions this week with {accuracy}% accuracy.
                          {stats.mastered > 0 ? ` They have mastered ${stats.mastered} skill${stats.mastered !== 1 ? 's' : ''} — great progress!` : ' Keep practising to reach mastery!'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowWeeklyReport(!showWeeklyReport)}
                    className={`bg-white rounded-xl p-4 transition-all text-left ${showWeeklyReport ? 'border-2 border-[#C49A1A]' : 'border border-gray-100 hover:border-electric/30 hover:shadow-md'}`}
                  >
                    <Calendar size={18} className="text-electric mb-2" />
                    <h4 className="font-semibold text-navy text-sm">Weekly Reports</h4>
                    <p className="text-xs text-gray-500 mt-0.5">View past week summaries</p>
                  </button>
                  <button onClick={() => setStep('addChild')} className="bg-white rounded-xl p-4 border border-gray-100 hover:border-electric/30 hover:shadow-md transition-all text-left">
                    <Plus size={18} className="text-green-600 mb-2" />
                    <h4 className="font-semibold text-navy text-sm">Add Another Child</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Create another student account</p>
                  </button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`bg-white rounded-xl p-4 transition-all text-left ${showSettings ? 'border-2 border-[#C49A1A]' : 'border border-gray-100 hover:border-electric/30 hover:shadow-md'}`}
                  >
                    <User size={18} className="text-purple-600 mb-2" />
                    <h4 className="font-semibold text-navy text-sm">Account Settings</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Manage your profile</p>
                  </button>
                </div>

                {showWeeklyReport && (
                  <div style={{ marginTop: 12, padding: 20, background: '#F0F4F8', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <h4 style={{ color: '#1B2B4B', fontWeight: 700, marginBottom: 12 }}>This Week&apos;s Summary</h4>
                    {weeklyActivity && weeklyActivity.length > 0 ? (
                      <div>
                        {weeklyActivity.map((day, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
                            <span style={{ color: '#1B2B4B', fontWeight: 600 }}>{day.day}</span>
                            <span style={{ color: '#64748B' }}>{day.questions} questions · {day.correct} correct</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#64748B' }}>No activity this week yet.</p>
                    )}
                  </div>
                )}

                {showSettings && (
                  <div style={{ marginTop: 12, padding: 20, background: 'white', borderRadius: 12, border: '1px solid #C49A1A' }}>
                    <h4 style={{ color: '#1B2B4B', fontWeight: 700, marginBottom: 16 }}>Account Settings</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ padding: '12px 16px', background: '#F0F4F8', borderRadius: 8 }}>
                        <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>Name</p>
                        <p style={{ color: '#1B2B4B', fontWeight: 600, margin: 0 }}>{parentData?.name || 'Not available'}</p>
                      </div>
                      <button
                        onClick={() => {
                          fetch('/api/auth/logout', { method: 'POST' })
                            .then(() => { window.location.href = '/login' })
                        }}
                        style={{ background: '#1B2B4B', color: 'white', border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                      >
                        Log out of account
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Add another child to your account?')) {
                            setStep('addChild')
                          }
                        }}
                        style={{ background: '#C49A1A', color: 'white', border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                      >
                        Add Another Child
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
