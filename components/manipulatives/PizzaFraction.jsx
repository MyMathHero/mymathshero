'use client'
import { useState } from 'react'

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const DENOM_WORDS = {
  2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths',
  7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 11: 'elevenths', 12: 'twelfths',
}

/**
 * Pizza/pie fraction tool. Sliders set the denominator (total slices) and
 * numerator (coloured slices); an SVG pie redraws its sectors and the fraction
 * is shown in words ("three eighths"). Pure render, no AI cost.
 */
export default function PizzaFraction() {
  const [denom, setDenom] = useState(8)
  const [num, setNum] = useState(3)

  const setDenominator = (v) => {
    setDenom(v)
    if (num > v) setNum(v)
  }

  const sectors = []
  for (let i = 0; i < denom; i++) {
    const step = 360 / denom
    const a0 = (i * step * Math.PI) / 180
    const a1 = ((i + 1) * step * Math.PI) / 180
    const x1 = 100 + 85 * Math.cos(a0)
    const y1 = 100 + 85 * Math.sin(a0)
    const x2 = 100 + 85 * Math.cos(a1)
    const y2 = 100 + 85 * Math.sin(a1)
    const large = step > 180 ? 1 : 0
    sectors.push(
      <path key={i}
        d={`M 100,100 L ${x1},${y1} A 85,85 0 ${large},1 ${x2},${y2} Z`}
        fill={i < num ? 'url(#pieGrad)' : 'transparent'}
        stroke="#94A3B8" strokeWidth="1.5" />
    )
  }

  const word =
    `${NUM_WORDS[num] || num} ` +
    (() => {
      const d = DENOM_WORDS[denom] || 'parts'
      return num > 1 ? d : d.slice(0, -1) // singular for 1
    })()

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <svg viewBox="0 0 200 200" style={{ width: 180, height: 180, transform: 'rotate(-90deg)' }}>
          <circle cx="100" cy="100" r="85" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="3" />
          {sectors}
          <defs>
            <linearGradient id="pieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <Slider label="Total slices" value={denom} min={2} max={12}
        onChange={setDenominator} color="#475569" />
      <Slider label="Coloured slices" value={num} min={1} max={denom}
        onChange={setNum} color="#C49A1A" />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10, background: '#FDF6E3', border: '1px solid #F5E2A8',
        borderRadius: 12, padding: '10px 14px',
      }}>
        <div style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, fontSize: 22, color: '#1B2B4B' }}>
          <div>{num}</div>
          <div style={{ width: 28, height: 3, background: '#1B2B4B', margin: '3px auto' }} />
          <div>{denom}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>In words</p>
          <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#475569', textTransform: 'capitalize' }}>{word}</p>
        </div>
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
