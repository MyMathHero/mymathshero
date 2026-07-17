'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AvatarEditor from '@/components/AvatarEditor'

// Downscale a picked image to a square JPEG data URL (max `size` px) so uploads
// stay small. Center-crops to a square first.
function downscaleImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.width, img.height)
      const sx = (img.width - side) / 2
      const sy = (img.height - side) / 2
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}

export default function AvatarPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [studentId, setStudentId] = useState(null)
  const [coins, setCoins] = useState(0)
  const [changeCost, setChangeCost] = useState(5)
  const [profilePhoto, setProfilePhoto] = useState(null)

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
        setCoins(data?.coins ?? 0)
        if (typeof data?.changeCost === 'number') setChangeCost(data.changeCost)
        if (data?.profilePhoto) setProfilePhoto(data.profilePhoto)
        // The single source of truth is the student's `avatar` field; the
        // progress endpoint returns it on the student object.
        const progRes = await fetch(`/api/student/progress?studentId=${auth.user.userId}`)
        const prog = await progRes.json()

      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [router])

  function showMessage(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 2500)
  }

  // Upload a personal profile photo (shown ONLY to this student). Downscale to a
  // small JPEG data URL client-side so we never store a huge blob.
  async function onPhotoPick(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file later
    if (!file || !studentId) return
    if (!/^image\//.test(file.type)) { showMessage('Please pick an image', 'error'); return }
    try {
      const dataUrl = await downscaleImage(file, 256)
      setSaving(true)
      const res = await fetch('/api/student/avatar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'setPhoto', photo: dataUrl }),
      })
      const data = await res.json()
      if (data.success) { setProfilePhoto(dataUrl); showMessage('Photo saved! Only you can see it 🔒', 'success') }
      else showMessage(data.error || 'Could not save photo', 'error')
    } catch {
      showMessage('Could not read that image', 'error')
    } finally { setSaving(false) }
  }

  async function removePhoto() {
    if (!studentId || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/student/avatar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'setPhoto', photo: null }),
      })
      const data = await res.json()
      if (data.success) { setProfilePhoto(null); showMessage('Photo removed', 'success') }
    } catch {} finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#C49A1A', fontSize: 18, fontWeight: 700 }}>Loading your Hero...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #F0F4F8)' }}>
      {/* Header */}
      <div style={{ background: '#1B2B4B', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#C49A1A', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>← Back</button>
        <p style={{ color: 'white', fontWeight: 800, fontSize: 17, margin: 0 }}>Choose Your Hero</p>
        <span style={{ color: '#C49A1A', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap' }}>🪙 {coins}</span>
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

      {/* Profile photo — shown ONLY to this student */}
      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 4px 12px' }}>
          📷 Your photo (only you can see it)
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, maxWidth: 560, margin: '0 auto', background: 'var(--bg-card, #fff)', border: '2px solid var(--border-color, #E2E8F0)', borderRadius: 16, padding: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '2px solid #C49A1A', flexShrink: 0, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profilePhoto
              ? <img src={profilePhoto} alt="Your photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 26 }}>🙂</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: 'var(--text-primary, #1B2B4B)', margin: '0 0 8px', fontWeight: 600 }}>
              Add a profile photo, or keep your Hero avatar. 🔒 Private — other students only see your Hero.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ background: '#1B2B4B', color: '#C49A1A', fontWeight: 700, fontSize: 13, padding: '8px 14px', borderRadius: 10, cursor: 'pointer' }}>
                {profilePhoto ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={onPhotoPick} disabled={saving} style={{ display: 'none' }} />
              </label>
              {profilePhoto && (
                <button onClick={removePhoto} disabled={saving} style={{ background: 'transparent', color: '#EF4444', fontWeight: 700, fontSize: 13, padding: '8px 14px', borderRadius: 10, border: '1px solid #FCA5A5', cursor: 'pointer' }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* The layered editor — categories | items | live preview. Replaces the old
          "pick 1 of 12 fixed characters" grid; the presets live on inside it as
          one-tap starter looks. */}
      <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
        <AvatarEditor studentId={studentId} onSaved={() => {}} />
      </div>

      <div style={{ height: 40 }} />
    </div>
  )
}
