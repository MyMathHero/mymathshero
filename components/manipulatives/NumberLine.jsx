'use client'
import { useState } from 'react'

/**
 * Kangaroo number-line tool. Sliders set the start, the number of hops, and the
 * direction; an SVG bezier "hop" arc and a live equation update as you drag.
 * Pure render, no AI cost.
 */
export default function NumberLine() {
  const [start, setStart] = useState(5)
  const [steps, setSteps] = useState(4)
  const [dir, setDir] = useState('plus') // 'plus' | 'minus'

  const end = dir === 'plus' ? start + steps : start - steps
  const maxSteps = Math.min(10, dir === 'minus' ? start : 20 - start)

  // Keep steps within valid bounds when start/direction change.
  const safeSteps = Math.max(1, Math.min(steps, Math.max(1, maxSteps)))

  const x = (n) => 30 + n * 27
  const startX = x(start)
  const endX = x(dir === 'plus' ? start + safeSteps : start - safeSteps)
  const ctrlX = (startX + endX) / 2
  const ctrlY = 80 - Math.abs(safeSteps) * 12

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Direction toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[
          ['plus', '+ Forwards', '#C49A1A'],
          ['minus', '− Backwards', '#EF4444'],
        ].map(([key, label, color]) => (
          <button
            key={key}
            onClick={() => setDir(key)}
            style={{
              flex: 1, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              padding: '7px 0', borderRadius: 10, border: 'none',
              color: dir === key ? 'white' : '#64748B',
              background: dir === key ? color : '#F1F5F9',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <Slider label="Start" value={start} min={dir === 'minus' ? safeSteps : 0} max={15}
        onChange={setStart} color="#6366F1" />
      <Slider label="Hops" value={safeSteps} min={1} max={Math.max(1, maxSteps)}
        onChange={setSteps} color="#C49A1A" />

      {/* Live equation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 24, fontWeight: 800, color: '#1B2B4B', margin: '12px 0',
      }}>
        <Box>{start}</Box>
        <span>{dir === 'plus' ? '+' : '−'}</span>
        <Box>{safeSteps}</Box>
        <span>=</span>
        <Box highlight>{end}</Box>
      </div>

      {/* SVG number line */}
      <div style={{ background: '#0F172A', borderRadius: 16, padding: 10, overflowX: 'auto' }}>
        <svg viewBox="0 0 620 120" style={{ width: '100%', minWidth: 500, height: 110 }}>
          <line x1="30" y1="80" x2="590" y2="80" stroke="#475569" strokeWidth="4" />
          {Array.from({ length: 21 }).map((_, i) => {
            const isStart = i === start
            const isEnd = i === end
            return (
              <g key={i}>
                <line x1={x(i)} y1="75" x2={x(i)} y2="85" stroke="#94A3B8" strokeWidth="2" />
                <text x={x(i)} y="105" fontSize="10" fontFamily="monospace" textAnchor="middle"
                  fill={isStart ? '#818CF8' : isEnd ? '#FBBF24' : '#94A3B8'}
                  fontWeight={isStart || isEnd ? 'bold' : 'normal'}>{i}</text>
                {isStart && <circle cx={x(i)} cy="80" r="4.5" fill="#818CF8" />}
                {isEnd && <circle cx={x(i)} cy="80" r="4.5" fill="#FBBF24" />}
              </g>
            )
          })}
          <path d={`M ${startX},80 Q ${ctrlX},${ctrlY} ${endX},80`}
            fill="none" stroke="#FBBF24" strokeWidth="3.5" strokeDasharray="4,4" />
          <circle cx={ctrlX} cy={ctrlY + 12} r="12" fill="#FBBF24" stroke="#fff" strokeWidth="2" />
          <text x={ctrlX} y={ctrlY + 16} fontSize="12" textAnchor="middle">🦘</text>
        </svg>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, onChange, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#64748B' }}>
        <span>{label}</span><span style={{ color }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color }} />
    </div>
  )
}

function Box({ children, highlight }) {
  return (
    <span style={{
      width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, fontFamily: 'monospace',
      background: highlight ? '#1B2B4B' : 'white',
      color: highlight ? 'white' : '#1B2B4B',
      border: highlight ? 'none' : '2px solid #E2E8F0',
    }}>{children}</span>
  )
}
