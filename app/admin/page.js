'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const ADMIN_KEY = 'mymathshero_admin_2026'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = '#1B2B4B', sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${color}33`,
      borderRadius: 16, padding: '20px 24px',
      flex: '1 1 140px', minWidth: 140,
    }}>
      <p style={{ color: '#64748B', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', margin: '0 0 8px' }}>{label}</p>
      <p style={{ color, fontSize: 36, fontWeight: 800, margin: '0 0 2px', lineHeight: 1 }}>
        {value ?? '—'}
      </p>
      {sub && <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ color: '#CBD5E1', fontSize: 16, fontWeight: 700, margin: '0 0 14px',
      paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </h2>
  )
}

function Table({ cols, rows, renderRow, empty = 'No records.' }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            {cols.map(c => (
              <th key={c} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748B',
                fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={cols.length} style={{ padding: '20px 16px', color: '#475569',
                textAlign: 'center' }}>{empty}</td></tr>
            : rows.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)',
                transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {renderRow(row)}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
}

function Td({ children, mono }) {
  return (
    <td style={{ padding: '11px 16px', color: '#CBD5E1', whiteSpace: 'nowrap',
      fontFamily: mono ? 'monospace' : 'inherit' }}>
      {children}
    </td>
  )
}

// ── Password Gate ─────────────────────────────────────────────────────────────

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
      minHeight: '100vh',
      background: '#1B2B4B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(196,154,26,0.4)',
        borderRadius: 24, padding: '40px 32px', width: '100%', maxWidth: 380, textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>MyMathsHero — Admin Console</h1>
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
            background: '#C49A1A',
            color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(196,154,26,0.4)',
          }}>
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvingId, setApprovingId] = useState(null)
  const [approvedIds, setApprovedIds] = useState(new Set())

  // Question generator state
  const [genLoading, setGenLoading] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const [genError, setGenError] = useState('')
  const [genProgress, setGenProgress] = useState('')

  // Feature flags state
  const [flags, setFlags] = useState({
    teachersEnabled: false,
    englishEnabled: false,
    scienceEnabled: false,
  })

  useEffect(() => {
    fetch('/api/admin/feature-flags')
      .then(r => r.json())
      .then(data => { if (data && !data.error) setFlags(f => ({ ...f, ...data })) })
      .catch(() => {})
  }, [])

  async function toggleFlag(key) {
    const updated = { ...flags, [key]: !flags[key] }
    setFlags(updated)
    try {
      await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } catch {
      // Roll back on failure so the toggle reflects persisted state.
      setFlags(flags)
    }
  }

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats')
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to load'); return }
      setData(json)
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  async function approveTeacher(teacherId, name) {
    setApprovingId(teacherId)
    try {
      const res = await fetch('/api/admin/approve-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId }),
      })
      if (res.ok) {
        setApprovedIds(prev => new Set([...prev, teacherId]))
        // Refresh counts
        await fetchStats()
      }
    } finally { setApprovingId(null) }
  }

  async function generateAllQuestions() {
    setGenLoading(true)
    setGenResult(null)
    setGenError('')
    setGenProgress('Analysing skills and existing questions…')
    try {
      const res = await fetch('/api/admin/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateAll: true, targetPerSkill: 10 }),
      })
      const json = await res.json()
      if (!res.ok) { setGenError(json.error || 'Generation failed'); return }
      setGenResult(json)
      setGenProgress('')
      // Refresh question count in stats
      await fetchStats()
    } catch (e) {
      setGenError('Network error during generation')
      setGenProgress('')
    } finally {
      setGenLoading(false)
    }
  }

  const s = data?.counts

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1B2B4B',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: '#fff', padding: '0 0 60px',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/assets/logos/logo-icon.png" alt="MyMathsHero" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div>
            <span style={{ fontWeight: 800, fontSize: 18 }}>MyMathsHero</span>
            <span style={{ color: '#C49A1A', fontSize: 14, marginLeft: 8 }}>Admin Console</span>
          </div>
        </div>
        <button onClick={fetchStats} disabled={loading} style={{
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '7px 16px', color: '#94A3B8',
          fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12, padding: '12px 18px', color: '#FCA5A5', marginBottom: 24 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
          <StatCard label="Total Students" value={s?.students} color="#1B2B4B" />
          <StatCard label="Total Parents" value={s?.parents} color="#C49A1A" />
          <StatCard label="Pending Teachers" value={s?.teachersPending} color="#F59E0B"
            sub={s?.teachersApproved != null ? `${s.teachersApproved} approved` : undefined} />
          <StatCard label="Waitlist" value={s?.waitlist} color="#16A34A" />
          <StatCard label="Demo Requests" value={s?.demoRequests} color="#0891B2" />
          <StatCard label="Questions" value={s?.questions} color="#C49A1A" />
        </div>

        {/* Pending Teachers */}
        <div style={{ marginBottom: 40 }}>
          <SectionTitle>⏳ Pending Teacher Approvals ({data?.pendingTeachers?.length ?? 0})</SectionTitle>
          <Table
            cols={['Name', 'School', 'Grade', 'Email', 'Registered', 'Action']}
            rows={(data?.pendingTeachers ?? []).filter(t => !approvedIds.has(t.id))}
            empty="No pending teachers — all clear!"
            renderRow={t => (
              <>
                <Td>{t.name}</Td>
                <Td>{t.school}</Td>
                <Td>{t.grade}</Td>
                <Td mono>{t.email}</Td>
                <Td>{fmtDate(t.created_at)}</Td>
                <td style={{ padding: '8px 16px' }}>
                  <button
                    onClick={() => approveTeacher(t.id, t.name)}
                    disabled={approvingId === t.id}
                    style={{
                      background: approvingId === t.id
                        ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.15)',
                      border: '1px solid rgba(22,163,74,0.4)',
                      borderRadius: 8, padding: '6px 14px', color: '#4ADE80',
                      fontSize: 13, fontWeight: 700, cursor: approvingId === t.id
                        ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {approvingId === t.id ? 'Approving…' : '✓ Approve'}
                  </button>
                </td>
              </>
            )}
          />
        </div>

        {/* Recent Waitlist */}
        <div style={{ marginBottom: 40 }}>
          <SectionTitle>📋 Recent Waitlist Signups</SectionTitle>
          <Table
            cols={['Name', 'Email', 'Role', 'Date Joined']}
            rows={data?.recentWaitlist ?? []}
            empty="No waitlist signups yet."
            renderRow={r => (
              <>
                <Td>{r.name}</Td>
                <Td mono>{r.email}</Td>
                <Td>
                  <span style={{
                    background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
                    borderRadius: 6, padding: '2px 8px', fontSize: 12, color: '#93C5FD',
                  }}>{r.role}</span>
                </Td>
                <Td>{fmtDate(r.created_at)}</Td>
              </>
            )}
          />
        </div>

        {/* Recent Demo Requests */}
        <div style={{ marginBottom: 40 }}>
          <SectionTitle>🏫 Recent Demo Requests</SectionTitle>
          <Table
            cols={['Name', 'School', 'Role', 'Email', 'Phone', 'Date']}
            rows={data?.recentDemoRequests ?? []}
            empty="No demo requests yet."
            renderRow={r => (
              <>
                <Td>{r.name}</Td>
                <Td>{r.school_name}</Td>
                <Td>{r.role}</Td>
                <Td mono>{r.email}</Td>
                <Td>{r.phone || '—'}</Td>
                <Td>{fmtDate(r.created_at)}</Td>
              </>
            )}
          />
        </div>

        {/* Generate Questions */}
        <div>
          <SectionTitle>🤖 AI Question Generator</SectionTitle>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '24px 28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <p style={{ color: '#CBD5E1', fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>
                  Generate Questions for All Skills
                </p>
                <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
                  Checks every skill in the curriculum graph and generates questions for any with fewer than 10.
                  Uses <strong style={{ color: '#60A5FA' }}>qwen/qwen-2.5-72b-instruct</strong> via OpenRouter.
                  Currently <strong style={{ color: '#60A5FA' }}>{s?.questions ?? '…'}</strong> questions in the bank.
                </p>
              </div>
              <button
                onClick={generateAllQuestions}
                disabled={genLoading}
                style={{
                  padding: '11px 22px', borderRadius: 12, border: 'none',
                  background: genLoading ? 'rgba(255,255,255,0.08)' : '#C49A1A',
                  color: genLoading ? '#64748B' : '#fff',
                  fontWeight: 700, fontSize: 14, cursor: genLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                  boxShadow: genLoading ? 'none' : '0 4px 16px rgba(196,154,26,0.4)',
                }}
              >
                {genLoading ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid #475569',
                      borderTopColor: '#94A3B8', borderRadius: '50%',
                      display: 'inline-block', animation: '_spin 0.7s linear infinite' }} />
                    Generating…
                  </>
                ) : '✨ Generate All Missing'}
              </button>
            </div>

            {/* Progress message */}
            {genLoading && genProgress && (
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)',
                borderRadius: 10, padding: '10px 16px', color: '#93C5FD', fontSize: 13,
                marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ animation: '_spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
                {genProgress}
              </div>
            )}

            {/* Error */}
            {genError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '10px 16px', color: '#FCA5A5', fontSize: 13, marginBottom: 16 }}>
                ⚠️ {genError}
              </div>
            )}

            {/* Result summary */}
            {genResult && (
              <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)',
                borderRadius: 12, padding: '16px 20px' }}>
                <p style={{ color: '#4ADE80', fontWeight: 700, fontSize: 15, margin: '0 0 12px' }}>
                  ✅ Generated {genResult.generated} questions across {genResult.skillsProcessed} skills
                  {genResult.errors > 0 && <span style={{ color: '#FCA5A5', marginLeft: 8 }}>({genResult.errors} errors)</span>}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {(genResult.details || []).map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12, color: d.error ? '#FCA5A5' : '#94A3B8' }}>
                      <span style={{ fontFamily: 'monospace', color: '#60A5FA', minWidth: 160 }}>{d.skillId}</span>
                      <span>{d.name}</span>
                      <span style={{ marginLeft: 'auto', color: d.error ? '#FCA5A5' : '#4ADE80' }}>
                        {d.error ? `⚠ ${d.error.slice(0, 60)}` : `+${d.generated} (was ${d.existing})`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>

        {/* Feature Flags Section */}
        <div style={{ marginBottom: 40 }}>
          <SectionTitle>🚦 Feature Flags</SectionTitle>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: 24,
          }}>
            <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 20 }}>
              Toggle features on/off without code changes. Changes apply to all visitors.
            </p>
            {[
              { key: 'teachersEnabled', label: 'Teacher Features', desc: 'Login, dashboard, onboarding, For Schools page' },
              { key: 'englishEnabled', label: 'English Subject', desc: 'English questions and tabs' },
              { key: 'scienceEnabled', label: 'Science Subject', desc: 'Science questions and tabs' },
            ].map(flag => (
              <div key={flag.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#fff', margin: 0 }}>{flag.label}</p>
                  <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>{flag.desc}</p>
                </div>
                <button
                  onClick={() => toggleFlag(flag.key)}
                  style={{
                    background: flags[flag.key] ? '#22C55E' : 'rgba(255,255,255,0.1)',
                    color: flags[flag.key] ? 'white' : '#94A3B8',
                    border: 'none', borderRadius: 20,
                    padding: '6px 20px', fontWeight: 700,
                    cursor: 'pointer', fontSize: 14,
                    transition: 'all 0.2s',
                    minWidth: 64,
                  }}
                >
                  {flags[flag.key] ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminPageInner() {
  const searchParams = useSearchParams()
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    if (searchParams.get('key') === ADMIN_KEY) setUnlocked(true)
  }, [searchParams])

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />
  return <AdminDashboard />
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#1B2B4B' }} />}>
      <AdminPageInner />
    </Suspense>
  )
}
