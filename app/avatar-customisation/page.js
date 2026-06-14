'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID, getCharacter } from '@/lib/characterAvatars'
import CharacterAvatar, { CharacterSVG } from '@/components/CharacterAvatar'

export default function AvatarPage() {
  const router = useRouter()
  const [selected, setSelected] = useState(DEFAULT_AVATAR_ID)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [studentId, setStudentId] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const authRes = await fetch('/api/auth/me')
        const auth = await authRes.json()
        if (!auth.authenticated) {
          router.replace('/login')
          return
        }
        setStudentId(auth.user.userId)

        const avatarRes = await fetch(`/api/student/avatar?studentId=${auth.user.userId}`)
        const data = await avatarRes.json()
        // The single source of truth is the student's `avatar` field; the
        // progress endpoint returns it on the student object.
        const progRes = await fetch(`/api/student/progress?studentId=${auth.user.userId}`)
        const prog = await progRes.json()
        const current = prog?.student?.avatar
        if (current && getCharacter(current)) setSelected(current)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [router])

  function showMessage(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 2500)
  }

  async function choose(id) {
    if (!studentId || saving) return
    const prev = selected
    setSelected(id)            // optimistic
    setSaving(true)
    try {
      const res = await fetch('/api/student/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'setCharacter', itemId: id }),
      })
      const data = await res.json()
      if (data.success) {
        showMessage(`${getCharacter(id)?.name} selected! ✅`, 'success')
      } else {
        setSelected(prev)
        showMessage(data.error || 'Could not save', 'error')
      }
    } catch {
      setSelected(prev)
      showMessage('Connection error. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#C49A1A', fontSize: 18, fontWeight: 700 }}>Loading your Hero...</p>
      </div>
    )
  }

  const current = getCharacter(selected)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #F0F4F8)' }}>
      {/* Header */}
      <div style={{ background: '#1B2B4B', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#C49A1A', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>← Back</button>
        <p style={{ color: 'white', fontWeight: 800, fontSize: 17, margin: 0 }}>Choose Your Hero</p>
        <span style={{ width: 50 }} />
      </div>

      {/* Message banner */}
      {message && (
        <div style={{
          background: message.type === 'success' ? '#DCFCE7' : '#FEE2E2',
          border: `1px solid ${message.type === 'success' ? '#22C55E' : '#EF4444'}`,
          padding: '12px 20px', textAlign: 'center', fontWeight: 600, fontSize: 14,
          color: message.type === 'success' ? '#166534' : '#991B1B',
        }}>
          {message.text}
        </div>
      )}

      {/* Big preview of selected character */}
      <div style={{
        background: current ? `linear-gradient(135deg, ${current.bg[0]}, ${current.bg[1]})` : '#1B2B4B',
        padding: '32px 20px 36px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 140, height: 140, borderRadius: '50%', overflow: 'hidden',
          border: '5px solid #C49A1A', boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}>
          {current && <CharacterSVG char={current} size={140} />}
        </div>
        <p style={{ color: 'white', fontWeight: 800, fontSize: 20, margin: '14px 0 2px' }}>{current?.name}</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>{current?.tagline}</p>
      </div>

      {/* Character grid */}
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 4px 12px' }}>
          ✨ Pick a character
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 12, maxWidth: 560, margin: '0 auto' }}>
          {CHARACTER_AVATARS.map(char => {
            const isSel = selected === char.id
            return (
              <button
                key={char.id}
                onClick={() => choose(char.id)}
                style={{
                  background: 'var(--bg-card, #fff)', borderRadius: 16, padding: '12px 8px',
                  cursor: 'pointer', textAlign: 'center',
                  border: isSel ? '3px solid #C49A1A' : '2px solid var(--border-color, #E2E8F0)',
                  boxShadow: isSel ? '0 6px 20px rgba(196,154,26,0.25)' : '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s ease',
                  transform: isSel ? 'translateY(-2px)' : 'none',
                  position: 'relative',
                }}
              >
                {isSel && (
                  <div style={{ position: 'absolute', top: 6, right: 6, background: '#C49A1A', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10 }}>ON</div>
                )}
                <div style={{ width: 64, height: 64, margin: '0 auto 6px', borderRadius: '50%', overflow: 'hidden' }}>
                  <CharacterSVG char={char} size={64} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary, #1B2B4B)', margin: 0, lineHeight: 1.2 }}>{char.name}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  )
}
