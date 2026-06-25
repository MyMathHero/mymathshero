import { View, Text } from 'react-native'

// Mobile mirror of components/junior/VisualRender.jsx — draws a Junior question's
// `visual` big and friendly (no reading needed).

const SHAPE_EMOJI: Record<string, string> = {
  circle: '⭕', square: '🟦', triangle: '🔺', rectangle: '▭',
  star: '⭐', heart: '❤️', oval: '⬭', diamond: '🔷',
}

function Group({ icon, n, faded = 0 }: { icon: string; n: number; faded?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 260 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Text key={i} style={{ fontSize: 38, opacity: faded && i >= n - faded ? 0.25 : 1 }}>{icon}</Text>
      ))}
    </View>
  )
}

export default function VisualRender({ visual }: { visual: any }) {
  if (!visual) return null
  const wrap = { alignItems: 'center' as const, gap: 12, paddingVertical: 6 }

  switch (visual.type) {
    case 'count':
      return <View style={wrap}><Group icon={visual.icon} n={visual.n} /></View>
    case 'compare':
      return (
        <View style={{ flexDirection: 'row', gap: 20, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#EFF6FF', borderRadius: 16, padding: 12 }}><Group icon={visual.iconA} n={visual.a} /></View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#94A3B8' }}>vs</Text>
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 16, padding: 12 }}><Group icon={visual.iconB} n={visual.b} /></View>
        </View>
      )
    case 'add':
      return (
        <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <Group icon={visual.icon} n={visual.a} />
          <Text style={{ fontSize: 34, fontWeight: '900', color: '#16A34A' }}>+</Text>
          <Group icon={visual.icon} n={visual.b} />
        </View>
      )
    case 'takeaway':
      return (
        <View style={wrap}>
          <Group icon={visual.icon} n={visual.a} faded={visual.b} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#DC2626' }}>take away {visual.b}</Text>
        </View>
      )
    case 'shape':
      return <View style={wrap}><Text style={{ fontSize: 100 }}>{SHAPE_EMOJI[visual.shape] || '⬛'}</Text></View>
    case 'pattern':
      return (
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          {visual.sequence.map((s: string, i: number) => <Text key={i} style={{ fontSize: 40 }}>{s}</Text>)}
          <Text style={{ fontSize: 40, color: '#C49A1A', fontWeight: '900' }}>❓</Text>
        </View>
      )
    default:
      return null
  }
}
