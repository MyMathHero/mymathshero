'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const ADMIN_KEY = 'mymathshero_admin_2026'

const SECTIONS = [
  { id: 'overview', label: 'Overview', emoji: '📊' },
  { id: 'platform', label: 'Platform Control', emoji: '🎛️' },
  { id: 'students', label: 'Students', emoji: '🎓' },
  { id: 'parents', label: 'Parents', emoji: '👨‍👩‍👧' },
  { id: 'teachers', label: 'Teachers', emoji: '🧑‍🏫' },
  { id: 'questions', label: 'Questions', emoji: '📝' },
  { id: 'ai', label: 'AI & Voice', emoji: '🤖' },
  { id: 'emails', label: 'Emails', emoji: '📧' },
  { id: 'waitlist', label: 'Waitlist', emoji: '📋' },
  { id: 'subscriptions', label: 'Subscriptions', emoji: '💳' },
  { id: 'support', label: 'Support Tickets', emoji: '🎫' },
  { id: 'leaderboard', label: 'Leaderboard', emoji: '🏆' },
  { id: 'reports', label: 'Reports', emoji: '📈' },
]

// Shared styles
const sectionTitle = {
  fontSize: 24, fontWeight: 800,
  color: '#1B2B4B', marginBottom: 24, marginTop: 0,
}
const metricsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 16, marginBottom: 24,
}
const metricCard = (color) => ({
  background: 'white', borderRadius: 14,
  padding: 20, textAlign: 'center',
  borderLeft: `4px solid ${color}`,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
})
const miniStatCard = {
  background: 'white', borderRadius: 12,
  padding: '12px 20px', textAlign: 'center',
  border: '1px solid #E2E8F0', flex: 1,
}
const tableContainer = {
  background: 'white', borderRadius: 16,
  overflow: 'hidden', overflowX: 'auto',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}
const tableHeader = {
  padding: '12px 16px', textAlign: 'left',
  fontWeight: 700, fontSize: 12,
  color: '#64748B', textTransform: 'uppercase',
  letterSpacing: '0.5px', borderBottom: '1px solid #E2E8F0',
}
const tableCell = {
  padding: '12px 16px', fontSize: 14,
  color: '#1B2B4B', verticalAlign: 'middle',
}
const searchInput = {
  width: '100%', padding: '12px 16px',
  border: '1.5px solid #E2E8F0', borderRadius: 12,
  fontSize: 15, marginBottom: 16,
  outline: 'none', boxSizing: 'border-box',
}
const primaryBtn = {
  background: '#1B2B4B', color: 'white',
  border: '1px solid #C49A1A', borderRadius: 8,
  padding: '6px 12px', fontSize: 12,
  fontWeight: 700, cursor: 'pointer',
}
const dangerBtn = {
  background: 'white', color: '#EF4444',
  border: '1px solid #EF4444', borderRadius: 8,
  padding: '6px 12px', fontSize: 12,
  fontWeight: 700, cursor: 'pointer',
}

function PasswordGate({ onUnlock }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (key.trim() === ADMIN_KEY) { onUnlock(); return }
    setError(true)
    setKey('')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1B2B4B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(196,154,26,0.4)',
        borderRadius: 24, padding: '40px 32px', width: '100%', maxWidth: 380, textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>
          MyMathsHero — Admin Console
        </h1>
        <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 28px' }}>Internal use only</p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={key}
            onChange={e => { setKey(e.target.value); setError(false) }}
            placeholder="Enter admin key"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10,
              border: error ? '1.5px solid #EF4444' : '1.5px solid rgba(196,154,26,0.4)',
              background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 15,
              outline: 'none', boxSizing: 'border-box', marginBottom: 8,
            }}
          />
          {error && <p style={{ color: '#FCA5A5', fontSize: 13, margin: '0 0 12px' }}>Incorrect key</p>}
          <button type="submit" style={{
            width: '100%', padding: 13, borderRadius: 12, border: 'none',
            background: '#C49A1A', color: '#fff', fontWeight: 700, fontSize: 16,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,154,26,0.4)',
          }}>
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

function AdminConsole() {
  const [activeSection, setActiveSection] = useState('overview')
  const [stats, setStats] = useState(null)
  const [flags, setFlags] = useState({})
  const [comingSoonEnabled, setComingSoonEnabled] = useState(null) // env-driven, read-only
  const [students, setStudents] = useState([])
  const [parents, setParents] = useState([])
  const [waitlist, setWaitlist] = useState({})
  const [questions, setQuestions] = useState({})
  const [loading, setLoading] = useState(true)
  const [sectionLoading, setSectionLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [toast, setToast] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [statsRes, flagsRes, waitlistRes, comingSoonRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/feature-flags'),
        fetch('/api/waitlist'),
        fetch('/api/admin/coming-soon-status'),
      ])
      const [statsData, flagsData, waitlistData, comingSoonData] = await Promise.all([
        statsRes.json(),
        flagsRes.json(),
        waitlistRes.json(),
        comingSoonRes.json(),
      ])
      setStats(statsData)
      if (flagsData && !flagsData.error) setFlags(flagsData)
      setWaitlist(waitlistData || {})
      setComingSoonEnabled(!!comingSoonData?.enabled)
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents() {
    setSectionLoading(true)
    try {
      const res = await fetch('/api/admin/students')
      const data = await res.json()
      setStudents(data.students || [])
    } catch { showToast('Failed to load students', 'error') }
    finally { setSectionLoading(false) }
  }

  async function loadParents() {
    setSectionLoading(true)
    try {
      const res = await fetch('/api/admin/parents')
      const data = await res.json()
      setParents(data.parents || [])
    } catch { showToast('Failed to load parents', 'error') }
    finally { setSectionLoading(false) }
  }

  async function loadQuestionStats() {
    setSectionLoading(true)
    try {
      const res = await fetch('/api/admin/question-stats')
      const data = await res.json()
      setQuestions(data || {})
    } catch { showToast('Failed to load question stats', 'error') }
    finally { setSectionLoading(false) }
  }

  useEffect(() => {
    if (activeSection === 'students' && students.length === 0) loadStudents()
    if (activeSection === 'parents' && parents.length === 0) loadParents()
    if (activeSection === 'questions' && !questions.total) loadQuestionStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection])

  // Feature flags POST expects the FULL flags object (see /api/admin/feature-flags).
  async function toggleFlag(flag) {
    const updated = { ...flags, [flag]: !flags[flag] }
    const previous = flags
    setFlags(updated)
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      const data = await res.json()
      if (data.flags) setFlags(data.flags)
      showToast(`${flag} → ${updated[flag] ? 'ON' : 'OFF'}`, 'success')
    } catch {
      setFlags(previous)
      showToast('Failed to update flag', 'error')
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function runAction(actionId, label) {
    setActionLoading(actionId)
    try {
      let res
      switch (actionId) {
        case 'generate-questions':
          // Endpoint expects { generateAll, targetPerSkill }.
          res = await fetch('/api/admin/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generateAll: true, targetPerSkill: 10 }),
          })
          break
        case 'send-reports':
          res = await fetch('/api/admin/send-all-reports', { method: 'POST' })
          break
        case 'reset-leaderboard':
          if (!confirm('Reset the monthly leaderboard? This cannot be undone.')) return
          res = await fetch('/api/admin/reset-leaderboard', { method: 'POST' })
          break
        case 'refresh-stats':
          await loadAll()
          showToast('Stats refreshed ✅')
          return
        default:
          showToast(`${label} is not available yet`, 'error')
          return
      }
      const data = await res.json()
      if (!res.ok) { showToast(data.error || `${label} failed`, 'error'); return }
      const summary = data.message
        || (data.generated != null ? `Generated ${data.generated} questions` : null)
        || (data.sent != null ? `Sent ${data.sent}, failed ${data.failed}` : null)
        || `${label} completed ✅`
      showToast(summary)
      if (actionId === 'generate-questions') loadQuestionStats()
      if (actionId === 'send-reports' || actionId === 'reset-leaderboard') loadAll()
    } catch {
      showToast(`${label} failed`, 'error')
    } finally {
      setActionLoading('')
    }
  }

  async function resetStudent(studentId) {
    if (!confirm('Reset this student? This clears their progress.')) return
    setActionLoading(`reset-${studentId}`)
    try {
      // Endpoint reads studentId from the query string.
      const res = await fetch(
        `/api/admin/reset-student?studentId=${encodeURIComponent(studentId)}`,
        { method: 'POST' }
      )
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Reset failed', 'error'); return }
      showToast('Student reset ✅')
      loadStudents()
    } catch {
      showToast('Reset failed', 'error')
    } finally {
      setActionLoading('')
    }
  }

  function viewStudentDetail(student) {
    alert(
      `Student: ${student.name}\n` +
      `Username: ${student.username}\n` +
      `Grade: ${student.grade}\n` +
      `XP: ${student.xp}  ·  Coins: ${student.coins}\n` +
      `Streak: ${student.streak}\n` +
      `Accuracy: ${student.accuracy}% over ${student.totalQuestions} answers\n` +
      `Skills mastered: ${student.skillsMastered}`
    )
  }

  async function sendParentReport(parent) {
    const child = parent.children?.[0]
    if (!child) { showToast('This parent has no children to report on', 'error'); return }
    setActionLoading(`report-${parent.id}`)
    try {
      // send-report requires both parentId and studentId.
      const res = await fetch('/api/parent/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: parent.id, studentId: child.id }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Failed to send report', 'error'); return }
      showToast(`Report sent to ${parent.email} ✅`)
    } catch {
      showToast('Failed to send report', 'error')
    } finally {
      setActionLoading('')
    }
  }

  // ── Sections ────────────────────────────────────────────────────────────────

  function renderOverview() {
    const c = stats?.counts || {}
    return (
      <div>
        <h2 style={sectionTitle}>📊 Platform Overview</h2>

        <div style={metricsGrid}>
          {[
            { label: 'Total Students', value: c.students || 0, emoji: '🎓', color: '#2563EB' },
            { label: 'Total Parents', value: c.parents || 0, emoji: '👨‍👩‍👧', color: '#7C3AED' },
            { label: 'Total Questions', value: c.questions || 0, emoji: '📝', color: '#059669' },
            { label: 'Waitlist Signups', value: waitlist?.count || 0, emoji: '📋', color: '#C49A1A' },
            { label: 'Answers Today', value: stats?.answersToday || 0, emoji: '✅', color: '#0891B2' },
            { label: 'Active Students Today', value: stats?.activeToday || 0, emoji: '⚡', color: '#DC2626' },
            { label: 'AI-Generated Qs', value: stats?.aiGenerated || 0, emoji: '🤖', color: '#6D28D9' },
            { label: 'Emails Sent', value: stats?.emailsSent || 0, emoji: '📧', color: '#B45309' },
          ].map((m, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 16, padding: 20,
              borderLeft: `4px solid ${m.color}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{m.emoji}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: m.color }}>
                {(m.value || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontWeight: 800, color: '#1B2B4B', marginBottom: 16, marginTop: 28 }}>
          ⚡ Quick Actions
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {[
            { id: 'refresh-stats', label: 'Refresh Stats', emoji: '🔄', color: '#1B2B4B' },
            { id: 'generate-questions', label: 'Generate Questions', emoji: '🤖', color: '#7C3AED' },
            { id: 'send-reports', label: 'Send Hero Reports', emoji: '📧', color: '#059669' },
            { id: 'reset-leaderboard', label: 'Reset Leaderboard', emoji: '🏆', color: '#DC2626' },
          ].map(action => (
            <button key={action.id}
              onClick={() => runAction(action.id, action.label)}
              disabled={actionLoading === action.id}
              style={{
                background: action.color, color: 'white', border: 'none',
                borderRadius: 12, padding: '12px 20px', fontWeight: 700, fontSize: 14,
                cursor: actionLoading === action.id ? 'wait' : 'pointer',
                opacity: actionLoading === action.id ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {actionLoading === action.id ? '⏳' : action.emoji}
              {actionLoading === action.id ? 'Running...' : action.label}
            </button>
          ))}
        </div>

        {stats?.pendingTeachers?.length > 0 && (
          <>
            <h3 style={{ fontWeight: 800, color: '#1B2B4B', marginBottom: 16, marginTop: 28 }}>
              ⏳ Pending Teacher Approvals ({stats.pendingTeachers.length})
            </h3>
            <p style={{ color: '#64748B', fontSize: 14, marginTop: -8 }}>
              See the <strong>Teachers</strong> section to approve.
            </p>
          </>
        )}
      </div>
    )
  }

  function renderPlatform() {
    const flagConfig = [
      {
        key: 'comingSoonMode',
        label: 'Coming Soon Mode',
        readOnly: true,
        desc: 'Driven by the COMING_SOON_MODE env var (edge-gated). Flip it with a redeploy — not from here.',
      },
      { key: 'teachersEnabled', label: 'Teachers Module', desc: 'Show teacher login, dashboards and class management' },
      { key: 'englishEnabled', label: 'English Module', desc: 'Enable English/Literacy curriculum (My English Hero)' },
      { key: 'scienceEnabled', label: 'Science Module', desc: 'Enable Science curriculum (My Science Hero)' },
      { key: 'forSchoolsPage', label: 'For Schools Page', desc: 'Show the For Schools section in navigation' },
      { key: 'studentDemo', label: 'Student Demo', desc: 'Show Student Demo link in navigation' },
      { key: 'teacherDemo', label: 'Teacher Demo', desc: 'Show Teacher Demo link in navigation' },
    ]

    return (
      <div>
        <h2 style={sectionTitle}>🎛️ Platform Control</h2>

        {/* Coming-soon banner — the real state of the public gate */}
        {comingSoonEnabled !== null && (
          <div style={{
            background: comingSoonEnabled ? '#FEF3C7' : '#DCFCE7',
            border: `2px solid ${comingSoonEnabled ? '#F59E0B' : '#22C55E'}`,
            borderRadius: 16, padding: 20, marginBottom: 20,
          }}>
            <p style={{ fontWeight: 800, color: '#1B2B4B', margin: '0 0 6px', fontSize: 17 }}>
              {comingSoonEnabled ? '🔒 Site is in Coming Soon Mode' : '🚀 Site is LIVE to the public'}
            </p>
            <p style={{ color: '#64748B', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Source of truth:{' '}
              <code style={{ background: '#1B2B4B', color: '#C49A1A', padding: '2px 6px', borderRadius: 4 }}>
                COMING_SOON_MODE
              </code>{' '}
              env var. To flip, set it to <strong>{comingSoonEnabled ? 'false' : 'true'}</strong> in Vercel and redeploy:
              <br />
              <code style={{ background: '#F0F4F8', padding: '4px 8px', borderRadius: 4, display: 'inline-block', marginTop: 6 }}>
                vercel env add COMING_SOON_MODE production
              </code>
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {flagConfig.map(flag => (
            <div key={flag.key} style={{
              background: 'white', borderRadius: 16, padding: 20,
              border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)', opacity: flag.readOnly ? 0.85 : 1,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, color: '#1B2B4B', margin: '0 0 4px', fontSize: 15 }}>
                  {flag.label}
                  {flag.readOnly && (
                    <span style={{ marginLeft: 8, fontSize: 11, background: '#64748B', color: 'white',
                      padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      ENV-CONTROLLED
                    </span>
                  )}
                </p>
                <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>{flag.desc}</p>
              </div>
              {flag.readOnly ? (
                <span style={{
                  background: comingSoonEnabled ? '#F59E0B' : '#22C55E', color: 'white',
                  borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13,
                  whiteSpace: 'nowrap',
                }}>
                  {comingSoonEnabled ? 'GATE: ON' : 'GATE: OFF'}
                </span>
              ) : (
                <button
                  onClick={() => toggleFlag(flag.key)}
                  style={{
                    background: flags[flag.key] ? '#22C55E' : '#94A3B8', color: 'white',
                    border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700,
                    cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', minWidth: 80,
                  }}
                >
                  {flags[flag.key] ? 'ON ✓' : 'OFF'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderStudents() {
    const filtered = students.filter(s =>
      !searchTerm ||
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div>
        <h2 style={sectionTitle}>🎓 Student Management</h2>

        <input
          type="text"
          placeholder="Search by name or username..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={searchInput}
        />

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: students.length, color: '#2563EB' },
            { label: 'Active Today',
              value: students.filter(s => s.lastActive && new Date(s.lastActive) > new Date(Date.now() - 86400000)).length,
              color: '#22C55E' },
            { label: 'Streak ≥ 7',
              value: students.filter(s => (s.streak || 0) >= 7).length, color: '#EA580C' },
            { label: 'Diagnostic Done',
              value: students.filter(s => s.diagnosticComplete).length, color: '#7C3AED' },
          ].map((s, i) => (
            <div key={i} style={miniStatCard}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {sectionLoading ? <LoadingBlock label="Loading students..." /> : (
          <div style={tableContainer}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Name', 'Username', 'Grade', 'XP', 'Streak', 'Accuracy', 'Last Active', 'Actions']
                    .map(h => <th key={h} style={tableHeader}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((student, i) => (
                  <tr key={student.id || i} style={{
                    borderBottom: '1px solid #F0F4F8',
                    background: i % 2 === 0 ? 'white' : '#FAFAFA',
                  }}>
                    <td style={tableCell}>
                      <div style={{ fontWeight: 700 }}>{student.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {student.type === 'school' ? '🏫 School' : '👤 Private'}
                      </div>
                    </td>
                    <td style={tableCell}>
                      <code style={{ background: '#F0F4F8', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                        {student.username}
                      </code>
                    </td>
                    <td style={tableCell}>Grade {student.grade}</td>
                    <td style={tableCell}>
                      <span style={{ color: '#C49A1A', fontWeight: 700 }}>⚡ {student.xp || 0}</span>
                    </td>
                    <td style={tableCell}>🔥 {student.streak || 0}</td>
                    <td style={tableCell}>
                      <span style={{ color: (student.accuracy || 0) >= 70 ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
                        {student.accuracy || 0}%
                      </span>
                    </td>
                    <td style={tableCell}>
                      <span style={{ fontSize: 12, color: '#64748B' }}>
                        {student.lastActive ? new Date(student.lastActive).toLocaleDateString('en-AU') : 'Never'}
                      </span>
                    </td>
                    <td style={tableCell}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => resetStudent(student.id)} style={dangerBtn}
                          disabled={actionLoading === `reset-${student.id}`}>
                          {actionLoading === `reset-${student.id}` ? '…' : 'Reset'}
                        </button>
                        <button onClick={() => viewStudentDetail(student)} style={primaryBtn}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No students found</div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderParents() {
    const filtered = parents.filter(p =>
      !searchTerm ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div>
        <h2 style={sectionTitle}>👨‍👩‍👧 Parent Management</h2>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={searchInput}
        />
        {sectionLoading ? <LoadingBlock label="Loading parents..." /> : (
          <div style={tableContainer}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Name', 'Email', 'Children', 'Plan', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={tableHeader}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((parent, i) => (
                  <tr key={parent.id || i} style={{
                    borderBottom: '1px solid #F0F4F8',
                    background: i % 2 === 0 ? 'white' : '#FAFAFA',
                  }}>
                    <td style={tableCell}><div style={{ fontWeight: 700 }}>{parent.name}</div></td>
                    <td style={tableCell}><span style={{ fontSize: 13 }}>{parent.email}</span></td>
                    <td style={tableCell}>
                      {parent.children?.length || 0} child
                      {(parent.children?.length || 0) !== 1 ? 'ren' : ''}
                    </td>
                    <td style={tableCell}>
                      <span style={{
                        background: parent.plan === 'premium' ? '#1B2B4B' : '#F0F4F8',
                        color: parent.plan === 'premium' ? '#C49A1A' : '#64748B',
                        padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      }}>
                        {parent.plan || 'free'}
                      </span>
                    </td>
                    <td style={tableCell}>
                      <span style={{ fontSize: 12, color: '#64748B' }}>
                        {parent.createdAt ? new Date(parent.createdAt).toLocaleDateString('en-AU') : '—'}
                      </span>
                    </td>
                    <td style={tableCell}>
                      <button onClick={() => sendParentReport(parent)} style={primaryBtn}
                        disabled={actionLoading === `report-${parent.id}`}>
                        {actionLoading === `report-${parent.id}` ? 'Sending…' : 'Send Report'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No parents found</div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderTeachers() {
    const pending = stats?.pendingTeachers || []
    return (
      <div>
        <h2 style={sectionTitle}>🧑‍🏫 Teachers</h2>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={miniStatCard}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B' }}>
              {stats?.counts?.teachersPending || 0}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Pending</div>
          </div>
          <div style={miniStatCard}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#22C55E' }}>
              {stats?.counts?.teachersApproved || 0}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Approved</div>
          </div>
        </div>
        <div style={tableContainer}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Name', 'School', 'Grade', 'Email', 'Registered', 'Action'].map(h => (
                  <th key={h} style={tableHeader}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending.map((t, i) => (
                <tr key={t.id || i} style={{ borderBottom: '1px solid #F0F4F8' }}>
                  <td style={tableCell}><strong>{t.name}</strong></td>
                  <td style={tableCell}>{t.school}</td>
                  <td style={tableCell}>{t.grade}</td>
                  <td style={tableCell}><span style={{ fontSize: 13 }}>{t.email}</span></td>
                  <td style={tableCell}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU') : '—'}
                    </span>
                  </td>
                  <td style={tableCell}>
                    <button onClick={() => approveTeacher(t.id)} style={primaryBtn}
                      disabled={actionLoading === `approve-${t.id}`}>
                      {actionLoading === `approve-${t.id}` ? '…' : '✓ Approve'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pending.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
              No pending teachers — all clear!
            </div>
          )}
        </div>
      </div>
    )
  }

  async function approveTeacher(teacherId) {
    setActionLoading(`approve-${teacherId}`)
    try {
      const res = await fetch('/api/admin/approve-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId }),
      })
      if (!res.ok) { showToast('Approval failed', 'error'); return }
      showToast('Teacher approved ✅')
      loadAll()
    } catch {
      showToast('Approval failed', 'error')
    } finally {
      setActionLoading('')
    }
  }

  function renderQuestions() {
    return (
      <div>
        <h2 style={sectionTitle}>📝 Question Management</h2>

        <div style={metricsGrid}>
          {[
            { label: 'Total Questions', value: questions.total || 0, emoji: '📝', color: '#2563EB' },
            { label: 'AI Generated', value: questions.aiGenerated || 0, emoji: '🤖', color: '#7C3AED' },
            { label: 'Skills Covered', value: questions.skillsCovered || 0, emoji: '📚', color: '#059669' },
            { label: 'Avg Per Skill', value: questions.avgPerSkill || 0, emoji: '📊', color: '#C49A1A' },
          ].map((m, i) => (
            <div key={i} style={metricCard(m.color)}>
              <div style={{ fontSize: 28 }}>{m.emoji}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{m.label}</div>
            </div>
          ))}
        </div>

        {questions.skillsBelow?.length > 0 && (
          <>
            <h3 style={{ fontWeight: 800, color: '#1B2B4B', marginBottom: 16, marginTop: 24 }}>
              ⚠️ Skills Needing More Questions (below 15)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {questions.skillsBelow.map((skill, i) => (
                <div key={i} style={{
                  background: '#FEF3C7', border: '1px solid #F59E0B',
                  borderRadius: 8, padding: '6px 12px', fontSize: 13,
                }}>
                  <strong>{skill.skillId}</strong>: {skill.count} questions
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => runAction('generate-questions', 'Generate Questions')}
          disabled={actionLoading === 'generate-questions'}
          style={{
            background: '#7C3AED', color: 'white', border: 'none', borderRadius: 12,
            padding: '14px 28px', fontWeight: 800, fontSize: 15,
            cursor: actionLoading === 'generate-questions' ? 'wait' : 'pointer', marginBottom: 24,
          }}
        >
          {actionLoading === 'generate-questions' ? '🤖 Generating…' : '🤖 Generate Questions for All Skills'}
        </button>

        {sectionLoading ? <LoadingBlock label="Loading question stats..." /> : questions.bySkill?.length > 0 && (
          <div style={tableContainer}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Skill ID', 'Count', 'AI Generated', 'Status'].map(h => (
                    <th key={h} style={tableHeader}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questions.bySkill.map((skill, i) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid #F0F4F8',
                    background: skill.count < 10 ? '#FFFBEB' : 'white',
                  }}>
                    <td style={tableCell}><code style={{ fontSize: 13 }}>{skill.skillId}</code></td>
                    <td style={tableCell}><strong>{skill.count}</strong></td>
                    <td style={tableCell}>{skill.aiGenerated || 0}</td>
                    <td style={tableCell}>
                      <span style={{
                        background: skill.count >= 20 ? '#DCFCE7' : skill.count >= 10 ? '#FFFBEB' : '#FEE2E2',
                        color: skill.count >= 20 ? '#166534' : skill.count >= 10 ? '#92400E' : '#991B1B',
                        padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      }}>
                        {skill.count >= 20 ? '✅ Good' : skill.count >= 10 ? '⚠️ Low' : '❌ Critical'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function renderWaitlist() {
    return (
      <div>
        <h2 style={sectionTitle}>📋 Waitlist</h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={metricCard('#C49A1A')}>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#C49A1A' }}>{waitlist?.count || 0}</div>
            <div style={{ fontSize: 14, color: '#64748B' }}>Total Signups</div>
          </div>
        </div>
        <div style={tableContainer}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['#', 'Email', 'Name', 'Date'].map(h => <th key={h} style={tableHeader}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(waitlist?.recent || []).map((entry, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F0F4F8' }}>
                  <td style={tableCell}><strong>#{entry.position}</strong></td>
                  <td style={tableCell}>{entry.email}</td>
                  <td style={tableCell}>
                    <span style={{ fontSize: 13, color: '#64748B' }}>{entry.name || '—'}</span>
                  </td>
                  <td style={tableCell}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-AU') : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(waitlist?.recent || []).length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No signups yet</div>
          )}
        </div>
      </div>
    )
  }

  function renderEmails() {
    return (
      <div>
        <h2 style={sectionTitle}>📧 Email Management</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Send Daily Hero Reports to All Parents',
              desc: 'Sends a progress report email for every student to their parent.',
              action: 'send-reports', color: '#059669', enabled: true },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 14, padding: 20, border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div>
                <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#1B2B4B' }}>{item.label}</p>
                <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>{item.desc}</p>
              </div>
              <button
                onClick={() => runAction(item.action, item.label)}
                disabled={actionLoading === item.action}
                style={{
                  background: item.color, color: 'white', border: 'none', borderRadius: 10,
                  padding: '10px 20px', fontWeight: 700,
                  cursor: actionLoading === item.action ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {actionLoading === item.action ? '⏳' : '▶ Send'}
              </button>
            </div>
          ))}
        </div>
        <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 16 }}>
          Streak reminders and welcome re-sends aren't wired to endpoints yet — add
          <code style={{ background: '#F0F4F8', padding: '1px 5px', borderRadius: 4, margin: '0 4px' }}>
            /api/admin/send-streak-reminders
          </code>
          when ready.
        </p>
      </div>
    )
  }

  function renderLeaderboard() {
    return (
      <div>
        <h2 style={sectionTitle}>🏆 Leaderboard</h2>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => runAction('reset-leaderboard', 'Reset Leaderboard')}
            disabled={actionLoading === 'reset-leaderboard'}
            style={{
              background: '#DC2626', color: 'white', border: 'none', borderRadius: 12,
              padding: '12px 24px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {actionLoading === 'reset-leaderboard' ? '⏳ Resetting…' : '🔄 Reset Monthly Leaderboard'}
          </button>
        </div>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          The leaderboard resets on the 1st of each month. Use the button above to reset it manually.
        </p>
      </div>
    )
  }

  function renderSubscriptions() {
    return (
      <div>
        <h2 style={sectionTitle}>💳 Subscriptions</h2>
        <div style={{ background: '#FFFBEB', border: '2px solid #C49A1A', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h3 style={{ color: '#1B2B4B', fontWeight: 800, marginBottom: 8 }}>⚠️ Stripe Not Yet Configured</h3>
          <p style={{ color: '#64748B', margin: '0 0 16px' }}>
            Add your Stripe live keys to Vercel to enable payments.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'].map(key => (
              <code key={key} style={{ background: '#F0F4F8', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>
                vercel env add {key} production
              </code>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { plan: 'Standard', price: '$14.99/mo or $149.90/yr', features: 'All Maths, no Ask Hero' },
            { plan: 'Premium', price: '$24.99/mo or $249.90/yr', features: 'Everything + Ask Hero + Arcade' },
            { plan: 'Pre-launch', price: '$19.99/yr', features: 'Full Premium — founding families' },
            { plan: 'Sibling add-on', price: '+$10/mo', features: 'Per additional child' },
          ].map((p, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 12, padding: 16, border: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
            }}>
              <div>
                <strong style={{ color: '#1B2B4B' }}>{p.plan}</strong>
                <span style={{ color: '#64748B', fontSize: 13, marginLeft: 8 }}>{p.features}</span>
              </div>
              <strong style={{ color: '#C49A1A' }}>{p.price}</strong>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderSupport() {
    return (
      <div>
        <h2 style={sectionTitle}>🎫 Support Tickets</h2>
        <div style={{ background: '#F0F4F8', borderRadius: 16, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 48 }}>🚧</p>
          <p style={{ fontWeight: 700, color: '#1B2B4B' }}>Support ticket system coming soon</p>
          <p style={{ color: '#64748B' }}>
            Students and parents can email support@mymathshero.com.au for now.
          </p>
        </div>
      </div>
    )
  }

  function renderAI() {
    return (
      <div>
        <h2 style={sectionTitle}>🤖 AI &amp; Voice</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Question Generation', model: 'Claude Haiku 4.5 (OpenRouter)',
              status: 'active', desc: 'Generates new questions when stock is low' },
            { label: 'Hint System (Ask Hero)', model: 'Claude Haiku 4.5 (OpenRouter)',
              status: 'active', desc: 'Provides step-by-step hints to students' },
            { label: 'Parent Insights', model: 'Claude Sonnet 4.5 (OpenRouter)',
              status: 'active', desc: 'Daily AI insight for parent dashboard' },
            { label: 'Teacher Insights', model: 'Claude Sonnet 4.5 (OpenRouter)',
              status: 'active', desc: 'Class analytics for teachers' },
            { label: 'Hero Voice (Ask Hero)', model: 'OpenAI TTS nova',
              status: 'check', desc: 'Text to speech for Ask Hero hints' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 14, padding: 18, border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <p style={{ fontWeight: 700, margin: '0 0 2px', color: '#1B2B4B' }}>{item.label}</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 4px' }}>{item.model}</p>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{item.desc}</p>
              </div>
              <span style={{
                background: item.status === 'active' ? '#DCFCE7' : '#FEF3C7',
                color: item.status === 'active' ? '#166534' : '#92400E',
                padding: '4px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              }}>
                {item.status === 'active' ? '✅ Active' : '⚠️ Check Key'}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderReports() {
    return (
      <div>
        <h2 style={sectionTitle}>📈 Reports</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Active Students Today', value: stats?.activeToday || 0, color: '#2563EB', emoji: '⚡' },
            { label: 'Answers Today', value: stats?.answersToday || 0, color: '#059669', emoji: '✅' },
            { label: 'Active This Week', value: stats?.weeklyActive || 0, color: '#7C3AED', emoji: '📅' },
            { label: 'New Students This Week', value: stats?.newThisWeek || 0, color: '#C49A1A', emoji: '🆕' },
            { label: 'Skills Mastered This Week', value: stats?.masteredThisWeek || 0, color: '#EA580C', emoji: '🏆' },
            { label: 'Sessions Completed', value: stats?.counts?.sessionsCompleted || 0, color: '#0891B2', emoji: '📚' },
          ].map((m, i) => (
            <div key={i} style={metricCard(m.color)}>
              <div style={{ fontSize: 28 }}>{m.emoji}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.color }}>
                {(m.value || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: '#64748B' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const sectionRenderers = {
    overview: renderOverview,
    platform: renderPlatform,
    students: renderStudents,
    parents: renderParents,
    teachers: renderTeachers,
    questions: renderQuestions,
    ai: renderAI,
    emails: renderEmails,
    waitlist: renderWaitlist,
    subscriptions: renderSubscriptions,
    support: renderSupport,
    leaderboard: renderLeaderboard,
    reports: renderReports,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0F4F8',
      fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <div style={{
        width: 240, background: '#1B2B4B', flexShrink: 0, position: 'sticky',
        top: 0, height: '100vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 18, margin: 0 }}>
            MyMaths<span style={{ color: '#C49A1A' }}>Hero</span>
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '4px 0 0' }}>Admin Console</p>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => { setActiveSection(section.id); setSearchTerm('') }}
              style={{
                width: '100%', textAlign: 'left',
                background: activeSection === section.id ? 'rgba(196,154,26,0.15)' : 'transparent',
                borderLeft: activeSection === section.id ? '3px solid #C49A1A' : '3px solid transparent',
                color: activeSection === section.id ? '#C49A1A' : 'rgba(255,255,255,0.65)',
                border: 'none', padding: '12px 20px', cursor: 'pointer', fontSize: 14,
                fontWeight: activeSection === section.id ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{section.emoji}</span>
              {section.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <a href="/" style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ← Back to site
          </a>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {toast && (
          <div style={{
            position: 'fixed', top: 24, right: 24,
            background: toast.type === 'error' ? '#EF4444' : '#22C55E',
            color: 'white', borderRadius: 12, padding: '12px 20px', fontWeight: 700,
            zIndex: 999, fontSize: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', maxWidth: 360,
          }}>
            {toast.message}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <p style={{ fontSize: 48 }}>🤖</p>
            <p style={{ color: '#64748B', fontWeight: 600 }}>Loading admin data...</p>
          </div>
        ) : (
          (sectionRenderers[activeSection] || renderOverview)()
        )}
      </div>
    </div>
  )
}

function LoadingBlock({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>
      <p style={{ fontSize: 32, margin: '0 0 8px' }}>⏳</p>
      <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
    </div>
  )
}

function AdminPageInner() {
  const searchParams = useSearchParams()
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    if (searchParams.get('key') === ADMIN_KEY) setUnlocked(true)
  }, [searchParams])

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />
  return <AdminConsole />
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#1B2B4B' }} />}>
      <AdminPageInner />
    </Suspense>
  )
}
