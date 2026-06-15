'use client'
import { MANIPULATIVES } from '@/lib/manipulatives'
import TenFrame from './TenFrame'
import NumberLine from './NumberLine'
import PizzaFraction from './PizzaFraction'

const TITLES = {
  [MANIPULATIVES.TEN_FRAME]: '🟦 Counting Grid',
  [MANIPULATIVES.NUMBER_LINE]: '🦘 Hopping Kangaroo',
  [MANIPULATIVES.PIZZA]: '🍕 Fraction Pizza',
}

/**
 * Renders the visual tool Hero chose, wrapped in a labelled card. Returns null
 * for an unknown key so callers can render it unconditionally.
 */
export default function Manipulative({ tool }) {
  let Tool = null
  if (tool === MANIPULATIVES.TEN_FRAME) Tool = TenFrame
  else if (tool === MANIPULATIVES.NUMBER_LINE) Tool = NumberLine
  else if (tool === MANIPULATIVES.PIZZA) Tool = PizzaFraction
  if (!Tool) return null

  return (
    <div style={{
      background: 'white', border: '2px solid #C49A1A', borderRadius: 16,
      padding: 12, marginTop: 6, maxWidth: '100%',
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#1B2B4B' }}>
        {TITLES[tool]} — let's try this together!
      </p>
      <Tool />
    </div>
  )
}
