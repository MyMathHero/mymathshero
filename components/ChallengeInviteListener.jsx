'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import CharacterAvatar from './CharacterAvatar'

// App-wide challenge presence + incoming-request popup. Mounted once on the
// student dashboard so a student is invitable and can Accept/Decline a Hero
// Speed Challenge WITHOUT being on the Challenge screen. Accepting routes them
// into the Challenge tab with the accepted match already active.
//
// Kept separate from ChallengeArena (which handles the in-arena search); this
// only listens for INCOMING invites while the student is elsewhere.

const isEmoji = (v) => typeof v === 'string' && !/^[a-z0-9_]+$/i.test(v.trim())
const gradeLabel = (g) => (g == null ? '' : g === 0 ? 'Prep' : `Grade ${g}`)

function Face({ from, size = 64 }) {
  if (from?.photo) return <img src={from.photo} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  if (from?.avatarConfig || (from?.avatar && !isEmoji(from.avatar))) {
    return <CharacterAvatar id={from.avatar} config={from.avatarConfig} size={size} />
  }
  return <CharacterAvatar id={null} size={size} />
}

export default function ChallengeInviteListener({ studentId, enabled = true, onAccepted }) {
  const [incoming, setIncoming] = useState(null)
  const router = useRouter()
  const beatRef = useRef(null)
  const inboxRef = useRef(null)

  const post = useCallback(async (body) => {
    try {
      const res = await fetch('/api/student/challenge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, ...body }),
      })
      return res.json()
    } catch { return null }
  }, [studentId])

  // App-wide availability heartbeat — marks the student online + invitable even
  // when they're not on the Challenge screen.
  useEffect(() => {
    if (!studentId || !enabled) return
    const beat = () => {
      fetch('/api/student/presence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, available: true }),
      }).catch(() => {})
    }
    beat()
    beatRef.current = setInterval(beat, 30000)
    return () => clearInterval(beatRef.current)
  }, [studentId, enabled])

  // Poll for an incoming invite.
  useEffect(() => {
    if (!studentId || !enabled) return
    const tick = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      const d = await post({ action: 'inbox' })
      setIncoming(d?.invite || null)
    }
    tick()
    inboxRef.current = setInterval(tick, 3000)
    return () => clearInterval(inboxRef.current)
  }, [studentId, enabled, post])

  async function accept() {
    const inv = incoming
    if (!inv) return
    setIncoming(null)
    const data = await post({ action: 'accept', inviteId: inv.inviteId })
    if (data?.match) {
      // Hand off to the Challenge tab, which will resume the active match.
      onAccepted?.(data.match)
    }
  }
  async function decline() {
    const inv = incoming
    setIncoming(null)
    if (inv) await post({ action: 'decline', inviteId: inv.inviteId })
  }

  if (!incoming?.from) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 26, maxWidth: 320, width: '100%', textAlign: 'center', border: '2px solid var(--accent-gold)' }}>
        <p style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Challenge request</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <Face from={incoming.from} size={64} />
        </div>
        <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 19, margin: '0 0 2px' }}>{incoming.from.firstName}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 4px' }}>{gradeLabel(incoming.from.grade)}</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 18px' }}>invited you to a Hero Speed Challenge!</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={decline} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>Decline</button>
          <button onClick={accept} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--accent-gold)', color: '#1B2B4B', fontWeight: 800, cursor: 'pointer' }}>Accept →</button>
        </div>
      </div>
    </div>
  )
}
