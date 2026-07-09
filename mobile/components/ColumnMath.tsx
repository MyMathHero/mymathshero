import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'

// Animated vertical column-arithmetic diagram (worksheet style) for young
// students (Prep–3). Shows the two numbers stacked + right-aligned with the
// operator, then the line — an EMPTY working area (no answer). Builds up in
// stages each time a new question loads. Mirror of web components/ColumnMath.jsx.
const INK = '#1B2B4B'

export default function ColumnMath({ a, b, op }: { a: number; b: number; op: string }) {
  const [stage, setStage] = useState(0) // 0 none, 1 top, 2 bottom, 3 line
  const lineScale = useRef(new Animated.Value(0)).current

  useEffect(() => {
    setStage(0)
    lineScale.setValue(0)
    const t1 = setTimeout(() => setStage(1), 120)
    const t2 = setTimeout(() => setStage(2), 520)
    const t3 = setTimeout(() => {
      setStage(3)
      Animated.timing(lineScale, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    }, 900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [a, b, op])

  if (a == null || b == null || !op) return null

  const wide = Math.max(String(a).length, String(b).length + 1)
  const pad = (s: string | number) => String(s).padStart(wide, ' ')
  const topStr = pad(a)
  const botStr = op + ' ' + b

  return (
    <View style={s.box}>
      <Text style={[s.row, { opacity: stage >= 1 ? 1 : 0 }]}>{topStr}</Text>
      <Text style={[s.row, { opacity: stage >= 2 ? 1 : 0 }]}>{botStr}</Text>
      <Animated.View style={[s.line, { transform: [{ scaleX: lineScale }] }]} />
      <View style={{ height: 40 }} />
    </View>
  )
}

const s = StyleSheet.create({
  box: {
    alignSelf: 'center', backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E2E8F0',
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, minWidth: 140, marginTop: 12,
  },
  // Monospace so digits line up in columns; letterSpacing widens the gaps.
  row: {
    fontFamily: 'Courier', fontVariant: ['tabular-nums'], fontSize: 36, fontWeight: '700',
    color: INK, letterSpacing: 4, textAlign: 'right', lineHeight: 44,
  },
  line: { height: 4, backgroundColor: INK, borderRadius: 2, marginTop: 6 },
})
