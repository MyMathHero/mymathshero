'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AVATAR_ITEMS,
  AVATAR_CATEGORIES,
  getDefaultAvatar,
  renderAvatarPreview,
} from '@/lib/avatarItems'

export default function AvatarPage() {
  const router = useRouter()
  const [avatarConfig, setAvatarConfig] = useState(getDefaultAvatar())
  const [unlockedItems, setUnlockedItems] = useState([])
  const [coins, setCoins] = useState(0)
  const [activeCategory, setActiveCategory] = useState('heroStyle')
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

        const avatarRes = await fetch(
          `/api/student/avatar?studentId=${auth.user.userId}`
        )
        const avatarData = await avatarRes.json()
        if (avatarData.avatar) setAvatarConfig(avatarData.avatar)
        setUnlockedItems(avatarData.unlockedItems || [])
        setCoins(avatarData.coins || 0)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [router])

  function isOwned(category, itemId) {
    const item = AVATAR_ITEMS[category]?.find(i => i.id === itemId)
    if (!item) return false
    if (item.cost === 0) return true
    return unlockedItems.includes(`${category}_${itemId}`)
  }

  function showMessage(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleItemClick(category, item) {
    if (!studentId) return

    if (isOwned(category, item.id)) {
      // Equip it
      try {
        const res = await fetch('/api/student/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId, action: 'equip', category, itemId: item.id,
          }),
        })
        const data = await res.json()
        if (data.success) {
          setAvatarConfig(data.avatarConfig)
          showMessage(`${item.name} equipped! ✅`, 'success')
        } else {
          showMessage(data.error || 'Could not equip', 'error')
        }
      } catch {
        showMessage('Connection error. Please try again.', 'error')
      }
      return
    }

    // Purchase it
    if (coins < item.cost) {
      showMessage(
        `Need ${item.cost - coins} more coins! Keep answering questions. 💪`,
        'error'
      )
      return
    }
    try {
      const res = await fetch('/api/student/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId, action: 'purchase', category, itemId: item.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCoins(data.newCoins)
        setUnlockedItems(prev => [...prev, `${category}_${item.id}`])
        setAvatarConfig(prev => ({ ...prev, [category]: item.id }))
        // Persist the equip too so the new item is the active one.
        fetch('/api/student/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId, action: 'equip', category, itemId: item.id,
          }),
        }).catch(() => {})
        showMessage(`${item.name} unlocked and equipped! 🎉`, 'success')
      } else {
        showMessage(data.error || 'Something went wrong', 'error')
      }
    } catch {
      showMessage('Connection error. Please try again.', 'error')
    }
  }

  const bgColors = {
    classic:    'linear-gradient(135deg, #1B2B4B, #2D4A7A)',
    space:      'linear-gradient(135deg, #0f0c29, #302b63)',
    underwater: 'linear-gradient(135deg, #0575E6, #021B79)',
    galaxy:     'linear-gradient(135deg, #7F00FF, #E100FF)',
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#1B2B4B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ color: '#C49A1A', fontSize: 18, fontWeight: 700 }}>
          Loading your Hero...
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      {/* Header */}
      <div style={{
        background: '#1B2B4B', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#C49A1A',
            fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          ← Back
        </button>
        <p style={{ color: 'white', fontWeight: 800, fontSize: 17, margin: 0 }}>
          My Hero Avatar
        </p>
        <div style={{
          background: 'rgba(196,154,26,0.2)',
          borderRadius: 20, padding: '4px 12px',
        }}>
          <p style={{ color: '#C49A1A', fontWeight: 800, fontSize: 14, margin: 0 }}>
            🪙 {coins}
          </p>
        </div>
      </div>

      {/* Message banner */}
      {message && (
        <div style={{
          background: message.type === 'success' ? '#DCFCE7' : '#FEE2E2',
          border: `1px solid ${message.type === 'success' ? '#22C55E' : '#EF4444'}`,
          padding: '12px 20px', textAlign: 'center',
          fontWeight: 600, fontSize: 14,
          color: message.type === 'success' ? '#166534' : '#991B1B',
        }}>
          {message.text}
        </div>
      )}

      {/* Hero Preview */}
      <div style={{
        background: bgColors[avatarConfig.background] || bgColors.classic,
        padding: '40px 20px',
        textAlign: 'center', position: 'relative', minHeight: 220,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <div style={{
          fontSize: 80, marginBottom: 12,
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
        }}>
          {renderAvatarPreview(avatarConfig)}
        </div>
        <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>
          Your Hero
        </p>
        <div style={{
          display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {Object.entries(avatarConfig).map(([cat, val]) => {
            const item = AVATAR_ITEMS[cat]?.find(i => i.id === val)
            return item ? (
              <span key={cat} style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 20, padding: '2px 10px',
                fontSize: 12, color: 'white',
              }}>
                {item.emoji} {item.name}
              </span>
            ) : null
          })}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex', gap: 8,
        padding: '16px 20px 8px',
        overflowX: 'auto',
        background: 'white',
        borderBottom: '1px solid #E2E8F0',
      }}>
        {AVATAR_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              background: activeCategory === cat.id ? '#1B2B4B' : '#F0F4F8',
              color: activeCategory === cat.id ? 'white' : '#64748B',
              border: 'none', borderRadius: 20,
              padding: '8px 16px',
              fontWeight: 700, fontSize: 13,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div style={{
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}>
        {(AVATAR_ITEMS[activeCategory] || []).map(item => {
          const owned = isOwned(activeCategory, item.id)
          const equipped = avatarConfig[activeCategory] === item.id
          const canAfford = coins >= item.cost

          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(activeCategory, item)}
              style={{
                background: 'white', borderRadius: 16, padding: 16,
                textAlign: 'center', cursor: 'pointer',
                border: equipped
                  ? '2px solid #C49A1A'
                  : owned
                  ? '2px solid #22C55E'
                  : '2px solid #E2E8F0',
                boxShadow: equipped
                  ? '0 4px 16px rgba(196,154,26,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.04)',
                position: 'relative',
                opacity: !owned && !canAfford ? 0.7 : 1,
              }}
            >
              {equipped && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: '#C49A1A', color: 'white',
                  fontSize: 10, fontWeight: 800,
                  padding: '2px 8px', borderRadius: 10,
                }}>
                  ON
                </div>
              )}
              <p style={{ fontSize: 40, margin: '0 0 8px' }}>{item.emoji}</p>
              <p style={{
                fontSize: 13, fontWeight: 700,
                color: '#1B2B4B', margin: '0 0 4px',
              }}>
                {item.name}
              </p>
              {item.cost === 0 ? (
                <p style={{ fontSize: 12, color: '#22C55E', fontWeight: 700, margin: 0 }}>FREE</p>
              ) : owned ? (
                <p style={{ fontSize: 12, color: '#22C55E', fontWeight: 700, margin: 0 }}>✅ Owned</p>
              ) : (
                <p style={{
                  fontSize: 12, fontWeight: 700, margin: 0,
                  color: canAfford ? '#C49A1A' : '#94A3B8',
                }}>
                  🪙 {item.cost} coins
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ height: 40 }} />
    </div>
  )
}
