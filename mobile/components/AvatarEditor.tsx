import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native'
import AvatarRender from './AvatarRender'
import { CATEGORIES, PRESETS, normaliseConfig, DEFAULT_CONFIG } from '../lib/avatarParts'
import api from '../lib/api'
import { useTheme, ThemeColors } from '../lib/themeContext'

// Mobile avatar editor — mirror of components/AvatarEditor.jsx, adapted for a
// narrow screen: categories scroll horizontally along the top, the item grid
// fills the middle, and the live preview pins above them.
// Same server rules apply (a part costs coins to unlock then to swap; colours
// are free; presets skip paid parts you don't own) — all enforced server-side.

export default function AvatarEditor({
  studentId, onSaved,
}: { studentId: string; onSaved?: (cfg: any) => void }) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const [config, setConfig] = useState<any>(DEFAULT_CONFIG)
  const [owned, setOwned] = useState<string[]>([])
  const [coins, setCoins] = useState(0)
  const [changeCost, setChangeCost] = useState(5)
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null)
  const [showPresets, setShowPresets] = useState(false)

  const say = useCallback((text: string, bad = false) => {
    setNote({ text, bad })
    setTimeout(() => setNote(null), 2400)
  }, [])

  useEffect(() => {
    if (!studentId) { setLoading(false); return }
    ;(async () => {
      try {
        const res = await api.get(`/api/student/avatar?studentId=${studentId}`)
        const d = res?.data || {}
        setConfig(normaliseConfig(d.avatarConfig))
        setOwned(d.unlockedItems || [])
        setCoins(d.coins || 0)
        if (typeof d.changeCost === 'number') setChangeCost(d.changeCost)
      } catch { /* keep defaults */ }
      finally { setLoading(false) }
    })()
  }, [studentId])

  const cat: any = useMemo(
    () => CATEGORIES.find((c: any) => c.id === activeCat) || CATEGORIES[0],
    [activeCat]
  )
  const isOwned = useCallback(
    (categoryId: string, item: any) => item.cost === 0 || owned.includes(`${categoryId}_${item.id}`),
    [owned]
  )

  async function post(body: any) {
    const res = await api.post('/api/student/avatar', { studentId, ...body })
    return res?.data || {}
  }

  async function pickPart(item: any) {
    if (busy || config[cat.id] === item.id) return
    const prev = config
    setBusy(item.id)
    setConfig((c: any) => ({ ...c, [cat.id]: item.id }))   // optimistic
    try {
      if (!isOwned(cat.id, item)) {
        const p = await post({ action: 'purchase', category: cat.id, itemId: item.id })
        if (p.error) throw new Error(p.error)
        setOwned(o => [...o, `${cat.id}_${item.id}`])
        if (typeof p.newCoins === 'number') setCoins(p.newCoins)
        say(`Unlocked ${item.name} — ${item.cost} 🪙`)
      }
      const e = await post({ action: 'equip', category: cat.id, itemId: item.id })
      if (e.error) throw new Error(e.error)
      if (e.avatarConfig) setConfig(normaliseConfig(e.avatarConfig))
      if (typeof e.newCoins === 'number') setCoins(e.newCoins)
      onSaved?.(e.avatarConfig)
    } catch (err: any) {
      setConfig(prev)
      say(err?.response?.data?.error || err?.message || 'Could not save', true)
    } finally {
      setBusy(null)
    }
  }

  async function pickColor(key: string, color: string) {
    const prev = config
    setConfig((c: any) => ({ ...c, [key]: color }))
    try {
      const d = await post({ action: 'setColor', category: key, itemId: color })
      if (d.error) throw new Error(d.error)
      if (d.avatarConfig) setConfig(normaliseConfig(d.avatarConfig))
      onSaved?.(d.avatarConfig)
    } catch (err: any) {
      setConfig(prev)
      say(err?.response?.data?.error || 'Could not save', true)
    }
  }

  async function applyPreset(p: any) {
    const prev = config
    setConfig(normaliseConfig(p.config))
    try {
      const d = await post({ action: 'applyPreset', itemId: p.id })
      if (d.error) throw new Error(d.error)
      if (d.avatarConfig) setConfig(normaliseConfig(d.avatarConfig))
      setShowPresets(false)
      say(`Starter look: ${p.name}`)
      onSaved?.(d.avatarConfig)
    } catch (err: any) {
      setConfig(prev)
      say(err?.response?.data?.error || 'Could not save', true)
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.accentGold} size="large" /></View>
  }

  const swatches = cat.type === 'color' ? cat.options : cat.colors
  const colorKey = cat.type === 'color' ? 'skinTone' : cat.colorKey

  return (
    <View style={{ flex: 1 }}>
      {/* Live preview */}
      <View style={s.previewRow}>
        <AvatarRender config={config} size={120} />
        <View style={{ flex: 1 }}>
          <Text style={s.coins}>🪙 {coins}</Text>
          <Text style={s.hint}>Changing an item costs {changeCost} 🪙. Colours are free.</Text>
          <TouchableOpacity style={s.presetBtn} onPress={() => setShowPresets(v => !v)}>
            <Text style={s.presetBtnText}>✨ Starter looks</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Starter looks */}
      {showPresets && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.presetRow}>
          {PRESETS.map((p: any) => (
            <TouchableOpacity key={p.id} style={s.presetCard} onPress={() => applyPreset(p)}>
              <AvatarRender config={p.config} size={52} />
              <Text style={s.presetName} numberOfLines={1}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.cats}>
        {CATEGORIES.map((c: any) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setActiveCat(c.id)}
            style={[s.catBtn, c.id === activeCat && s.catBtnOn]}
          >
            <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
            <Text style={[s.catLabel, c.id === activeCat && s.catLabelOn]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Colours */}
      {swatches && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.swatchRow}>
          {swatches.map((sw: any) => (
            <TouchableOpacity
              key={sw.id}
              onPress={() => pickColor(colorKey, sw.color)}
              style={[
                s.swatch,
                { backgroundColor: sw.color },
                config[colorKey] === sw.color && s.swatchOn,
              ]}
            />
          ))}
        </ScrollView>
      )}

      {/* Items */}
      {cat.type === 'part' && (
        <ScrollView contentContainerStyle={s.items}>
          {cat.options.map((item: any) => {
            const ownedIt = isOwned(cat.id, item)
            const on = config[cat.id] === item.id
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => pickPart(item)}
                disabled={busy === item.id}
                style={[s.item, on && s.itemOn, busy === item.id && { opacity: 0.6 }]}
              >
                {/* Preview the item ON the current avatar */}
                <AvatarRender config={{ ...config, [cat.id]: item.id }} size={58} />
                <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                {on ? <Text style={s.equipped}>✓ Wearing</Text>
                  : ownedIt ? <Text style={s.free}>{item.cost === 0 ? 'Free' : 'Owned'}</Text>
                  : <Text style={s.price}>🔒 {item.cost} 🪙</Text>}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {note && (
        <View style={[s.note, note.bad && { backgroundColor: '#DC2626' }]}>
          <Text style={s.noteText}>{note.text}</Text>
        </View>
      )}
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  previewRow: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 12 },
  coins: { color: c.textPrimary, fontWeight: '900', fontSize: 18 },
  hint: { color: c.textSecondary, fontSize: 11.5, marginTop: 2 },
  presetBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  presetBtnText: { color: c.textPrimary, fontWeight: '700', fontSize: 12.5 },

  presetRow: { paddingHorizontal: 10, maxHeight: 86 },
  presetCard: { alignItems: 'center', marginRight: 8, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12, padding: 6, width: 68 },
  presetName: { fontSize: 9, color: c.textSecondary, fontWeight: '700', marginTop: 2 },

  cats: { paddingHorizontal: 10, maxHeight: 54, flexGrow: 0 },
  catBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, height: 38 },
  catBtnOn: { borderColor: c.accentGold, borderWidth: 2, backgroundColor: 'rgba(196,154,26,0.12)' },
  catLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  catLabelOn: { color: c.textPrimary },

  swatchRow: { paddingHorizontal: 10, maxHeight: 52, flexGrow: 0 },
  swatch: { width: 34, height: 34, borderRadius: 17, marginRight: 8, marginVertical: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  swatchOn: { borderWidth: 3, borderColor: '#C49A1A' },

  items: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10, paddingBottom: 30 },
  item: { width: '31%', alignItems: 'center', backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12, paddingVertical: 8, gap: 3 },
  itemOn: { borderColor: '#C49A1A', borderWidth: 3 },
  itemName: { fontSize: 10.5, fontWeight: '700', color: c.textPrimary },
  price: { fontSize: 10, fontWeight: '800', color: '#C49A1A' },
  free: { fontSize: 9.5, fontWeight: '700', color: c.textSecondary },
  equipped: { fontSize: 9.5, fontWeight: '800', color: '#16A34A' },

  note: { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: '#16A34A', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  noteText: { color: 'white', fontWeight: '700', fontSize: 12.5 },
})
