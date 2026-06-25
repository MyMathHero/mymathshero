'use client'

// Draws a Junior question's `visual` big and friendly (no reading needed).
// Types: count, compare, add, takeaway, shape, pattern. Pure presentational.

const SHAPE_EMOJI = {
  circle: '⭕', square: '🟦', triangle: '🔺', rectangle: '▭',
  star: '⭐', heart: '❤️', oval: '⬭', diamond: '🔷',
}

function Group({ icon, n }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 260 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ fontSize: 40, lineHeight: 1.1 }}>{icon}</span>
      ))}
    </div>
  )
}

export default function VisualRender({ visual }) {
  if (!visual) return null
  const wrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0 4px' }

  switch (visual.type) {
    case 'count':
      return <div style={wrap}><Group icon={visual.icon} n={visual.n} /></div>

    case 'compare':
      return (
        <div style={{ ...wrap, flexDirection: 'row', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: '#EFF6FF', borderRadius: 18, padding: 14 }}><Group icon={visual.iconA} n={visual.a} /></div>
          <div style={{ alignSelf: 'center', fontSize: 28, fontWeight: 900, color: '#94A3B8' }}>vs</div>
          <div style={{ background: '#FEF2F2', borderRadius: 18, padding: 14 }}><Group icon={visual.iconB} n={visual.b} /></div>
        </div>
      )

    case 'add':
      return (
        <div style={{ ...wrap, flexDirection: 'row', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Group icon={visual.icon} n={visual.a} />
          <span style={{ alignSelf: 'center', fontSize: 36, fontWeight: 900, color: '#16A34A' }}>+</span>
          <Group icon={visual.icon} n={visual.b} />
        </div>
      )

    case 'takeaway':
      return (
        <div style={wrap}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 260 }}>
            {Array.from({ length: visual.a }).map((_, i) => (
              <span key={i} style={{ fontSize: 40, lineHeight: 1.1, opacity: i >= visual.a - visual.b ? 0.25 : 1, textDecoration: i >= visual.a - visual.b ? 'line-through' : 'none' }}>
                {visual.icon}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>take away {visual.b}</div>
        </div>
      )

    case 'shape':
      return <div style={wrap}><span style={{ fontSize: 110 }}>{SHAPE_EMOJI[visual.shape] || '⬛'}</span></div>

    case 'pattern':
      return (
        <div style={{ ...wrap, flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {visual.sequence.map((s, i) => (
            <span key={i} style={{ fontSize: 44 }}>{s}</span>
          ))}
          <span style={{ fontSize: 44, color: '#C49A1A', fontWeight: 900 }}>❓</span>
        </div>
      )

    default:
      return null
  }
}
