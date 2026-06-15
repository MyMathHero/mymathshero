'use client'
import { useState } from 'react'

const TOKENS = ['🐨', '🦘', '🍎', '⭐', '🍫']

/**
 * 10-frame counting tool. Tap cells to place counters; live insight text shows
 * how the count groups (e.g. "5 + 3 = 8"). Pure render, no AI cost.
 */
export default function TenFrame() {
  const [token, setToken] = useState('🐨')
  const [cells, setCells] = useState(() => Array(10).fill(false))
  const count = cells.filter(Boolean).length

  const toggle = (i) =>
    setCells((prev) => prev.map((c, idx) => (idx === i ? !c : c)))
  const clear = () => setCells(Array(10).fill(false))

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {TOKENS.map((t) => (
          <button
            key={t}
            onClick={() => setToken(t)}
            style={{
              width: 38, height: 38, fontSize: 20,
              borderRadius: 10, cursor: 'pointer',
              border: token === t ? '2px solid #C49A1A' : '2px solid #E2E8F0',
              background: token === t ? '#FDF6E3' : 'white',
            }}
          >
            {t}
          </button>
        ))}
        <button
          onClick={clear}
          style={{
            marginLeft: 'auto', fontSize: 12, fontWeight: 700,
            border: '1px solid #E2E8F0', borderRadius: 10,
            padding: '0 12px', background: 'white', cursor: 'pointer',
            color: '#64748B',
          }}
        >
          ↺ Clear
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
          background: '#EEF2FF',
          padding: 10,
          borderRadius: 16,
        }}
      >
        {cells.map((filled, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            style={{
              aspectRatio: '1 / 1',
              border: '2px solid #C7D2FE',
              borderRadius: 12,
              background: filled ? 'linear-gradient(135deg,#EEF2FF,#FDF6E3)' : 'white',
              fontSize: 26, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform .1s',
            }}
          >
            {filled ? token : ''}
          </button>
        ))}
      </div>

      <p
        style={{
          marginTop: 10, fontSize: 13, lineHeight: 1.5,
          background: '#FDF6E3', border: '1px solid #F5E2A8',
          borderRadius: 12, padding: '10px 12px', color: '#475569',
        }}
      >
        {count === 0 && '🤖 Tap the squares to place counters and spot the pattern!'}
        {count > 0 && count < 5 && (
          <>We have <b>{count}</b>. We need <b>{5 - count}</b> more to fill the top row!</>
        )}
        {count === 5 && <>🤖 The whole top row is full — that's <b>exactly 5</b>!</>}
        {count > 5 && count < 10 && (
          <>5 on top and {count - 5} below: <b>5 + {count - 5} = {count}</b>!</>
        )}
        {count === 10 && <>🎉 Full frame! <b>5 + 5 = 10</b>. Amazing!</>}
      </p>
    </div>
  )
}
