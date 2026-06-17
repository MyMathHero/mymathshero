'use client'
import { useState, useEffect, useCallback } from 'react'

const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'
const CATEGORIES = [
  { value: 'billing', label: '💳 Billing & payments' },
  { value: 'technical', label: '🛠️ Technical problem' },
  { value: 'learning', label: '📚 Learning & content' },
  { value: 'account', label: '👤 Account' },
  { value: 'other', label: '💬 Something else' },
]
const STATUS_COLOR = { open: '#2563EB', in_progress: GOLD, resolved: '#22C55E', closed: '#94A3B8' }

const fmt = (d) => d ? new Date(d).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : ''

// Threaded support tickets for a logged-in parent or student. Auth rides on the
// httpOnly cookie, so no token handling needed here. `onClose` dismisses the modal.
export default function SupportTickets({ onClose }) {
  const [view, setView] = useState('list') // list | new | thread
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('technical')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/support')
      const data = await res.json()
      setTickets(Array.isArray(data.tickets) ? data.tickets : [])
    } catch { /* show empty */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  async function openThread(id) {
    setView('thread'); setActive({ id, loading: true }); setReply('')
    try {
      const res = await fetch(`/api/support?id=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (res.ok) setActive(data.ticket); else { setError(data.error || 'Could not load ticket'); setView('list') }
    } catch { setError('Network error'); setView('list') }
  }

  async function createTicket(e) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) { setError('Please add a subject and a message.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), category, message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not create ticket'); return }
      setSubject(''); setMessage(''); setCategory('technical')
      await loadList()
      setView('list')
    } catch { setError('Network error') } finally { setBusy(false) }
  }

  async function sendReply() {
    if (!reply.trim() || !active?.id) return
    setBusy(true)
    try {
      const res = await fetch(`/api/support?id=${encodeURIComponent(active.id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (res.ok) { setReply(''); await openThread(active.id); loadList() }
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `3px solid ${GOLD}` }}>
        {/* Header */}
        <div style={{ background: NAVY, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {view !== 'list' && (
              <button onClick={() => { setView('list'); setError('') }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>←</button>
            )}
            <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>
              🎫 {view === 'new' ? 'New ticket' : view === 'thread' ? 'Ticket' : 'Help & Support'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: 999, width: 30, height: 30, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {error && <div style={{ background: '#FEF2F2', color: '#B91C1C', fontSize: 13, padding: '8px 16px' }}>{error}</div>}

        {/* LIST */}
        {view === 'list' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <button onClick={() => { setView('new'); setError('') }}
              style={{ width: '100%', background: GOLD, color: 'white', border: 'none', borderRadius: 12, padding: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>
              + New support ticket
            </button>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748B' }}>Loading…</p>
            ) : tickets.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748B', fontSize: 14 }}>No tickets yet. Need help? Open one above.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tickets.map(t => (
                  <button key={t.id} onClick={() => openThread(t.id)}
                    style={{ textAlign: 'left', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: STATUS_COLOR[t.status] || '#94A3B8', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: NAVY, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t.unreadForUser && <span style={{ background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px' }}>NEW</span>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, textTransform: 'capitalize' }}>{(t.status || '').replace('_', ' ')} · {fmt(t.updatedAt)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NEW */}
        {view === 'new' && (
          <form onSubmit={createTicket} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>What's it about?
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14 }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Subject
              <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={140} placeholder="Short summary"
                style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Message
              <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} rows={5} placeholder="Tell us what's happening…"
                style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
            </label>
            <button type="submit" disabled={busy}
              style={{ background: NAVY, color: 'white', border: 'none', borderRadius: 12, padding: 13, fontWeight: 700, fontSize: 14, cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Sending…' : 'Submit ticket'}
            </button>
          </form>
        )}

        {/* THREAD */}
        {view === 'thread' && active && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#F8FAFC' }}>
              {active.loading ? <p style={{ textAlign: 'center', color: '#64748B' }}>Loading…</p> : (
                <>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    <strong style={{ color: NAVY }}>{active.subject}</strong> · <span style={{ textTransform: 'capitalize' }}>{(active.status || '').replace('_', ' ')}</span>
                  </div>
                  {(active.messages || []).map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.5,
                        background: m.from === 'user' ? GOLD : NAVY, color: 'white' }}>
                        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 3 }}>{m.from === 'user' ? 'You' : (m.authorName || 'Support')} · {fmt(m.createdAt)}</div>
                        {m.body}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            {!active.loading && active.status !== 'closed' && (
              <div style={{ borderTop: '1px solid #E2E8F0', padding: 12, display: 'flex', gap: 8 }}>
                <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()}
                  placeholder="Reply…" style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14 }} />
                <button onClick={sendReply} disabled={busy || !reply.trim()}
                  style={{ background: reply.trim() ? GOLD : '#E2E8F0', color: 'white', border: 'none', borderRadius: 10, padding: '0 16px', fontWeight: 700, cursor: reply.trim() ? 'pointer' : 'default' }}>
                  Send
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
