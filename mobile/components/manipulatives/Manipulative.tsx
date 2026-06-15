import { View, Text, StyleSheet } from 'react-native'
import TenFrame from './TenFrame'
import NumberLine from './NumberLine'
import PizzaFraction from './PizzaFraction'

// Tool keys mirror the API (lib/manipulatives.js on the web side).
export type ManipulativeTool = 'tenframe' | 'numberline' | 'pizza'

const TITLES: Record<ManipulativeTool, string> = {
  tenframe: '🟦 Counting Grid',
  numberline: '🦘 Hopping Kangaroo',
  pizza: '🍕 Fraction Pizza',
}

/** Renders the visual tool Hero chose. Returns null for an unknown key. */
export default function Manipulative({ tool }: { tool?: string | null }) {
  let Tool: React.ComponentType | null = null
  if (tool === 'tenframe') Tool = TenFrame
  else if (tool === 'numberline') Tool = NumberLine
  else if (tool === 'pizza') Tool = PizzaFraction
  if (!Tool) return null

  return (
    <View style={s.card}>
      <Text style={s.title}>{TITLES[tool as ManipulativeTool]} — let's try this together!</Text>
      <Tool />
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'white', borderWidth: 2, borderColor: '#C49A1A',
    borderRadius: 16, padding: 12, marginTop: 6,
  },
  title: { fontSize: 12, fontWeight: '800', color: '#1B2B4B', marginBottom: 8 },
})
