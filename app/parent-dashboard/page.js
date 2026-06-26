'use client'

import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import ArcadeSettings from '@/components/ArcadeSettings'
import ThemeToggle from '@/components/ThemeToggle'
import CharacterAvatar from '@/components/CharacterAvatar'
import SupportTickets from '@/components/SupportTickets'
import ReviewSurvey from '@/components/ReviewSurvey'
import { isCharacterId } from '@/lib/characterAvatars'
import { useFeatureFlags } from '@/lib/useFeatureFlags'
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

// Small presentational tile used inside the Account Settings panel index.
// Kept simple — clickable card with icon, title and one-line description.
function AccountTile({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 14,
        padding: 16,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#C49A1A' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)' }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: '#EEF2FF', color: '#4F46E5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>{icon}</div>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{title}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.45 }}>{desc}</div>
    </button>
  )
}

export default function ParentDashboard() {
  const { flags } = useFeatureFlags()
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
  const [showReview, setShowReview] = useState(false) // pre-launch parent review survey (#8)
  const [progress, setProgress] = useState(null)
  const [insights, setInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsSource, setInsightsSource] = useState(null)
  const [reportSending, setReportSending] = useState(false)
  const [reportMsg, setReportMsg] = useState('')

  // NPS survey — fires at most once every 30 days. Dismissal also counts as
  // "asked" so we don't pester someone who closes it.
  const [showNPS, setShowNPS] = useState(false)

  // Subscription + account actions
  const [subStatus, setSubStatus] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [changePwForm, setChangePwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [changePwLoading, setChangePwLoading] = useState(false)
  const [changePwError, setChangePwError] = useState('')
  const [showAddChildModal, setShowAddChildModal] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [addChildForm, setAddChildForm] = useState({ name: '', grade: '3', pin: '' })
  const [addChildLoading, setAddChildLoading] = useState(false)
  const [addChildError, setAddChildError] = useState('')
  const [actionToast, setActionToast] = useState(null)
  const [lastReportSent, setLastReportSent] = useState(null)

  // Account Settings — slide-out panel from the right (Stripe-style).
  // Panel has two view modes: 'index' (category grid) and a section id when
  // the parent drills into a category. The dashboard stays mounted behind it.
  const [accountPanelOpen, setAccountPanelOpen] = useState(false)
  const [accountView, setAccountView] = useState('index') // 'index' | 'profile' | 'subscription' | 'children' | 'arcade'

  // Inline name/email editing.
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

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
          // Fire-and-forget subscription status load so the sidebar can render
          // billing state. Failures are swallowed; we just don't show the
          // section until a value lands.
          loadSubStatus(parentId)
          const cr = await fetch(`/api/parent/children?parentId=${parentId}`)
          const cdata = await cr.json()
          if (!cancelled && cr.ok && cdata.children?.length > 0) {
            setChildren(cdata.children)
            setChildData(cdata.children[0])
            setStep('dashboard')
          } else {
            // Logged-in parent with no child yet — continue onboarding by adding
            // a child, NOT the public "Create account" landing.
            setStep('addChild')
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

  // Pre-launch parent review survey (report #8) — show once a week at most, only
  // on the real dashboard, deduped via localStorage so we don't nag.
  useEffect(() => {
    const parentId = parentData?.id
    if (!parentId || step !== 'dashboard') return
    try {
      const key = `mmh_parentReviewAt_${parentId}`
      const last = parseInt(localStorage.getItem(key) || '0', 10)
      if (Date.now() - last < 7 * 24 * 60 * 60 * 1000) return // within the last week
      const t = setTimeout(() => {
        setShowReview(true)
        localStorage.setItem(key, String(Date.now()))
      }, 4000)
      return () => clearTimeout(t)
    } catch { /* private window — skip */ }
  }, [parentData?.id, step])

  // ── Subscription gate — redirect to /subscribe if access is blocked ─────────
  useEffect(() => {
    const parentId = parentData?.id
    if (!parentId) return
    fetch(`/api/payments/status?parentId=${parentId}`)
      .then(r => r.json())
      .then(data => {
        if (data.accessBlocked) {
          window.location.href = '/subscribe'
        }
      })
      .catch(() => {})
  }, [parentData?.id])

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

  // Monthly NPS prompt — show 10s after the dashboard renders, only if we
  // haven't asked in the last 30 days. Dismissal counts as "asked" so we
  // don't pester the parent immediately.
  useEffect(() => {
    if (step !== 'dashboard') return
    try {
      const lastNPS = parseInt(localStorage.getItem('mmh_lastNPS') || '0', 10)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
      if (lastNPS >= thirtyDaysAgo) return
      const t = setTimeout(() => setShowNPS(true), 10000)
      return () => clearTimeout(t)
    } catch {
      // localStorage blocked — skip the survey rather than ask every load.
    }
  }, [step])

  function dismissNPS() {
    try { localStorage.setItem('mmh_lastNPS', Date.now().toString()) } catch {}
    setShowNPS(false)
  }

  async function submitNPS(score) {
    dismissNPS()
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parentData?.id,
          role: 'parent',
          type: 'nps',
          rating: score,
          context: { page: 'parent-dashboard' },
          platform: 'web',
        }),
      })
    } catch {
      // Already dismissed locally — silent fail is fine.
    }
  }

  function showActionToast(message, type = 'success') {
    setActionToast({ message, type })
    setTimeout(() => setActionToast(null), 3000)
  }

  // Open the Account Settings panel and seed inputs from current parentData.
  // The panel slides in from the right; the dashboard stays underneath.
  function openAccount() {
    setNameInput(parentData?.name || '')
    setEmailInput(parentData?.email || '')
    setEditingName(false)
    setEditingEmail(false)
    setAccountView('index')
    setAccountPanelOpen(true)
  }

  // Honour ?open=support|subscription|children when the navbar bell routes here
  // from another page. Runs once the dashboard is ready; then clears the param.
  useEffect(() => {
    if (step !== 'dashboard') return
    const params = new URLSearchParams(window.location.search)
    const open = params.get('open')
    if (!open) return
    if (open === 'support') setShowSupport(true)
    else if (open === 'subscription' || open === 'children') { openAccount(); setAccountView(open) }
    // Remove the param so it doesn't re-fire on refresh.
    window.history.replaceState({}, '', '/parent-dashboard')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function closeAccount() {
    setAccountPanelOpen(false)
    setEditingName(false)
    setEditingEmail(false)
  }

  // ESC closes the panel from anywhere. Only listens while it's open.
  useEffect(() => {
    if (!accountPanelOpen) return
    function onKey(e) { if (e.key === 'Escape') closeAccount() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [accountPanelOpen])

  async function saveName() {
    const cleaned = nameInput.trim()
    if (!cleaned) {
      showActionToast('Name cannot be empty', 'error')
      return
    }
    if (cleaned === parentData?.name) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    try {
      const res = await fetch('/api/parent/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleaned }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setParentData(prev => prev ? ({ ...prev, name: cleaned }) : prev)
        setEditingName(false)
        showActionToast('Name updated ✅')
      } else {
        showActionToast(data.error || 'Failed to update name', 'error')
      }
    } catch {
      showActionToast('Connection error', 'error')
    } finally {
      setSavingName(false)
    }
  }

  async function saveEmail() {
    const cleaned = emailInput.trim().toLowerCase()
    if (!cleaned.includes('@') || cleaned.length < 5) {
      showActionToast('Please enter a valid email', 'error')
      return
    }
    if (cleaned === parentData?.email) {
      setEditingEmail(false)
      return
    }
    setSavingEmail(true)
    try {
      const res = await fetch('/api/parent/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleaned }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setParentData(prev => prev ? ({ ...prev, email: cleaned }) : prev)
        setEditingEmail(false)
        showActionToast('Email updated ✅')
      } else {
        showActionToast(data.error || 'Failed to update email', 'error')
      }
    } catch {
      showActionToast('Connection error', 'error')
    } finally {
      setSavingEmail(false)
    }
  }

  // Load subscription status. Spec wanted a hard redirect on accessBlocked;
  // we show a banner instead so the parent can hit the sidebar's Resubscribe
  // button without bouncing off the page.
  async function loadSubStatus(pId) {
    try {
      const res = await fetch(`/api/payments/status?parentId=${encodeURIComponent(pId)}`)
      if (!res.ok) return
      const data = await res.json()
      setSubStatus(data)
    } catch {
      // Silent — sidebar will just not show subscription details.
    }
  }

  async function openBillingPortal() {
    if (!parentData?.id) return
    setPortalLoading(true)
    try {
      const res = await fetch('/api/payments/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: parentData.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        window.location.href = data.url
        return
      }
      showActionToast(data.error || 'Could not open billing portal', 'error')
    } catch {
      showActionToast('Connection error — try again', 'error')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setChangePwError('')
    if (changePwForm.newPw !== changePwForm.confirm) {
      setChangePwError('New passwords do not match'); return
    }
    if (changePwForm.newPw.length < 8) {
      setChangePwError('Password must be at least 8 characters'); return
    }
    setChangePwLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: changePwForm.current,
          newPassword: changePwForm.newPw,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        setShowChangePassword(false)
        setChangePwForm({ current: '', newPw: '', confirm: '' })
        showActionToast('Password changed ✅')
      } else {
        setChangePwError(data.error || 'Failed to change password')
      }
    } catch {
      setChangePwError('Connection error')
    } finally {
      setChangePwLoading(false)
    }
  }

  async function handleResetChildPin(child) {
    const newPin = prompt(`Set a new 4-digit PIN for ${child.name}:`)
    if (newPin === null) return
    if (!/^\d{4}$/.test(newPin)) {
      alert('PIN must be exactly 4 digits')
      return
    }
    try {
      const res = await fetch('/api/parent/reset-child-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: child.id, newPin }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        showActionToast(`PIN reset for ${child.name} ✅`)
      } else {
        alert(data.error || 'Failed to reset PIN')
      }
    } catch {
      alert('Connection error')
    }
  }

  // Add-child flow.
  // First child: open the modal directly.
  // Second+ child:
  //   • If sibling add-on already active → open modal directly.
  //   • Else → confirm + start a $10/mo sibling checkout. The webhook flips
  //     siblingAddonActive; the user can add the child on return.
  async function handleAddChildClick() {
    if (subStatus && subStatus.accessBlocked) {
      showActionToast('Resubscribe to add children', 'error')
      return
    }
    const existingChildren = children?.length || 0
    // An admin-granted free slot lets them add the next child with no charge.
    const hasFreeGrant = (subStatus?.freeChildGrants || 0) > 0
    if (existingChildren >= 1 && !subStatus?.siblingAddonActive && !hasFreeGrant) {
      const ok = confirm(
        'Adding another child costs $10/month (sibling add-on).\n\nYou\'ll be sent to checkout. Once paid, come back here and tap "Add Another Child" again to enter their details.\n\nContinue?'
      )
      if (!ok) return
      try {
        const res = await fetch('/api/payments/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: parentData?.id,
            planKey: 'siblingMonthly',
            isSiblingAddOn: true,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (data.url) {
          sessionStorage.setItem('pendingAddChild', 'true')
          window.location.href = data.url
          return
        }
        showActionToast(data.error || 'Could not start checkout', 'error')
      } catch {
        showActionToast('Connection error starting checkout', 'error')
      }
      return
    }

    setAddChildError('')
    setShowAddChildModal(true)
  }

  async function handleAddChildSubmit(e) {
    e.preventDefault()
    setAddChildError('')
    if (!addChildForm.name.trim()) {
      setAddChildError('Name is required'); return
    }
    if (!/^\d{4}$/.test(addChildForm.pin)) {
      setAddChildError('PIN must be 4 digits'); return
    }
    setAddChildLoading(true)
    try {
      const res = await fetch('/api/parent/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addChildForm.name.trim(),
          grade: addChildForm.grade,
          pin: addChildForm.pin,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        showActionToast(`${addChildForm.name.trim()} added! ✅`)
        setShowAddChildModal(false)
        setAddChildForm({ name: '', grade: '3', pin: '' })
        // Refresh children list
        if (parentData?.id) {
          const cr = await fetch(`/api/parent/children?parentId=${parentData.id}`)
          const cd = await cr.json().catch(() => ({}))
          if (Array.isArray(cd.children)) setChildren(cd.children)
        }
      } else if (data.requiresSiblingAddon) {
        setAddChildError('Sibling add-on payment is required for additional children.')
      } else if (data.requiresSubscription) {
        setAddChildError('An active subscription is required.')
      } else {
        setAddChildError(data.error || 'Failed to add child')
      }
    } catch {
      setAddChildError('Connection error')
    } finally {
      setAddChildLoading(false)
    }
  }

  function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => { window.location.href = '/login' })
      .catch(() => { window.location.href = '/login' })
  }

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
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <img src="/assets/logos/logo-icon.png" alt="MyMathsHero" style={{ width: 80, animation: 'pulse 1.5s infinite' }} />
        <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Loading your dashboard...</p>
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
                <h2 className="text-2xl font-bold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A]">Create Parent Account</h2>
                <p className="text-gray-500 dark:text-slate-300 text-sm mt-1">Step 1 of 2</p>
              </div>
              <form onSubmit={handleRegister} className="bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-2xl p-6 border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Full Name</label>
                  <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" /><input type="text" required value={registerForm.name} onChange={e => setRegisterForm({...registerForm, name: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="Sarah Johnson" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Email</label>
                  <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" /><input type="email" required value={registerForm.email} onChange={e => setRegisterForm({...registerForm, email: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="sarah@email.com" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Password</label>
                  <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" /><input type="password" required minLength={6} value={registerForm.password} onChange={e => setRegisterForm({...registerForm, password: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="Min 6 characters" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Phone (optional)</label>
                  <div className="relative"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" /><input type="tel" value={registerForm.phone} onChange={e => setRegisterForm({...registerForm, phone: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="04XX XXX XXX" /></div>
                </div>
                {error && <div className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">{error}</div>}
                <button type="submit" disabled={submitting} className="w-full bg-[#1B2B4B] hover:bg-[#C49A1A] disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                  {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Continue <ArrowRight size={16} /></>}
                </button>
                <button type="button" onClick={() => setStep('landing')} className="w-full text-gray-500 dark:text-slate-300 text-sm hover:text-gray-700">Back</button>
              </form>
            </div>
          </div>
        )}

        {step === 'addChild' && (
          <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4"><Plus size={28} className="text-green-600" /></div>
                <h2 className="text-2xl font-bold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A]">Add Your Child</h2>
                <p className="text-gray-500 dark:text-slate-300 text-sm mt-1">Step 2 of 2 — Welcome, {parentData?.name}!</p>
              </div>
              <form onSubmit={handleAddChild} className="bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-2xl p-6 border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Child&apos;s Name</label>
                  <input type="text" required value={childForm.name} onChange={e => setChildForm({...childForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm" placeholder="Alex" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Grade</label>
                  <select required value={childForm.grade} onChange={e => setChildForm({...childForm, grade: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric text-sm bg-white dark:bg-[#1C1C1C] colorblind:bg-white appearance-none">
                    <option value="">Select grade</option>
                    {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Choose an Avatar</label>
                  <div className="flex gap-2 flex-wrap">
                    {avatarOptions.map(a => (
                      <button key={a} type="button" onClick={() => setChildForm({...childForm, avatar: a})} className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${childForm.avatar === a ? 'bg-electric/10 border-2 border-electric scale-110 shadow-md' : 'bg-gray-50 dark:bg-[#16202e] border-2 border-gray-100 dark:border-white/10 hover:border-gray-300'}`}>
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
              <div className="bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-2xl p-8 border border-gray-100 dark:border-white/10 shadow-lg">
                <div className="mx-auto mb-4" style={{ width: 80 }}>
                  {isCharacterId(childData.avatar)
                    ? <CharacterAvatar id={childData.avatar} size={80} />
                    : <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center text-5xl">{childData.avatar}</div>}
                </div>
                <h2 className="text-2xl font-bold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] mb-2">{childData.name} is Ready!</h2>
                <p className="text-gray-500 dark:text-slate-300 text-sm mb-6">{childData.grade} account created successfully</p>
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
                <p className="text-gray-400 dark:text-slate-400 text-xs mb-6">Share these credentials with your child to log in on their device.</p>
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

  // ── Account Settings (full-screen) ─────────────────────────────────────────
  // Replaces the old slide-out sidebar. All six sections live here in one
  // scrollable page so parents have everything in one place. The page
  // emits the same actionToast notifications the main dashboard uses.

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <style jsx global>{`
        @keyframes feed-in { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.5); } }
        @keyframes acct-panel-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes acct-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        .feed-in { animation: feed-in 0.4s ease-out forwards; }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="bg-white dark:bg-[#1C1C1C] colorblind:bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-[#1B2B4B] dark:text-[#F0F0F0]">Parent Hub — MyMathsHero</h1>
              <p className="text-xs text-gray-500 dark:text-slate-300 mt-0.5">{childName} &middot; Grade {childGrade} &middot; {children.length || 1} child{(children.length || 1) === 1 ? '' : 'ren'}</p>
            </div>
            <div className="flex items-center gap-2">
              {children.length > 1 && (
                <select
                  value={childData?.id || ''}
                  onChange={e => setChildData(children.find(c => c.id === e.target.value))}
                  className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 dark:text-slate-300 bg-white dark:bg-[#1C1C1C] colorblind:bg-white focus:outline-none focus:ring-1 focus:ring-electric"
                >
                  {/* <option> can't render a component, so for character-id
                      avatars we just show the name (no raw "ninja" text). */}
                  {children.map(c => <option key={c.id} value={c.id}>{isCharacterId(c.avatar) ? '' : (c.avatar ? c.avatar + ' ' : '')}{c.name}</option>)}
                </select>
              )}
              <a href="/student-dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 dark:text-slate-300 text-xs font-medium hover:bg-gray-50 dark:bg-[#16202e] transition-colors">
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
          <p className="text-sm text-gray-500 dark:text-slate-300">Loading {childName}&apos;s progress…</p>
        </div>
      ) : (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Child Card (mirrors My Classes header strip) */}
        <div className="bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-electric" />
              <h2 className="font-semibold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] text-sm">My Child</h2>
            </div>
            <button onClick={handleAddChildClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B2B4B] text-white text-xs font-medium hover:bg-[#C49A1A] transition-colors">
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
                    : 'bg-gray-50 dark:bg-[#16202e] text-gray-700 dark:text-slate-200 border-gray-200 hover:border-[#C49A1A]/60'
                }`}
              >
                {isCharacterId(c.avatar)
                  ? <CharacterAvatar id={c.avatar} size={28} />
                  : <span className="text-xl">{c.avatar || '🦊'}</span>}
                <div className="leading-tight">
                  <span className="font-semibold text-xs block">{c.name}</span>
                  <span className={`text-[10px] ${childData?.id === c.id ? 'text-white/80' : 'text-gray-400 dark:text-slate-400'}`}>Grade {c.grade}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {overviewCards.map((card, i) => (
            <div key={i} className={`bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-xl p-4 border ${card.border} hover:shadow-sm transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-gray-500 dark:text-slate-300 font-medium uppercase tracking-wider">{card.label}</span>
                <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon size={14} className={card.color} />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A]">{card.value}</span>
                <span className={`text-xs font-semibold mb-0.5 flex items-center gap-0.5 ${card.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {card.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.change}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-slate-400">{card.changeLabel}</span>
            </div>
          ))}
        </div>

        {/* Placement Report — AI estimate of the child's true working level from
            the diagnostic, fused with parent insight. Only shown once set. */}
        {childData?.placement?.rationale && (
          <div className="mb-6 bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
              <Trophy size={15} className="text-amber-500" />
              <h2 className="font-semibold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] text-sm">Placement Report</h2>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Enrolled: {childData.placement.enteredGrade === 0 ? 'Prep' : `Year ${childData.placement.enteredGrade}`}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${childData.placement.estimatedGrade > childData.placement.enteredGrade ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                  Estimated: {childData.placement.estimatedGrade === 0 ? 'Prep' : `Year ${childData.placement.estimatedGrade}`}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-gray-400">
                  {childData.placement.confidence} confidence
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{childData.placement.rationale}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Skill Heatmap */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-electric" />
                  <h2 className="font-semibold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] text-sm">{childName}&apos;s Skill Heatmap</h2>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[10px] text-gray-500 dark:text-slate-300">
                  <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(22,163,74,0.25)' }} /> 80+</span>
                  <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(22,163,74,0.12)' }} /> 60+</span>
                  <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(217,119,6,0.15)' }} /> 40+</span>
                  <span className="flex items-center gap-1"><span className="w-5 h-2.5 rounded-sm" style={{ background: 'rgba(220,38,38,0.2)' }} /> &lt;40</span>
                </div>
              </div>

              {mathsSkills.length === 0 ? (
                <div className="py-16 text-center text-gray-400 dark:text-slate-400">
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
                          <div className="w-[150px] text-xs font-medium text-gray-600 dark:text-slate-300 truncate flex items-center gap-1.5">
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
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-white/10 bg-navy/[0.03] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Overall Average</span>
                    <span className={`text-sm font-bold ${childAvg >= 70 ? 'text-emerald-700' : childAvg >= 50 ? 'text-amber-700' : childAvg > 0 ? 'text-red-700' : 'text-gray-400 dark:text-slate-400'}`}>
                      {childAvg > 0 ? childAvg : '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Weekly Activity (extra parent card, same card chrome) */}
            <div className="bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
                <Activity size={15} className="text-electric" />
                <h2 className="font-semibold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] text-sm">Weekly Activity</h2>
              </div>
              <div className="p-4">
                {weeklyActivity.some(d => d.questions > 0) ? (
                  <div className="flex items-end gap-2 h-28">
                    {weeklyActivity.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t min-h-[3px]" style={{
                          height: `${(d.questions / maxWeekly) * 88}px`,
                          background: d.questions >= 10 ? '#16a34a' : d.questions >= 5 ? 'var(--accent-gold)' : d.questions > 0 ? '#60a5fa' : '#e5e7eb',
                        }} title={`${d.questions} questions · ${d.correct} correct`} />
                        <span className="text-[9px] text-gray-400 dark:text-slate-400 font-medium">{d.day?.charAt(0)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-slate-400 text-center py-6">No activity recorded this week yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* AI Insights (mirrors teacher AI Insights panel exactly) */}
          <div className="w-full xl:w-[340px] flex-shrink-0">
            <div className="bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-white to-blue-50/50">
                <div className="flex items-center gap-2">
                  <Brain size={15} className="text-electric" />
                  <h2 className="font-semibold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] text-sm">AI Insights</h2>
                  {insightsSource && (
                    <span className="text-[9px] text-gray-400 dark:text-slate-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
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
                      <div key={i} className="px-4 py-3.5 hover:bg-gray-50 dark:bg-[#16202e]/50 transition-all feed-in" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center pt-1 flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full ${style.dot} ${i === 0 ? 'pulse-dot' : ''}`} />
                            {i < insights.length - 1 && <div className="w-px h-full bg-gray-100 mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
                            </div>
                            <h4 className="font-semibold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] text-[13px] leading-snug mb-1">{insight.title}</h4>
                            <p className="text-gray-500 dark:text-slate-300 text-[11px] leading-relaxed mb-2">{insight.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {insights.length === 0 && !insightsLoading && (
                    <div className="px-4 py-8 text-center text-xs text-gray-400 dark:text-slate-400">No insights yet — once your child practises, Hero will share insights</div>
                  )}
                </div>
              )}

              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#16202e]/50 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 dark:text-slate-400">{insights.length} insight{insights.length !== 1 ? 's' : ''}</span>
                {insightsLoading && <span className="text-[10px] text-electric animate-pulse">Analysing {childName}&apos;s data…</span>}
              </div>
            </div>

            {/* Recent Sessions (mirrors teacher's secondary list) */}
            <div className="bg-white dark:bg-[#1C1C1C] colorblind:bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
                <Activity size={15} className="text-electric" />
                <h2 className="font-semibold text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] text-sm">Recent Sessions</h2>
              </div>
              {weeklyActivity.some(d => d.questions > 0) ? (
                <div className="divide-y divide-gray-50">
                  {weeklyActivity.filter(d => d.questions > 0).slice(-5).reverse().map((d, i) => {
                    const acc = d.questions > 0 ? Math.round((d.correct / d.questions) * 100) : 0
                    return (
                      <div key={i} className="px-4 py-3 flex items-center justify-between">
                        <span className="font-medium text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] text-xs">{d.day}</span>
                        <span className="text-[11px] text-gray-500 dark:text-slate-300">{d.questions} questions · {acc}% correct</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-gray-400 dark:text-slate-400">No sessions logged this week</div>
              )}
            </div>

            {reportMsg && (
              <p className="text-[11px] text-navy dark:text-slate-100 colorblind:text-[#1A1A1A] font-medium mt-3 bg-white dark:bg-[#1C1C1C] colorblind:bg-white border border-gray-200 rounded-lg px-3 py-2">
                {reportMsg}{lastReportSent ? ` · ${lastReportSent.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            )}
          </div>
        </div>

      </div>
      )}


      {/* Settings launcher (floating, like teacher's affordances) */}
      {step === 'dashboard' && !loading && (
        <button
          onClick={openAccount}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#1B2B4B] text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-[#C49A1A] transition-colors text-xs font-semibold"
        >
          <User size={14} /> Account
        </button>
      )}

      {/* Notification bell now lives in the global Navbar (top-right) for parents —
          it was previously hidden behind the navbar when floated here. */}

      {/* ACCESS-BLOCKED BANNER — shows when sub lapsed, instead of hard-redirecting */}
      {subStatus?.accessBlocked && step === 'dashboard' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: 'var(--error-bg)',
          borderBottom: '2px solid #EF4444',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, zIndex: 90, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ color: '#991B1B', fontWeight: 700, fontSize: 14 }}>
            Your subscription has lapsed. Reactivate to keep your child&apos;s progress.
          </span>
          <a href="/pricing" style={{
            background: 'var(--bg-header)', color: 'white',
            padding: '6px 14px', borderRadius: 8,
            fontWeight: 700, fontSize: 13, textDecoration: 'none',
            border: '2px solid #C49A1A',
          }}>Resubscribe →</a>
        </div>
      )}

      {/* TOAST — bottom-centre, 3s auto-dismiss */}
      {actionToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: actionToast.type === 'error' ? 'var(--error-bg)' : '#1B2B4B',
          color: actionToast.type === 'error' ? '#991B1B' : 'white',
          padding: '12px 20px', borderRadius: 12,
          fontWeight: 700, fontSize: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          border: actionToast.type === 'error'
            ? '1px solid #EF4444' : '2px solid #C49A1A',
          zIndex: 600,
        }}>
          {actionToast.message}
        </div>
      )}

      {/* ── ACCOUNT SETTINGS PANEL ─────────────────────────────────────────
          Right-side slide-out (Stripe-style). Backdrop closes on click.
          Tapping a category swaps the panel view inline (no page nav).      */}
      {accountPanelOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeAccount}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15,23,42,0.45)',
              zIndex: 400,
              animation: 'acct-backdrop-in 0.18s ease-out',
            }}
          />
          {/* Panel */}
          <aside
            role="dialog"
            aria-label="Account settings"
            style={{
              position: 'fixed',
              top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: 520,
              background: 'var(--bg-card)',
              boxShadow: '-20px 0 60px rgba(15,23,42,0.18)',
              zIndex: 401,
              display: 'flex', flexDirection: 'column',
              animation: 'acct-panel-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '18px 20px',
              borderBottom: '1px solid var(--border-light)',
            }}>
              {accountView !== 'index' && (
                <button
                  onClick={() => setAccountView('index')}
                  aria-label="Back to categories"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 20, color: 'var(--text-primary)', padding: 4,
                  }}
                >←</button>
              )}
              <h2 style={{
                margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)',
                flex: 1,
              }}>
                {accountView === 'index'        ? 'Account settings'
                  : accountView === 'profile'      ? 'Personal details'
                  : accountView === 'subscription' ? 'Subscription'
                  : accountView === 'children'     ? 'Children'
                  : accountView === 'arcade'       ? 'Arcade controls'
                  : 'Account settings'}
              </h2>
              <button
                onClick={closeAccount}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 22, color: 'var(--text-muted)', padding: 4, lineHeight: 1,
                }}
              >×</button>
            </div>

            {/* Panel body — scrolls independently of the dashboard */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {accountView === 'index' && (
                <>
                  <p style={{
                    fontSize: 11, fontWeight: 800, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 1,
                    margin: '0 0 12px',
                  }}>
                    Personal
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 12, marginBottom: 24,
                  }}>
                    <AccountTile
                      icon="👤"
                      title="Personal details"
                      desc="Contact information, password, and your active sessions."
                      onClick={() => setAccountView('profile')}
                    />
                  </div>

                  <p style={{
                    fontSize: 11, fontWeight: 800, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 1,
                    margin: '0 0 12px',
                  }}>
                    Account
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 12, marginBottom: 24,
                  }}>
                    <AccountTile
                      icon="💳"
                      title="Subscription"
                      desc="Plan, billing portal, founding-family status."
                      onClick={() => setAccountView('subscription')}
                    />
                    <AccountTile
                      icon="🧒"
                      title="Children"
                      desc={`${children?.length || 0} on this account · Add or reset PIN.`}
                      onClick={() => setAccountView('children')}
                    />
                    {flags.arcadeEnabled && (children?.length || 0) > 0 && (
                      <AccountTile
                        icon="🕹️"
                        title="Arcade controls"
                        desc="Per-child limits and time windows."
                        onClick={() => setAccountView('arcade')}
                      />
                    )}
                    <AccountTile
                      icon="🎫"
                      title="Help & Support"
                      desc="Contact our team and track your support tickets."
                      onClick={() => setShowSupport(true)}
                    />
                  </div>

                  {/* Sign out lives on the index for one-tap access. */}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', padding: '14px 16px',
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 12, fontWeight: 700, fontSize: 14,
                      color: '#EF4444', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >🚪 &nbsp; Log out</button>
                </>
              )}

              {accountView === 'profile' && (
                <>
                  {/* Name */}
                  {!editingName ? (
                    <div style={{
                      padding: '16px 0', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: '1px solid var(--border-light)',
                    }}>
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 2px' }}>Name</p>
                        <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{parentData?.name || '—'}</p>
                      </div>
                      <button
                        onClick={() => { setNameInput(parentData?.name || ''); setEditingName(true) }}
                        style={{ color: '#C49A1A', fontWeight: 700, fontSize: 14,
                          background: 'none', border: 'none', cursor: 'pointer' }}
                      >Edit</button>
                    </div>
                  ) : (
                    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>Name</p>
                      <input
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '10px 14px',
                          border: '1.5px solid var(--border-color)', borderRadius: 10,
                          fontSize: 15, color: 'var(--text-primary)', outline: 'none',
                          marginBottom: 10, boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditingName(false)} disabled={savingName}
                          style={{ flex: 1, padding: 10, background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)', borderRadius: 10,
                            fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          Cancel
                        </button>
                        <button onClick={saveName} disabled={savingName}
                          style={{ flex: 2, padding: 10, background: '#1B2B4B',
                            border: '2px solid #C49A1A', borderRadius: 10,
                            fontWeight: 700, cursor: savingName ? 'not-allowed' : 'pointer', color: 'white' }}>
                          {savingName ? 'Saving…' : 'Save Name'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  {!editingEmail ? (
                    <div style={{
                      padding: '16px 0', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: '1px solid var(--border-light)',
                    }}>
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 2px' }}>Email</p>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontSize: 14 }}>
                          {parentData?.email || '—'}
                        </p>
                      </div>
                      <button
                        onClick={() => { setEmailInput(parentData?.email || ''); setEditingEmail(true) }}
                        style={{ color: '#C49A1A', fontWeight: 700, fontSize: 14,
                          background: 'none', border: 'none', cursor: 'pointer' }}
                      >Edit</button>
                    </div>
                  ) : (
                    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>Email</p>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        autoFocus
                        autoComplete="email"
                        style={{ width: '100%', padding: '10px 14px',
                          border: '1.5px solid var(--border-color)', borderRadius: 10,
                          fontSize: 15, color: 'var(--text-primary)', outline: 'none',
                          marginBottom: 10, boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditingEmail(false)} disabled={savingEmail}
                          style={{ flex: 1, padding: 10, background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)', borderRadius: 10,
                            fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          Cancel
                        </button>
                        <button onClick={saveEmail} disabled={savingEmail}
                          style={{ flex: 2, padding: 10, background: '#1B2B4B',
                            border: '2px solid #C49A1A', borderRadius: 10,
                            fontWeight: 700, cursor: savingEmail ? 'not-allowed' : 'pointer', color: 'white' }}>
                          {savingEmail ? 'Saving…' : 'Save Email'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <button
                    onClick={() => setShowChangePassword(true)}
                    style={{
                      width: '100%', marginTop: 16, padding: '14px 16px',
                      background: 'var(--bg-card-elevated)', border: '1px solid var(--border-color)',
                      borderRadius: 12, fontWeight: 700, fontSize: 14,
                      color: 'var(--text-primary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🔑</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>Change password</span>
                    <span style={{ color: 'var(--text-muted)' }}>›</span>
                  </button>
                </>
              )}

              {accountView === 'subscription' && (
                <>
                  <div style={{
                    background: subStatus?.accessBlocked ? '#FEE2E2' : '#DCFCE7',
                    borderRadius: 12, padding: 16, marginBottom: 16,
                  }}>
                    <p style={{ fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)', fontSize: 15 }}>
                      {subStatus?.plan === 'premium' ? '⭐ Premium Plan'
                        : subStatus?.plan === 'standard' ? '📚 Standard Plan'
                        : subStatus?.subscribed ? '✅ Active Plan'
                        : '🔓 No Active Plan'}
                    </p>
                    <p style={{ margin: 0, fontSize: 13,
                      color: subStatus?.accessBlocked ? '#991B1B' : '#166534' }}>
                      {subStatus?.subscriptionStatus === 'trialing' && subStatus?.trialEndsAt
                        ? `🎉 Free trial — ends ${new Date(subStatus.trialEndsAt).toLocaleDateString('en-AU')}`
                        : subStatus?.accessBlocked
                        ? '❌ Access paused — payment required'
                        : subStatus?.currentPeriodEnd
                        ? `✅ Renews ${new Date(subStatus.currentPeriodEnd).toLocaleDateString('en-AU')}`
                        : subStatus?.subscribed ? '✅ Active' : 'No subscription'}
                    </p>
                    {subStatus?.foundingFamily && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#C49A1A', fontWeight: 700 }}>
                        🏅 Founding Family Member
                      </p>
                    )}
                    {subStatus?.siblingAddonActive && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>
                        👫 Sibling add-on active
                      </p>
                    )}
                  </div>
                  <button
                    onClick={openBillingPortal}
                    disabled={portalLoading}
                    style={{
                      width: '100%', padding: '12px 16px',
                      background: '#1B2B4B', color: 'white',
                      border: '2px solid #C49A1A', borderRadius: 12,
                      fontWeight: 700, fontSize: 14,
                      cursor: portalLoading ? 'not-allowed' : 'pointer',
                      marginBottom: 10,
                    }}
                  >{portalLoading ? 'Loading…' : '💳 Manage Billing & Cancel'}</button>
                  {subStatus?.accessBlocked && (
                    <a href="/pricing"
                      style={{
                        display: 'block', width: '100%',
                        padding: '12px 16px', background: '#C49A1A',
                        color: 'white', borderRadius: 12,
                        fontWeight: 700, fontSize: 14,
                        textDecoration: 'none', textAlign: 'center',
                        boxSizing: 'border-box',
                      }}>
                      🚀 Resubscribe Now
                    </a>
                  )}
                </>
              )}

              {accountView === 'children' && (
                <>
                  {(children || []).map((child, i) => (
                    <div key={child.id || i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--border-light)',
                    }}>
                      {isCharacterId(child.avatar) ? (
                        <CharacterAvatar id={child.avatar} size={40} />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: 'var(--bg-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20,
                        }}>{child.avatar || '🧒'}</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{child.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                          {child.grade === 0 || child.grade === '0' ? 'Prep' : `Year ${child.grade}`} · {child.xp || 0} Hero Points
                        </p>
                      </div>
                      <button
                        onClick={() => handleResetChildPin(child)}
                        style={{
                          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          borderRadius: 8, padding: '6px 12px', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                        }}
                      >🔢 Reset PIN</button>
                    </div>
                  ))}
                  {(!children || children.length === 0) && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 12px' }}>No children yet.</p>
                  )}
                  {(() => {
                    const existingCount = children?.length || 0
                    const needsSiblingPayment = existingCount >= 1 && !subStatus?.siblingAddonActive
                    return (
                      <button
                        onClick={handleAddChildClick}
                        style={{
                          width: '100%', marginTop: 14, padding: '12px 16px',
                          background: 'var(--bg-card)', border: '2px dashed #CBD5E1',
                          borderRadius: 12, fontWeight: 700, fontSize: 14,
                          color: 'var(--text-secondary)', cursor: 'pointer',
                        }}
                      >
                        {needsSiblingPayment
                          ? '+ Add Another Child — $10/month'
                          : '+ Add Another Child'}
                      </button>
                    )
                  })()}
                </>
              )}

              {accountView === 'arcade' && (
                flags.arcadeEnabled && parentData?.id && (children?.length || 0) > 0
                  ? <ArcadeSettings parentId={parentData.id} children={children} />
                  : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      Arcade controls become available once at least one child is added and the Arcade feature is enabled.
                    </p>
              )}
            </div>
          </aside>
        </>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangePassword && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 500, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20,
            padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20, fontSize: 20 }}>
              🔑 Change Password
            </h2>
            <form onSubmit={handleChangePassword}>
              {[
                { label: 'Current Password', key: 'current' },
                { label: 'New Password', key: 'newPw' },
                { label: 'Confirm New Password', key: 'confirm' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {field.label}
                  </label>
                  <input
                    type="password"
                    autoComplete={field.key === 'current' ? 'current-password' : 'new-password'}
                    value={changePwForm[field.key]}
                    onChange={e => setChangePwForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '12px 14px',
                      border: '1.5px solid var(--border-color)', borderRadius: 10,
                      fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              {changePwError && (
                <p style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{changePwError}</p>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button"
                  onClick={() => { setShowChangePassword(false); setChangePwError('') }}
                  style={{ flex: 1, padding: 12, background: 'var(--bg-card)',
                    border: '1.5px solid var(--border-color)', borderRadius: 10,
                    fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={changePwLoading}
                  style={{ flex: 2, padding: 12, background: 'var(--bg-header)',
                    color: 'white', border: '2px solid #C49A1A',
                    borderRadius: 10, fontWeight: 800,
                    cursor: changePwLoading ? 'not-allowed' : 'pointer' }}>
                  {changePwLoading ? 'Saving…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CHILD MODAL */}
      {showAddChildModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 500, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20,
            padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, fontSize: 20 }}>
              🧒 Add Child
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              Add your child&apos;s details to get started
            </p>
            <form onSubmit={handleAddChildSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Child&apos;s Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emma"
                  value={addChildForm.name}
                  onChange={e => setAddChildForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '12px 14px',
                    border: '1.5px solid var(--border-color)', borderRadius: 10,
                    fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Year Level
                </label>
                <select
                  value={addChildForm.grade}
                  onChange={e => setAddChildForm(prev => ({ ...prev, grade: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px',
                    border: '1.5px solid var(--border-color)', borderRadius: 10,
                    fontSize: 14, boxSizing: 'border-box' }}
                >
                  <option value="0">Prep</option>
                  {[1, 2, 3, 4, 5, 6].map(g => (
                    <option key={g} value={String(g)}>{`Year ${g}`}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  4-digit PIN (child uses this to log in)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  value={addChildForm.pin}
                  onChange={e => setAddChildForm(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  required
                  style={{ width: '100%', padding: '12px 14px',
                    border: '1.5px solid var(--border-color)', borderRadius: 10,
                    fontSize: 20, letterSpacing: 8,
                    boxSizing: 'border-box' }}
                />
              </div>
              {addChildError && (
                <p style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{addChildError}</p>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button"
                  onClick={() => { setShowAddChildModal(false); setAddChildError('') }}
                  style={{ flex: 1, padding: 12, background: 'var(--bg-card)',
                    border: '1.5px solid var(--border-color)', borderRadius: 10,
                    fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={addChildLoading}
                  style={{ flex: 2, padding: 12, background: 'var(--bg-header)',
                    color: 'white', border: '2px solid #C49A1A',
                    borderRadius: 10, fontWeight: 800,
                    cursor: addChildLoading ? 'not-allowed' : 'pointer' }}>
                  {addChildLoading ? 'Adding…' : 'Add Child ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NPS SURVEY — bottom-right popup, monthly */}
      {showSupport && <SupportTickets onClose={() => setShowSupport(false)} />}

      {/* Pre-launch parent review survey (feedback #8). */}
      {showReview && (
        <ReviewSurvey variant="parent" userId={parentData?.id} onClose={() => setShowReview(false)} />
      )}

      {showNPS && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'var(--bg-card)', borderRadius: 20,
          padding: 24, maxWidth: 360,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '1px solid var(--border-color)', zIndex: 300,
        }}>
          <button
            onClick={dismissNPS}
            aria-label="Dismiss survey"
            style={{ position: 'absolute', top: 12, right: 16,
              background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)',
              fontSize: 18 }}>
            ✕
          </button>
          <p style={{ fontWeight: 800, color: 'var(--text-primary)',
            marginBottom: 6, fontSize: 15 }}>
            How likely are you to recommend MyMathsHero?
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12,
            marginBottom: 16 }}>
            0 = Not at all · 10 = Definitely!
          </p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n}
                onClick={() => submitNPS(n)}
                style={{
                  width: 36, height: 36,
                  borderRadius: 8, border: '1.5px solid var(--border-color)',
                  background: n >= 9 ? 'var(--correct-bg)'
                    : n >= 7 ? 'var(--accent-gold-light)' : 'var(--bg-card)',
                  color: 'var(--text-primary)', fontWeight: 700,
                  fontSize: 13, cursor: 'pointer',
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
