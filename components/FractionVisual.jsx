'use client'

// Renders a fraction diagram from a question's `visual` field so questions like
// "how many parts are shaded?" are actually answerable on screen.
//   visual: { type: 'fraction-bar' | 'fraction-circle', parts, shaded, shape? }
// Bar = a rectangle split into `parts` columns, `shaded` filled (matches the
// mockup). Circle = pie split into `parts` wedges, `shaded` filled.
const FILL = '#93C5FD'      // shaded blue (mockup)
const EMPTY = '#FFFFFF'
const STROKE = '#1B2B4B'

export default function FractionVisual({ visual, width = 460, height = 220 }) {
  if (!visual || typeof visual !== 'object') return null
  const parts = Math.max(1, Math.min(24, Number(visual.parts) || 0))
  const shaded = Math.max(0, Math.min(parts, Number(visual.shaded) || 0))
  if (!parts) return null

  const isCircle = visual.type === 'fraction-circle' || visual.shape === 'circle'

  if (isCircle) {
    const r = Math.min(width, height) / 2 - 10
    const cx = width / 2, cy = height / 2
    const wedge = (i) => {
      const a0 = (i / parts) * 2 * Math.PI - Math.PI / 2
      const a1 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0)
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
      const large = (a1 - a0) > Math.PI ? 1 : 0
      return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`
    }
    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${shaded} of ${parts} parts shaded`}>
        {Array.from({ length: parts }).map((_, i) => (
          <path key={i} d={wedge(i)} fill={i < shaded ? FILL : EMPTY} stroke={STROKE} strokeWidth="2" />
        ))}
      </svg>
    )
  }

  // Bar: rectangle split into `parts` equal columns.
  const pad = 8
  const w = (width - pad * 2) / parts
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${shaded} of ${parts} parts shaded`}>
      {Array.from({ length: parts }).map((_, i) => (
        <rect
          key={i}
          x={pad + i * w} y={pad}
          width={w} height={height - pad * 2}
          fill={i < shaded ? FILL : EMPTY}
          stroke={STROKE} strokeWidth="2"
        />
      ))}
    </svg>
  )
}
