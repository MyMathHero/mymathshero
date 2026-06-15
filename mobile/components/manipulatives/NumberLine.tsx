import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import Svg, { Line, Circle, Text as SvgText, Path, G } from 'react-native-svg'

/** Kangaroo number-line tool (mobile). Steppers set start/hops/direction; an
 *  SVG bezier hop arc + live equation update. Pure render, no AI cost. */
export default function NumberLine() {
  const [start, setStart] = useState(5)
  const [steps, setSteps] = useState(4)
  const [dir, setDir] = useState<'plus' | 'minus'>('plus')

  const maxSteps = Math.min(10, dir === 'minus' ? start : 20 - start)
  const safeSteps = Math.max(1, Math.min(steps, Math.max(1, maxSteps)))
  const end = dir === 'plus' ? start + safeSteps : start - safeSteps

  const x = (n: number) => 30 + n * 27
  const startX = x(start)
  const endX = x(end)
  const ctrlX = (startX + endX) / 2
  const ctrlY = 80 - Math.abs(safeSteps) * 12

  const clampStart = (v: number) => Math.max(dir === 'minus' ? safeSteps : 0, Math.min(15, v))

  return (
    <View>
      <View style={s.dirRow}>
        {([['plus', '+ Forwards', '#C49A1A'], ['minus', '− Backwards', '#EF4444']] as const).map(
          ([key, label, color]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setDir(key)}
              style={[s.dirBtn, dir === key && { backgroundColor: color }]}
            >
              <Text style={[s.dirText, dir === key && { color: 'white' }]}>{label}</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <Stepper label="Start" value={start} onDec={() => setStart(clampStart(start - 1))} onInc={() => setStart(clampStart(start + 1))} color="#6366F1" />
      <Stepper label="Hops" value={safeSteps} onDec={() => setSteps(Math.max(1, safeSteps - 1))} onInc={() => setSteps(Math.min(maxSteps, safeSteps + 1))} color="#C49A1A" />

      <View style={s.eqRow}>
        <Box>{start}</Box>
        <Text style={s.eqOp}>{dir === 'plus' ? '+' : '−'}</Text>
        <Box>{safeSteps}</Box>
        <Text style={s.eqOp}>=</Text>
        <Box highlight>{end}</Box>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.svgWrap}>
        <Svg viewBox="0 0 620 120" width={560} height={110}>
          <Line x1="30" y1="80" x2="590" y2="80" stroke="#475569" strokeWidth="4" />
          {Array.from({ length: 21 }).map((_, i) => {
            const isStart = i === start
            const isEnd = i === end
            return (
              <G key={i}>
                <Line x1={x(i)} y1="75" x2={x(i)} y2="85" stroke="#94A3B8" strokeWidth="2" />
                <SvgText x={x(i)} y="105" fontSize="10" textAnchor="middle"
                  fill={isStart ? '#818CF8' : isEnd ? '#FBBF24' : '#94A3B8'}>{i}</SvgText>
                {isStart && <Circle cx={x(i)} cy="80" r="4.5" fill="#818CF8" />}
                {isEnd && <Circle cx={x(i)} cy="80" r="4.5" fill="#FBBF24" />}
              </G>
            )
          })}
          <Path d={`M ${startX},80 Q ${ctrlX},${ctrlY} ${endX},80`}
            fill="none" stroke="#FBBF24" strokeWidth="3.5" strokeDasharray="4,4" />
          <Circle cx={ctrlX} cy={ctrlY + 12} r="12" fill="#FBBF24" stroke="#fff" strokeWidth="2" />
          <SvgText x={ctrlX} y={ctrlY + 16} fontSize="12" textAnchor="middle">🦘</SvgText>
        </Svg>
      </ScrollView>
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

function Box({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <View style={[s.box, highlight && s.boxOn]}>
      <Text style={[s.boxText, highlight && { color: 'white' }]}>{children}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  dirRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  dirBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  dirText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  stepCtrls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 20, fontWeight: '800', color: '#1B2B4B' },
  stepValue: { fontSize: 16, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  eqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 12 },
  eqOp: { fontSize: 22, fontWeight: '800', color: '#1B2B4B' },
  box: {
    width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white', borderWidth: 2, borderColor: '#E2E8F0',
  },
  boxOn: { backgroundColor: '#1B2B4B', borderColor: '#1B2B4B' },
  boxText: { fontSize: 18, fontWeight: '800', color: '#1B2B4B' },
  svgWrap: { backgroundColor: '#0F172A', borderRadius: 14, padding: 8 },
})
