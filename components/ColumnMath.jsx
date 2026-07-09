'use client'
import { useEffect, useState } from 'react'

// Animated vertical column-arithmetic diagram (worksheet style) for young
// students. Shows the two numbers stacked and right-aligned with the operator,
// then the line — an EMPTY working area for the child to solve (no answer).
// Builds up in stages each time a new question loads: top number → operator +
// bottom number → the line draws in.
//   visual: { a, b, op }  (op is '+', '-', '×' or '÷')
const INK = '#1B2B4B'

export default function ColumnMath({ a, b, op }) {
  const [stage, setStage] = useState(0) // 0 none, 1 top, 2 bottom, 3 line
  useEffect(() => {
    setStage(0)
    const t1 = setTimeout(() => setStage(1), 120)
    const t2 = setTimeout(() => setStage(2), 520)
    const t3 = setTimeout(() => setStage(3), 900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [a, b, op])

  if (a == null || b == null || !op) return null

  // Right-align on the widest number so digits line up in columns.
  const wide = Math.max(String(a).length, String(b).length + 1) // +1 leaves room for the operator
  const pad = (s) => String(s).padStart(wide, ' ')
  const topStr = pad(a)
  const botStr = op + ' ' + b

  const rowStyle = {
    fontFamily: "'Patrick Hand', ui-monospace, 'Courier New', monospace",
    fontSize: 40, fontWeight: 700, color: INK, letterSpacing: 6,
    lineHeight: 1.15, whiteSpace: 'pre', textAlign: 'right',
    transition: 'opacity 0.35s ease, transform 0.35s ease',
  }

  return (
    <div style={{
      display: 'inline-block', background: '#FFFFFF', border: '2px solid #E2E8F0',
      borderRadius: 14, padding: '18px 26px', minWidth: 150,
    }}>
      <div style={{ ...rowStyle, opacity: stage >= 1 ? 1 : 0, transform: stage >= 1 ? 'none' : 'translateY(-6px)' }}>
        {topStr}
      </div>
      <div style={{ ...rowStyle, opacity: stage >= 2 ? 1 : 0, transform: stage >= 2 ? 'none' : 'translateY(-6px)' }}>
        {botStr}
      </div>
      {/* the line */}
      <div style={{
        height: 4, background: INK, borderRadius: 2, marginTop: 8,
        transformOrigin: 'right center',
        transform: stage >= 3 ? 'scaleX(1)' : 'scaleX(0)',
        transition: 'transform 0.4s ease',
      }} />
      {/* empty working area — the child solves it */}
      <div style={{ height: 44 }} />
    </div>
  )
}
