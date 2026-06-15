import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

const TOKENS = ['🐨', '🦘', '🍎', '⭐', '🍫']

/** 10-frame counting tool (mobile). Tap cells to place counters; live insight
 *  text shows how the count groups. Pure render, no AI cost. */
export default function TenFrame() {
  const [token, setToken] = useState('🐨')
  const [cells, setCells] = useState<boolean[]>(() => Array(10).fill(false))
  const count = cells.filter(Boolean).length

  const toggle = (i: number) =>
    setCells((prev) => prev.map((c, idx) => (idx === i ? !c : c)))

  return (
    <View>
      <View style={s.tokenRow}>
        {TOKENS.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setToken(t)}
            style={[s.tokenBtn, token === t && s.tokenBtnOn]}
          >
            <Text style={{ fontSize: 18 }}>{t}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setCells(Array(10).fill(false))} style={s.clearBtn}>
          <Text style={s.clearText}>↺ Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={s.grid}>
        {cells.map((filled, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => toggle(i)}
            style={[s.cell, filled && s.cellOn]}
          >
            <Text style={{ fontSize: 22 }}>{filled ? token : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.insight}>
        {count === 0 && '🤖 Tap the squares to place counters!'}
        {count > 0 && count < 5 && `We have ${count}. ${5 - count} more fills the top row!`}
        {count === 5 && "🤖 Top row full — that's exactly 5!"}
        {count > 5 && count < 10 && `5 + ${count - 5} = ${count}!`}
        {count === 10 && '🎉 Full frame! 5 + 5 = 10. Amazing!'}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  tokenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10, alignItems: 'center' },
  tokenBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: 'white',
  },
  tokenBtnOn: { borderColor: '#C49A1A', backgroundColor: '#FDF6E3' },
  clearBtn: {
    marginLeft: 'auto', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  clearText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    backgroundColor: '#EEF2FF', padding: 8, borderRadius: 14,
  },
  // 5 cells per row: (100% - 4 gaps) / 5. Use fixed-ish sizing via flexBasis.
  cell: {
    width: '18%', aspectRatio: 1, borderWidth: 2, borderColor: '#C7D2FE',
    borderRadius: 10, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
  },
  cellOn: { backgroundColor: '#FDF6E3' },
  insight: {
    marginTop: 10, fontSize: 13, lineHeight: 19, color: '#475569',
    backgroundColor: '#FDF6E3', borderWidth: 1, borderColor: '#F5E2A8',
    borderRadius: 12, padding: 10,
  },
})
