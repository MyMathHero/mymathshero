'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import AvatarRender from '@/components/AvatarRender'
import {
  CATEGORIES, PRESETS, buildAvatar, normaliseConfig, DEFAULT_CONFIG,
} from '@/lib/avatarParts'

// The avatar editor — categories (left) │ item grid (middle) │ live preview
// (right). Every change updates the preview instantly (local state); saving goes
// through /api/student/avatar so the existing coin/unlock rules apply:
//   • a PART costs coins once to unlock, then equipping a different one in a
//     slot costs AVATAR_CHANGE_COST (server-enforced, ledgered)
//   • a COLOUR is free (the paid unit is the part)
//   • a PRESET is a one-tap starting point (paid parts you don't own are skipped)

export default function AvatarEditor({ studentId, onClose, onSaved }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [owned, setOwned] = useState([])
  const [coins, setCoins] = useState(0)
  const [changeCost, setChangeCost] = useState(5)
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)     // itemId being purchased/equipped
  const [toast, setToast] = useState(null)
  const [showPresets, setShowPresets] = useState(false)

  const say = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
    setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => {
    if (!studentId) { setLoading(false); return }
    ;(async () => {
      try {
        const res = await fetch(`/api/student/avatar?studentId=${encodeURIComponent(studentId)}`)
        const d = await res.json()
        if (res.ok) {
          setConfig(normaliseConfig(d.avatarConfig))
          setOwned(d.unlockedItems || [])
          setCoins(d.coins || 0)
          setChangeCost(d.changeCost ?? 5)
        }
      } catch { /* keep defaults */ }
      finally { setLoading(false) }
    })()
  }, [studentId])

  const cat = useMemo(() => CATEGORIES.find(c => c.id === activeCat) || CATEGORIES[0], [activeCat])
  const isOwned = useCallback(
    (categoryId, item) => item.cost === 0 || owned.includes(`${categoryId}_${item.id}`),
    [owned]
  )

  async function post(body) {
    const res = await fetch('/api/student/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, ...body }),
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'Something went wrong')
    return d
  }

  // Pick a part: buy it if needed, then equip. Preview updates immediately and
  // rolls back if the server says no.
  async function pickPart(item) {
    if (busy) return
    const prev = config
    const equipped = config[cat.id] === item.id
    if (equipped) return

    setBusy(item.id)
    setConfig(c => ({ ...c, [cat.id]: item.id }))   // optimistic preview
    try {
      if (!isOwned(cat.id, item)) {
        const p = await post({ action: 'purchase', category: cat.id, itemId: item.id })
        setOwned(o => [...o, `${cat.id}_${item.id}`])
        setCoins(p.newCoins ?? coins)
        say(`Unlocked ${item.name} — ${item.cost} coins`, 'good')
      }
      const e = await post({ action: 'equip', category: cat.id, itemId: item.id })
      if (e.avatarConfig) setConfig(normaliseConfig(e.avatarConfig))
      if (typeof e.newCoins === 'number') setCoins(e.newCoins)
      onSaved?.(e.avatarConfig)
    } catch (err) {
      setConfig(prev)                                // roll back the preview
      say(err.message, 'bad')
    } finally {
      setBusy(null)
    }
  }

  // Colours are free — set + save.
  async function pickColor(key, color) {
    const prev = config
    setConfig(c => ({ ...c, [key]: color }))
    try {
      const d = await post({ action: 'setColor', category: key, itemId: color })
      if (d.avatarConfig) setConfig(normaliseConfig(d.avatarConfig))
      onSaved?.(d.avatarConfig)
    } catch (err) {
      setConfig(prev)
      say(err.message, 'bad')
    }
  }

  async function applyPreset(p) {
    const prev = config
    setConfig(normaliseConfig(p.config))
    try {
      const d = await post({ action: 'applyPreset', itemId: p.id })
      if (d.avatarConfig) setConfig(normaliseConfig(d.avatarConfig))
      setShowPresets(false)
      say(`Starter look: ${p.name}`, 'good')
      onSaved?.(d.avatarConfig)
    } catch (err) {
      setConfig(prev)
      say(err.message, 'bad')
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading your avatar…</div>
  }

  return (
    <div style={S.wrap}>
      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Design your Hero</h2>
          <p style={S.sub}>Mix and match — your avatar saves as you go.</p>
        </div>
        <div style={S.headerRight}>
          <span style={S.coins}>🪙 {coins}</span>
          <button style={S.ghostBtn} onClick={() => setShowPresets(v => !v)}>
            ✨ Starter looks
          </button>
          {onClose && <button style={S.ghostBtn} onClick={onClose}>Done</button>}
        </div>
      </div>

      {/* ── Starter looks (the 12 legacy presets, one tap) ── */}
      {showPresets && (
        <div style={S.presetRow}>
          {PRESETS.map(p => (
            <button key={p.id} style={S.presetCard} onClick={() => applyPreset(p)} title={p.name}>
              <AvatarRender config={p.config} size={56} />
              <span style={S.presetName}>{p.name}</span>
            </button>
          ))}
        </div>
      )}

      <div style={S.body}>
        {/* ── LEFT: categories ── */}
        <div style={S.cats}>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              style={{
                ...S.catBtn,
                ...(c.id === activeCat ? S.catBtnOn : null),
              }}
            >
              <span style={{ fontSize: 20 }}>{c.emoji}</span>
              <span style={S.catLabel}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* ── MIDDLE: item grid ── */}
        <div style={S.grid}>
          {/* Colour swatches for this category (skin / hair / clothing) */}
          {(cat.type === 'color' || cat.colors) && (
            <div style={S.swatchRow}>
              {(cat.type === 'color' ? cat.options : cat.colors).map(sw => {
                const key = cat.type === 'color' ? 'skinTone' : cat.colorKey
                const on = config[key] === sw.color
                return (
                  <button
                    key={sw.id}
                    onClick={() => pickColor(key, sw.color)}
                    title={sw.name}
                    style={{
                      ...S.swatch,
                      background: sw.color,
                      outline: on ? '3px solid var(--accent-gold)' : '1px solid var(--border-color)',
                      outlineOffset: on ? 2 : 0,
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* Parts */}
          {cat.type === 'part' && (
            <div style={S.items}>
              {cat.options.map(item => {
                const ownedIt = isOwned(cat.id, item)
                const on = config[cat.id] === item.id
                // Preview this item on the CURRENT avatar so it's a real preview.
                const previewCfg = { ...config, [cat.id]: item.id }
                return (
                  <button
                    key={item.id}
                    onClick={() => pickPart(item)}
                    disabled={busy === item.id}
                    style={{
                      ...S.item,
                      borderColor: on ? 'var(--accent-gold)' : 'var(--border-color)',
                      borderWidth: on ? 3 : 1,
                      opacity: busy === item.id ? 0.6 : 1,
                    }}
                  >
                    <AvatarRender config={previewCfg} size={64} />
                    <span style={S.itemName}>{item.name}</span>
                    {on ? (
                      <span style={S.equipped}>✓ Wearing</span>
                    ) : ownedIt ? (
                      <span style={S.free}>{item.cost === 0 ? 'Free' : 'Owned'}</span>
                    ) : (
                      <span style={S.price}>🪙 {item.cost}</span>
                    )}
                    {!ownedIt && <span style={S.lock}>🔒</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: live preview ── */}
        <div style={S.preview}>
          <AvatarRender config={config} size={260} />
          <p style={S.hint}>
            Changing an item costs <strong>🪙 {changeCost}</strong>. Colours are free.
          </p>
        </div>
      </div>

      {toast && (
        <div style={{ ...S.toast, background: toast.tone === 'bad' ? '#DC2626' : '#16A34A' }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

const S = {
  wrap: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' },
  sub: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  coins: { fontWeight: 800, color: 'var(--text-primary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 999, padding: '6px 12px' },
  ghostBtn: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },

  presetRow: { display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 2px 8px' },
  presetCard: { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 8, cursor: 'pointer' },
  presetName: { fontSize: 10.5, fontWeight: 700, color: 'var(--text-secondary)', maxWidth: 62, textAlign: 'center' },

  body: { display: 'grid', gridTemplateColumns: 'minmax(96px, 120px) 1fr minmax(200px, 300px)', gap: 14, alignItems: 'start' },

  cats: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 460, overflowY: 'auto' },
  catBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 10px', cursor: 'pointer', textAlign: 'left' },
  catBtnOn: { borderColor: 'var(--accent-gold)', borderWidth: 2, background: 'rgba(196,154,26,0.10)' },
  catLabel: { fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' },

  grid: { minWidth: 0 },
  swatchRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  swatch: { width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer' },
  items: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 10, maxHeight: 420, overflowY: 'auto' },
  item: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'var(--bg-card)', borderStyle: 'solid', borderRadius: 12, padding: 8, cursor: 'pointer' },
  itemName: { fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' },
  price: { fontSize: 11, fontWeight: 800, color: 'var(--accent-gold)' },
  free: { fontSize: 10.5, fontWeight: 700, color: 'var(--text-secondary)' },
  equipped: { fontSize: 10.5, fontWeight: 800, color: '#16A34A' },
  lock: { position: 'absolute', top: 6, right: 6, fontSize: 12 },

  preview: { position: 'sticky', top: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 16 },
  hint: { fontSize: 11.5, color: 'var(--text-secondary)', textAlign: 'center' },

  toast: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'white', fontWeight: 700, fontSize: 13, padding: '10px 18px', borderRadius: 999, zIndex: 300 },
}
