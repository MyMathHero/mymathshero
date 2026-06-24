'use client'
import { useEffect, useState } from 'react'

// Reward-collection animation (feedback report #3): when a question is answered
// correctly, coins + XP particles spawn mid-screen and fly up toward the wallet/
// Hero-Points counters in the top-right header, then fade. Paired with a combo
// message (#2). Purely visual — fixed overlay, pointer-events: none.
//
// Usage: render <RewardBurst burst={burst} /> once; set `burst` to
// { id, xp, coins, combo, message } to fire (id makes each trigger unique).

const COIN_COUNT = 6
const XP_COUNT = 5

export default function RewardBurst({ burst }) {
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (!burst) return
    setActive(burst)
    const t = setTimeout(() => setActive(null), 1400)
    return () => clearTimeout(t)
  }, [burst])

  if (!active) return null

  // Particles fly from screen-centre toward the top-right header (where coins /
  // Hero Points live). Slight spread so it reads as a little shower.
  const coins = Array.from({ length: COIN_COUNT })
  const xps = Array.from({ length: XP_COUNT })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes rb-fly {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
          15%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translate(var(--rb-tx), var(--rb-ty)) scale(0.7); opacity: 0; }
        }
        @keyframes rb-msg {
          0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          25%  { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          75%  { transform: translate(-50%, -60%) scale(1);   opacity: 1; }
          100% { transform: translate(-50%, -90%) scale(0.95); opacity: 0; }
        }
      `}</style>

      {/* Combo / streak message near the centre */}
      {active.message && (
        <div style={{
          position: 'absolute', left: '50%', top: '38%',
          animation: 'rb-msg 1.4s ease-out forwards',
          fontWeight: 900, fontSize: 26, color: '#fff',
          textShadow: '0 2px 12px rgba(0,0,0,0.45)', whiteSpace: 'nowrap',
        }}>
          {active.message}
        </div>
      )}

      {/* Coins fly toward the top-right wallet */}
      {coins.map((_, i) => {
        const tx = `calc(40vw + ${(Math.random() * 40 - 20)}px)`
        const ty = `calc(-42vh + ${(Math.random() * 30 - 15)}px)`
        return (
          <div key={`c${i}`} style={{
            position: 'absolute', left: '50%', top: '50%', fontSize: 26,
            '--rb-tx': tx, '--rb-ty': ty,
            animation: `rb-fly ${0.9 + Math.random() * 0.4}s cubic-bezier(0.5,0,0.3,1) ${i * 0.05}s forwards`,
          }}>🪙</div>
        )
      })}

      {/* XP particles fly toward the Hero-Points counter (also top-right) */}
      {xps.map((_, i) => {
        const tx = `calc(38vw + ${(Math.random() * 40 - 20)}px)`
        const ty = `calc(-42vh + ${(Math.random() * 30 - 15)}px)`
        return (
          <div key={`x${i}`} style={{
            position: 'absolute', left: '50%', top: '52%', fontSize: 22,
            '--rb-tx': tx, '--rb-ty': ty,
            animation: `rb-fly ${0.9 + Math.random() * 0.4}s cubic-bezier(0.5,0,0.3,1) ${0.1 + i * 0.05}s forwards`,
          }}>⚡</div>
        )
      })}

      {/* +values that pop at the origin */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'rb-msg 1.2s ease-out forwards',
        display: 'flex', gap: 14, fontWeight: 900, fontSize: 20,
      }}>
        {active.xp > 0 && <span style={{ color: '#FBBF24', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>+{active.xp} ⚡</span>}
        {active.coins > 0 && <span style={{ color: '#FCD34D', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>+{active.coins} 🪙</span>}
      </div>
    </div>
  )
}

// Pick a combo message for a run of consecutive correct answers (#2). `fast` =
// answered quickly; `newBest` = beat their previous best combo this run.
export function comboMessage(combo, { fast = false, newBest = false } = {}) {
  if (newBest && combo >= 3) return `🏆 New Best — ${combo} in a row!`
  if (combo >= 10) return `🌟 Unstoppable! ${combo} in a row!`
  if (combo >= 5) return `🔥 ${combo} in a row!`
  if (combo >= 3) return `🔥 ${combo} correct!`
  if (fast) return '⚡ Lightning fast!'
  if (combo === 2) return 'Nice — 2 in a row!'
  return 'Correct! ✅'
}
