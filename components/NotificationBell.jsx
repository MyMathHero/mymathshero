'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Persistent notification center for parents. Polls /api/notifications, shows an
// unread badge, opens a dropdown feed, marks read, and routes clicks to in-app
// targets via onOpenLink(link) (e.g. 'support' opens the support modal).
export default function NotificationBell({ onOpenLink }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setItems(Array.isArray(data.notifications) ? data.notifications : [])
      setUnread(data.unreadCount || 0)
    } catch { /* ignore */ }
  }, [])

  // Initial load + light polling while mounted.
  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  // Close on outside click.
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  async function markAllRead() {
    setUnread(0)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    try { await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'readAll' }) }) } catch {}
  }

  async function clickItem(n) {
    if (!n.read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(u => Math.max(0, u - 1))
      try { await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', id: n.id }) }) } catch {}
    }
    if (n.link && onOpenLink) { setOpen(false); onOpenLink(n.link) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={toggle} aria-label="Notifications"
        style={{ position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 999, width: 42, height: 42, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 18, height: 18, padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 50, width: 340, maxWidth: '90vw', maxHeight: 440, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-color)' }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>Notifications</strong>
            {unread > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Mark all read</button>}
          </div>
          <div style={{ overflowY: 'auto' }}>
            {items.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, padding: '28px 16px' }}>You're all caught up 🎉</p>
            ) : items.map(n => (
              <button key={n.id} onClick={() => clickItem(n)}
                style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 10, padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: n.link ? 'pointer' : 'default', background: n.read ? 'transparent' : 'rgba(196,154,26,0.08)' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{n.icon || '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13.5 }}>{n.title}</div>
                  {n.body && <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                  <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 3, opacity: 0.7 }}>{timeAgo(n.createdAt)}</div>
                </div>
                {!n.read && <span style={{ width: 8, height: 8, borderRadius: 999, background: GOLD, flexShrink: 0, marginTop: 5 }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
