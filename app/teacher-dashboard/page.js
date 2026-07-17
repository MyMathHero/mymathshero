'use client'

import { useState, useEffect } from 'react'
import CharacterAvatar from '@/components/CharacterAvatar'
import { isCharacterId } from '@/lib/characterAvatars'
import { Users, TrendingDown, Activity, Brain, AlertTriangle, CheckCircle2, ChevronRight, X, Star, Flame, Trophy, Target, BookOpen, BarChart3, TrendingUp, Clock, Zap, ArrowUpRight, ArrowDownRight, Minus, Radio, Filter, Download, Plus, Copy, Check, GraduationCap } from 'lucide-react'

// teacherId now comes from /api/auth/me. Demo fallback kept for unauthenticated previews.
const DEMO_TEACHER_ID = 'teacher_seed_001'

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

function getInsightStyle(type) {
  switch (type) {
    case 'high':   return { dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700',       label: 'HIGH' }
    case 'medium': return { dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700',   label: 'MED' }
    case 'low':    return { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'LOW' }
    // legacy types
    case 'critical': return { dot: 'bg-red-500',   badge: 'bg-red-100 text-red-700',       label: 'HIGH' }
    case 'alert':    return { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700',   label: 'MED' }
    case 'positive': return { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'LOW' }
    default:         return { dot: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700',     label: 'INFO' }
  }
}

export default function TeacherDashboard() {
  const [teacherId, setTeacherId] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authError, setAuthError] = useState(null) // 'not_logged_in' | 'wrong_role'
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [heatmapSkills, setHeatmapSkills] = useState([])
  const [overview, setOverview] = useState({ totalMastered: 0, atRisk: 0, activeTodayCount: 0, totalStudents: 0, avgSmartScore: 0 })
  const [showSidebar, setShowSidebar] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [insights, setInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsSource, setInsightsSource] = useState(null)
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null) // null = all classes
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ className: '', grade: '', year: new Date().getFullYear() })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)

  // Resolve teacherId from cookie session — redirect other roles to their dashboards.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me')
        const auth = r.ok ? await r.json() : { authenticated: false }

        if (auth.authenticated && auth.user?.role === 'teacher') {
          setTeacherId(auth.user.userId)
        } else if (auth.authenticated && auth.user?.role === 'student') {
          window.location.href = '/student-dashboard'
          return
        } else if (auth.authenticated && auth.user?.role === 'parent') {
          window.location.href = '/parent-dashboard'
          return
        } else {
          // Unauthenticated — demo data for marketing preview.
          setAuthError('not_logged_in')
          setTeacherId(DEMO_TEACHER_ID)
        }
      } catch {
        setAuthError('not_logged_in')
        setTeacherId(DEMO_TEACHER_ID)
      } finally {
        setAuthChecked(true)
      }
    })()
  }, [])

  useEffect(() => {
    if (teacherId) fetchClasses()
  }, [teacherId])

  async function fetchClasses() {
    try {
      const res = await fetch(`/api/teacher/classes?teacherId=${teacherId}`)
      const data = await res.json()
      if (res.ok) setClasses(data.classes || [])
    } catch (e) {
      console.error('Failed to load classes:', e)
    }
  }

  async function fetchClassData(classId) {
    if (!teacherId) return
    setLoading(true)
    try {
      const param = classId ? `classId=${classId}` : `teacherId=${teacherId}`
      const res = await fetch(`/api/teacher/class?${param}`)
      const data = await res.json()
      if (!res.ok) return
      const studentData = data.students || []
      setStudents(studentData)
      setHeatmapSkills(data.heatmapSkills || [])
      setOverview(data.overview || {})
      fetchInsights(studentData, false)
    } catch (e) {
      console.error('Failed to load class data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (teacherId) fetchClassData(selectedClassId)
  }, [selectedClassId, teacherId])

  async function handleCreateClass() {
    setCreateError('')
    if (!createForm.className.trim()) return setCreateError('Class name is required')
    if (!createForm.grade) return setCreateError('Grade is required')
    setCreating(true)
    try {
      const res = await fetch('/api/teacher/create-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, ...createForm, grade: Number(createForm.grade) }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Failed to create class'); return }
      setClasses(prev => [data.class, ...prev])
      setSelectedClassId(data.class.id)
      setShowCreateModal(false)
      setCreateForm({ className: '', grade: '', year: new Date().getFullYear() })
    } catch (e) {
      setCreateError('Network error')
    } finally {
      setCreating(false)
    }
  }

  function copyJoinCode(code) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  async function fetchInsights(studentData, forceRefresh = false) {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/teacher/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          classData: { students: studentData },
          forceRefresh,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights || [])
        setInsightsSource(data.source || null)
      }
    } catch (e) {
      console.error('Failed to load insights:', e)
    } finally {
      setInsightsLoading(false)
    }
  }

  const handleStudentClick = (student) => {
    setSelectedStudent(student)
    setShowSidebar(true)
  }

  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'avg-asc') return a.avg - b.avg
    if (sortBy === 'avg-desc') return b.avg - a.avg
    if (sortBy === 'risk') return a.avg - b.avg
    return a.name.localeCompare(b.name)
  })

  const skillKeys = heatmapSkills.map(s => s.key)
  const skillsFull = heatmapSkills.map(s => s.full || s.key)

  // Class average per column
  const classAvg = skillKeys.map((_, colIdx) => {
    const nonZero = students.filter(s => s.scores[colIdx] > 0)
    if (nonZero.length === 0) return 0
    return Math.round(nonZero.reduce((acc, s) => acc + s.scores[colIdx], 0) / nonZero.length)
  })

  const overviewCards = [
    { label: 'Skills Mastered', value: String(overview.totalMastered), change: 'total', changeLabel: 'across all students', icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', positive: true },
    { label: 'At-Risk Students', value: String(overview.atRisk), change: 'avg < 50', changeLabel: 'needs attention', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', positive: false },
    { label: 'Active Today', value: `${overview.activeTodayCount}/${overview.totalStudents}`, change: overview.totalStudents > 0 ? `${Math.round((overview.activeTodayCount / overview.totalStudents) * 100)}%` : '0%', changeLabel: 'participation', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', positive: true },
    { label: 'Avg SmartScore', value: String(overview.avgSmartScore), change: 'class avg', changeLabel: 'across all skills', icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', positive: true },
  ]

  if (!authChecked || loading) {
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
          src="/assets/logos/logo-icon.png?v=2"
          alt="MyMathsHero"
          style={{ width: 80, animation: 'pulse 1.5s infinite' }}
        />
        <p style={{ color: '#1B2B4B', fontWeight: 600 }}>Loading your dashboard...</p>
      </div>
    )
  }

  if (authError === 'wrong_role') {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] max-w-md text-center shadow-sm">
          <h2 className="text-xl font-bold text-[#1B2B4B] mb-2">Please log in as a teacher</h2>
          <p className="text-sm text-[#64748B] mb-4">This dashboard requires a teacher account.</p>
          <a href="/login" className="inline-block bg-[#1B2B4B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#C49A1A] transition-colors">Go to login</a>
        </div>
      </div>
    )
  }

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
              <h1 className="text-lg font-bold text-[#1B2B4B]">Teacher Hub — MyMathsHero</h1>
              <p className="text-xs text-gray-500 mt-0.5">Year 3 &middot; {overview.totalStudents} students &middot; Term 2, Week 8</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
                <Download size={13} />Export
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C49A1A] text-white text-xs font-medium hover:bg-[#1B2B4B] transition-colors">
                <Users size={13} />{overview.totalStudents} Students
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* My Classes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={15} className="text-electric" />
              <h2 className="font-semibold text-navy text-sm">My Classes</h2>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{classes.length}</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B2B4B] text-white text-xs font-medium hover:bg-[#C49A1A] transition-colors"
            >
              <Plus size={12} /> New Class
            </button>
          </div>
          <div className="flex gap-2 p-3 overflow-x-auto">
            {/* All Classes tab */}
            <button
              onClick={() => setSelectedClassId(null)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                selectedClassId === null
                  ? 'bg-[#1B2B4B] text-white border-[#C49A1A] shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#C49A1A]/60 hover:text-[#C49A1A]'
              }`}
            >
              All Classes
            </button>
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-lg text-left border transition-all min-w-[160px] ${
                  selectedClassId === cls.id
                    ? 'bg-[#1B2B4B] text-white border-[#C49A1A] shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-[#C49A1A]/60'
                }`}
              >
                <span className="font-semibold text-xs truncate w-full">{cls.className}</span>
                <div className={`flex items-center justify-between w-full mt-1 gap-2 text-[10px] ${selectedClassId === cls.id ? 'text-white/80' : 'text-gray-400'}`}>
                  <span>Gr {cls.grade} · {cls.studentCount} students</span>
                  <button
                    onClick={e => { e.stopPropagation(); copyJoinCode(cls.joinCode) }}
                    className={`flex items-center gap-0.5 font-mono font-bold px-1.5 py-0.5 rounded ${
                      selectedClassId === cls.id ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-200 hover:bg-gray-300'
                    } transition-colors`}
                    title="Copy join code"
                  >
                    {copiedCode === cls.joinCode
                      ? <><Check size={9} /> Copied</>
                      : <><Copy size={9} /> {cls.joinCode}</>
                    }
                  </button>
                </div>
              </button>
            ))}
            {classes.length === 0 && (
              <p className="text-xs text-gray-400 px-2 py-2">No classes yet — create your first class to get started.</p>
            )}
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
          {/* Heatmap */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-electric" />
                  <h2 className="font-semibold text-navy text-sm">Class Skill Heatmap</h2>
                  <span className="text-[10px] text-gray-400 ml-1 hidden sm:inline">Click row to drill down</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-2 text-[10px] text-gray-500 mr-2">
                    <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(22,163,74,0.25)' }} /> 80+</span>
                    <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(22,163,74,0.12)' }} /> 60+</span>
                    <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(217,119,6,0.15)' }} /> 40+</span>
                    <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(220,38,38,0.2)' }} /> &lt;40</span>
                  </div>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-[11px] border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-electric">
                    <option value="name">Sort: A-Z</option>
                    <option value="avg-asc">Sort: Lowest Avg</option>
                    <option value="avg-desc">Sort: Highest Avg</option>
                    <option value="risk">Sort: At-Risk First</option>
                  </select>
                </div>
              </div>

              {students.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Users size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No students found. Run the seed endpoint to add test data.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2 px-3 font-semibold text-gray-500 text-[10px] uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[140px] border-b border-gray-100">Student</th>
                        {skillKeys.map((s, idx) => (
                          <th key={s} className="py-2 px-1 font-semibold text-gray-500 text-center text-[10px] uppercase tracking-wider min-w-[52px] border-b border-gray-100" title={skillsFull[idx]}>{s}</th>
                        ))}
                        <th className="py-2 px-2 font-semibold text-gray-500 text-center text-[10px] uppercase tracking-wider border-b border-gray-100 border-l border-gray-100 min-w-[44px]">Avg</th>
                        <th className="py-2 px-2 font-semibold text-gray-500 text-center text-[10px] uppercase tracking-wider border-b border-gray-100 min-w-[32px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.map((student, i) => (
                        <tr key={student.id || i} className="group hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => handleStudentClick(student)}>
                          <td className="py-1.5 px-3 sticky left-0 bg-white group-hover:bg-blue-50/50 z-10 border-b border-gray-50">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold ${student.avg < 45 && student.avg > 0 ? 'bg-red-100 text-red-700' : student.avg >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {student.initials}
                              </div>
                              <div className="leading-none">
                                <span className="font-medium text-navy text-xs block">{student.name}</span>
                                <span className="text-[9px] text-gray-400">{student.lastActive}</span>
                              </div>
                            </div>
                          </td>
                          {student.scores.map((score, j) => {
                            const style = getCellStyle(score)
                            return (
                              <td key={j} className="py-1.5 px-1 text-center border-b border-gray-50">
                                <div className="inline-flex items-center justify-center w-10 h-6 rounded-md text-[11px] transition-all group-hover:scale-105" style={{ backgroundColor: style.bg, color: style.text, fontWeight: style.fontWeight }}>
                                  {score > 0 ? score : '—'}
                                </div>
                              </td>
                            )
                          })}
                          <td className="py-1.5 px-2 text-center border-b border-gray-50 border-l border-gray-100">
                            <span className={`text-[11px] font-bold ${student.avg >= 70 ? 'text-emerald-700' : student.avg >= 50 ? 'text-amber-700' : student.avg > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                              {student.avg > 0 ? student.avg : '—'}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center border-b border-gray-50">
                            {student.avg >= 70 && <ArrowUpRight size={13} className="text-emerald-500 mx-auto" />}
                            {student.avg > 0 && student.avg < 50 && <ArrowDownRight size={13} className="text-red-500 mx-auto" />}
                            {student.avg >= 50 && student.avg < 70 && <Minus size={13} className="text-gray-400 mx-auto" />}
                            {student.avg === 0 && <Minus size={13} className="text-gray-300 mx-auto" />}
                          </td>
                        </tr>
                      ))}
                      {/* Class Average Row */}
                      <tr className="bg-navy/[0.03]">
                        <td className="py-2 px-3 sticky left-0 bg-gray-50/80 z-10">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Class Avg</span>
                        </td>
                        {classAvg.map((avg, j) => {
                          const style = getCellStyle(avg)
                          return (
                            <td key={j} className="py-2 px-1 text-center">
                              <div className="inline-flex items-center justify-center w-10 h-6 rounded-md text-[11px]" style={{ backgroundColor: style.bg, color: style.text, fontWeight: 700 }}>
                                {avg > 0 ? avg : '—'}
                              </div>
                            </td>
                          )
                        })}
                        <td className="py-2 px-2 text-center border-l border-gray-100">
                          <span className="text-[11px] font-bold text-navy">
                            {classAvg.filter(a => a > 0).length > 0
                              ? Math.round(classAvg.filter(a => a > 0).reduce((a, b) => a + b, 0) / classAvg.filter(a => a > 0).length)
                              : '—'}
                          </span>
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights */}
          <div className="w-full xl:w-[340px] flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-blue-50/50">
                <div className="flex items-center gap-2">
                  <Brain size={15} className="text-electric" />
                  <h2 className="font-semibold text-navy text-sm">AI Insights</h2>
                  {insightsSource && (
                    <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {insightsSource === 'ai' ? '✨ Claude' : '📋 Rules'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fetchInsights(students, true)}
                  disabled={insightsLoading}
                  className="text-[10px] text-electric font-semibold px-2 py-1 rounded-lg hover:bg-electric/5 disabled:opacity-40 transition-all"
                >
                  {insightsLoading ? '…' : '↻ Refresh'}
                </button>
              </div>

              {insightsLoading && insights.length === 0 ? (
                /* Loading skeleton */
                <div className="divide-y divide-gray-50">
                  {[0, 1, 2, 3].map(i => (
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
                            {(insight.actionLabel || insight.action) && (
                              <button className="text-electric text-[11px] font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
                                {insight.actionLabel || insight.action} <ChevronRight size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {insights.length === 0 && !insightsLoading && (
                    <div className="px-4 py-8 text-center text-xs text-gray-400">No insights yet — add students to get started</div>
                  )}
                </div>
              )}

              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{insights.length} insight{insights.length !== 1 ? 's' : ''}</span>
                {insightsLoading && <span className="text-[10px] text-electric animate-pulse">Analysing class data…</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Detail Sidebar */}
      {showSidebar && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex justify-end" onClick={() => setShowSidebar(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-[420px] bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between z-10">
              <h3 className="font-semibold text-navy text-sm">Student Profile</h3>
              <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5">
              {/* Student Info */}
              <div className="flex items-center gap-3 mb-5">
                {isCharacterId(selectedStudent.avatar) ? (
                  <CharacterAvatar id={selectedStudent.avatar} size={48} />
                ) : (
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${selectedStudent.avg < 50 && selectedStudent.avg > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {selectedStudent.avatar || selectedStudent.initials}
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-navy">{selectedStudent.name}</h4>
                  <p className="text-xs text-gray-500">Grade {selectedStudent.grade}</p>
                </div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${selectedStudent.avg < 50 && selectedStudent.avg > 0 ? 'bg-red-50 border-red-200 text-red-700' : selectedStudent.avg >= 70 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  {selectedStudent.avg < 50 && selectedStudent.avg > 0 ? 'High Risk' : selectedStudent.avg >= 70 ? 'On Track' : 'Watch'}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                  <div className="text-base font-bold text-orange-500">{selectedStudent.streak || 0}🔥</div>
                  <div className="text-[9px] text-gray-500 font-medium">Streak</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                  <div className="text-base font-bold text-navy">{selectedStudent.xp || 0}</div>
                  <div className="text-[9px] text-gray-500 font-medium">Hero Points</div>
                </div>
                <div className={`rounded-lg p-2.5 text-center border ${selectedStudent.activeToday ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className={`text-base font-bold ${selectedStudent.activeToday ? 'text-green-600' : 'text-red-600'}`}>{selectedStudent.activeToday ? '✓' : '✗'}</div>
                  <div className={`text-[9px] font-medium ${selectedStudent.activeToday ? 'text-green-500' : 'text-red-500'}`}>Today</div>
                </div>
              </div>

              {/* Skill Breakdown */}
              <h4 className="font-semibold text-navy text-xs uppercase tracking-wider mb-3">Skill Breakdown</h4>
              <div className="space-y-2.5 mb-5">
                {heatmapSkills.map((skill, i) => {
                  const score = selectedStudent.scores[i] || 0
                  const cellStyle = getCellStyle(score)
                  return (
                    <div key={skill.key} className="flex items-center gap-2.5">
                      <div className="w-[80px] text-xs font-medium text-gray-600 truncate">{skill.key}</div>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
                        <div className="h-full rounded transition-all duration-700" style={{ width: `${score}%`, backgroundColor: cellStyle.bg.replace(/[\d.]+\)$/, '0.6)') }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: cellStyle.text }}>
                          {score > 0 ? score : '—'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Avg Score */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Score</span>
                  <span className={`text-2xl font-bold ${selectedStudent.avg >= 70 ? 'text-emerald-600' : selectedStudent.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {selectedStudent.avg > 0 ? selectedStudent.avg : '—'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button className="flex-1 bg-[#1B2B4B] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#C49A1A] transition-colors">Send Reminder</button>
                <button className="flex-1 border border-gray-200 text-gray-600 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Schedule 1:1</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-navy text-base">Create New Class</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Class Name</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 3 Maths"
                  value={createForm.className}
                  onChange={e => setCreateForm(f => ({ ...f, className: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Grade</label>
                  <select
                    value={createForm.grade}
                    onChange={e => setCreateForm(f => ({ ...f, grade: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric bg-white"
                  >
                    <option value="">Select grade</option>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Year</label>
                  <input
                    type="number"
                    value={createForm.year}
                    onChange={e => setCreateForm(f => ({ ...f, year: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric"
                  />
                </div>
              </div>

              {createError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{createError}</p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClass}
                disabled={creating}
                className="flex-1 bg-[#1B2B4B] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#C49A1A] disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create Class'}
              </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-3">
              A unique join code will be generated for students to use
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
