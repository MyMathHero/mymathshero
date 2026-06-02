'use client'

import { useState, useEffect } from 'react'
import { getTimeUntilLaunch } from '@/lib/launchDate'

export default function MathCountdownBar() {
  // Start with all zeros so SSR/CSR markup matches; the interval fills it in.
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, done: false })

  useEffect(() => {
    setT(getTimeUntilLaunch())
    const id = setInterval(() => setT(getTimeUntilLaunch()), 1000)
    return () => clearInterval(id)
  }, [])

  const { days, hours, minutes, seconds } = t

  return (
    <div style={S.bar}>
      {/* Logo */}
      <span style={S.brand}>
        MyMaths<span style={{ color: '#C49A1A' }}>Hero</span>
      </span>

      {/* T_launch = NN d × NN h + NN m + NN s */}
      <div style={S.expr}>
        <span style={S.lhs}>
          T<sub>launch</sub> =
        </span>

        <Chip>{pad(days)}</Chip><Unit>d</Unit>
        <Op>×</Op>
        <Chip>{pad(hours)}</Chip><Unit>h</Unit>
        <Op>+</Op>
        <Chip>{pad(minutes)}</Chip><Unit>m</Unit>
        <Op>+</Op>
        <Chip live>{pad(seconds)}</Chip><Unit>s</Unit>
      </div>

      {/* CTA — scrolls to the live waitlist form on /coming-soon */}
      <a href="#waitlist" style={S.cta}>Join the Waitlist →</a>
    </div>
  )
}

function pad(n) { return String(n).padStart(2, '0') }

function Chip({ children, live }) {
  return (
    <span style={live ? S.chipLive : S.chip}>{children}</span>
  )
}

function Unit({ children }) {
  return <span style={S.unit}>{children}</span>
}

function Op({ children }) {
  return <span style={S.op}>{children}</span>
}

const S = {
  bar: {
    background: '#1B2B4B',
    borderBottom: '1px solid rgba(196,154,26,0.3)',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    gap: 12,
    flexWrap: 'wrap',
  },
  brand: {
    color: 'white',
    fontWeight: 800,
    fontSize: 16,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    flexShrink: 0,
  },
  expr: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'Georgia, "Times New Roman", serif',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  lhs: {
    color: '#C49A1A',
    fontSize: 14,
    fontStyle: 'italic',
    marginRight: 4,
  },
  chip: {
    background: 'rgba(196,154,26,0.15)',
    border: '1px solid rgba(196,154,26,0.4)',
    borderRadius: 6,
    padding: '2px 8px',
    color: '#C49A1A',
    fontWeight: 800,
    fontSize: 15,
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 30,
    textAlign: 'center',
    display: 'inline-block',
  },
  chipLive: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    padding: '2px 8px',
    color: 'white',
    fontWeight: 800,
    fontSize: 15,
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 30,
    textAlign: 'center',
    display: 'inline-block',
  },
  unit: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  op: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
    margin: '0 2px',
  },
  cta: {
    color: 'white',
    fontWeight: 800,
    fontSize: 13,
    textDecoration: 'none',
    background: '#F59E0B',
    border: '1px solid #C49A1A',
    borderRadius: 10,
    padding: '7px 14px',
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
}
