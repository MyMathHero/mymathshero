'use client'

// Renders a fraction diagram from a question's `visual` field so questions like
// "how many parts are shaded?" are actually answerable on screen.
//   visual: { type: 'fraction-bar' | 'fraction-circle', parts, shaded, shape? }
// Bar = a rectangle split into `parts` columns, `shaded` filled (matches the
// mockup). Circle = pie split into `parts` wedges, `shaded` filled.
const FILL = '#93C5FD'      // shaded blue (mockup)
const EMPTY = '#FFFFFF'
const STROKE = '#1B2B4B'

const SHAPE_EMOJI = {
  circle: '⭕', square: '🟦', triangle: '🔺', rectangle: '▭', star: '⭐',
  heart: '❤️', oval: '⬭', diamond: '🔷', pentagon: '⬠', hexagon: '⬡',
}

// A row of `n` icons (wraps). Used for count/add/takeaway visuals.
function IconGroup({ icon, n }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 320 }}>
      {Array.from({ length: Math.max(0, Math.min(20, n | 0)) }).map((_, i) => (
        <span key={i} style={{ fontSize: 38, lineHeight: 1.1 }}>{icon}</span>
      ))}
    </div>
  )
}

export default function FractionVisual({ visual, width = 460, height = 220 }) {
  if (!visual || typeof visual !== 'object') return null

  // Prep–3 friendly visuals (derived from the question text). Drawn with big
  // icons / a big equation — no reading needed.
  const wrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '4px 0' }
  switch (visual.type) {
    case 'count':
      return <div style={wrap}><IconGroup icon={visual.icon || '🔵'} n={visual.n} /></div>
    case 'compare':
      return (
        <div style={{ ...wrap, flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ background: '#EFF6FF', borderRadius: 16, padding: 12 }}><IconGroup icon={visual.iconA || '🔵'} n={visual.a} /></div>
          <div style={{ alignSelf: 'center', fontSize: 26, fontWeight: 900, color: '#94A3B8' }}>vs</div>
          <div style={{ background: '#FEF2F2', borderRadius: 16, padding: 12 }}><IconGroup icon={visual.iconB || '🔴'} n={visual.b} /></div>
        </div>
      )
    case 'add':
      return (
        <div style={{ ...wrap, flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
          <IconGroup icon={visual.icon || '🔵'} n={visual.a} />
          <span style={{ alignSelf: 'center', fontSize: 34, fontWeight: 900, color: '#16A34A' }}>+</span>
          <IconGroup icon={visual.icon || '🔵'} n={visual.b} />
        </div>
      )
    case 'takeaway':
      return (
        <div style={wrap}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 320 }}>
            {Array.from({ length: Math.max(0, Math.min(20, visual.a | 0)) }).map((_, i) => {
              const gone = i >= (visual.a - visual.b)
              return <span key={i} style={{ fontSize: 38, lineHeight: 1.1, opacity: gone ? 0.25 : 1, textDecoration: gone ? 'line-through' : 'none' }}>{visual.icon || '🔵'}</span>
            })}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626' }}>take away {visual.b}</div>
        </div>
      )
    case 'shape':
      return <div style={wrap}><span style={{ fontSize: 104 }}>{SHAPE_EMOJI[visual.shape] || '⬛'}</span></div>
    case 'pattern':
      return (
        <div style={{ ...wrap, flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {(visual.sequence || []).map((s, i) => <span key={i} style={{ fontSize: 42 }}>{s}</span>)}
          <span style={{ fontSize: 42, color: '#C49A1A', fontWeight: 900 }}>❓</span>
        </div>
      )
    case 'equation':
      return (
        <div style={{ ...wrap }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: '#1B2B4B', letterSpacing: 2 }}>
            {visual.a} {visual.op} {visual.b} = <span style={{ color: '#C49A1A' }}>?</span>
          </span>
        </div>
      )
    default:
      break // fall through to fraction rendering
  }

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
