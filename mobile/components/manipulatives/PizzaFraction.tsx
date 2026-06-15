import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Svg, { Circle, Path, Defs, LinearGradient, Stop, G } from 'react-native-svg'

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const DENOM_WORDS: Record<number, string> = {
  2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths',
  7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 11: 'elevenths', 12: 'twelfths',
}

/** Pizza/pie fraction tool (mobile). Steppers set denominator/numerator; an SVG
 *  pie redraws sectors and the fraction shows in words. Pure render, no AI cost. */
export default function PizzaFraction() {
  const [denom, setDenom] = useState(8)
  const [num, setNum] = useState(3)

  const setDenominator = (v: number) => {
    const nv = Math.max(2, Math.min(12, v))
    setDenom(nv)
    if (num > nv) setNum(nv)
  }
  const setNumerator = (v: number) => setNum(Math.max(1, Math.min(denom, v)))

  const sectors = []
  for (let i = 0; i < denom; i++) {
    const step = 360 / denom
    const a0 = (i * step * Math.PI) / 180
    const a1 = ((i + 1) * step * Math.PI) / 180
    const x1 = 100 + 85 * Math.cos(a0)
    const y1 = 100 + 85 * Math.sin(a0)
    const x2 = 100 + 85 * Math.cos(a1)
    const y2 = 100 + 85 * Math.sin(a1)
    const large = step > 180 ? 1 : 0
    sectors.push(
      <Path key={i}
        d={`M 100,100 L ${x1},${y1} A 85,85 0 ${large},1 ${x2},${y2} Z`}
        fill={i < num ? 'url(#pieGrad)' : 'transparent'}
        stroke="#94A3B8" strokeWidth="1.5" />
    )
  }

  const word =
    `${NUM_WORDS[num] || num} ` +
    (() => {
      const d = DENOM_WORDS[denom] || 'parts'
      return num > 1 ? d : d.slice(0, -1)
    })()

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <Svg viewBox="0 0 200 200" width={170} height={170}>
          <G rotation={-90} originX={100} originY={100}>
            <Circle cx="100" cy="100" r="85" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="3" />
            {sectors}
          </G>
          <Defs>
            <LinearGradient id="pieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FBBF24" />
              <Stop offset="100%" stopColor="#EA580C" />
            </LinearGradient>
          </Defs>
        </Svg>
      </View>

      <Stepper label="Total slices" value={denom} onDec={() => setDenominator(denom - 1)} onInc={() => setDenominator(denom + 1)} color="#475569" />
      <Stepper label="Coloured slices" value={num} onDec={() => setNumerator(num - 1)} onInc={() => setNumerator(num + 1)} color="#C49A1A" />

      <View style={s.fracRow}>
        <View style={s.fracBox}>
          <Text style={s.fracText}>{num}</Text>
          <View style={s.fracBar} />
          <Text style={s.fracText}>{denom}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.wordLabel}>IN WORDS</Text>
          <Text style={s.wordText}>{word}</Text>
        </View>
      </View>
    </View>
  )
}

function Stepper({ label, value, onDec, onInc, color }: {
  label: string; value: number; onDec: () => void; onInc: () => void; color: string
}) {
  return (
    <View style={s.stepRow}>
      <Text style={s.stepLabel}>{label}</Text>
      <View style={s.stepCtrls}>
        <TouchableOpacity onPress={onDec} style={s.stepBtn}><Text style={s.stepBtnText}>−</Text></TouchableOpacity>
        <Text style={[s.stepValue, { color }]}>{value}</Text>
        <TouchableOpacity onPress={onInc} style={s.stepBtn}><Text style={s.stepBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  stepCtrls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 20, fontWeight: '800', color: '#1B2B4B' },
  stepValue: { fontSize: 16, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  fracRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, backgroundColor: '#FDF6E3', borderWidth: 1, borderColor: '#F5E2A8',
    borderRadius: 12, padding: 12,
  },
  fracBox: { alignItems: 'center' },
  fracText: { fontSize: 20, fontWeight: '800', color: '#1B2B4B' },
  fracBar: { width: 26, height: 3, backgroundColor: '#1B2B4B', marginVertical: 3 },
  wordLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  wordText: { fontSize: 14, fontWeight: '700', color: '#475569', textTransform: 'capitalize' },
})
