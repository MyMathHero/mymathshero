'use client'
import { forwardRef, useImperativeHandle, useRef } from 'react'

// The MyMathsHero Arcade Card — a collectible "membership card" that IS the
// play-time wallet. Dark theme only (the arcade forces a dark backdrop). The
// minutes balance lives ON the card; a parent can call the exposed methods:
//   ref.shimmer()   → gold sweep + a pulse on the minutes (after a top-up)
//   ref.launch(name)→ flip the card forward to "launch" a game, resolves ~2.1s
//
// Pointer-tilt is built in. Pass `minutes`, `plan`, and an optional `cardNumber`.
const GOLD = '#C49A1A'
const GOLD_HI = '#FFD54A'

const ArcadeCard = forwardRef(function ArcadeCard(
  { minutes = 0, plan = 'standard', cardNumber = '2500 7250 1025 8888', compact = false },
  ref
) {
  const cardRef = useRef(null)
  const shineRef = useRef(null)
  const minsRef = useRef(null)

  useImperativeHandle(ref, () => ({
    // Gold shimmer sweep + a pop on the minutes counter (call after a top-up).
    shimmer() {
      const shine = shineRef.current, m = minsRef.current
      if (shine) { shine.classList.remove('ac-go'); void shine.offsetWidth; shine.classList.add('ac-go') }
      if (m) { m.classList.remove('ac-pop'); void m.offsetWidth; m.classList.add('ac-pop') }
    },
    // Flip the card forward to launch. Returns a promise that resolves when the
    // flip has landed (so the caller can start the game underneath).
    launch() {
      const c = cardRef.current
      return new Promise((res) => {
        if (!c) return res()
        c.classList.add('ac-launch')
        setTimeout(() => res(), 700)
      })
    },
    reset() {
      const c = cardRef.current
      if (c) { c.classList.remove('ac-launch'); c.style.transform = 'none' }
    },
    el() { return cardRef.current },
  }))

  // Pointer tilt.
  function onMove(e) {
    const c = cardRef.current
    if (!c || c.classList.contains('ac-launch')) return
    const r = c.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    c.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 12}deg)`
  }
  function onLeave() {
    const c = cardRef.current
    if (c && !c.classList.contains('ac-launch')) c.style.transform = 'none'
  }

  const W = compact ? 300 : 340
  const H = compact ? 189 : 214

  return (
    <div style={{ perspective: 1400, display: 'flex', justifyContent: 'center' }} onPointerMove={onMove} onPointerLeave={onLeave}>
      <style>{`
        @keyframes acBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.12)}}
        @keyframes acFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-5px) rotate(4deg)}}
        @keyframes acPop{0%{transform:scale(1)}40%{transform:scale(1.16)}100%{transform:scale(1)}}
        @keyframes acSweep{0%{opacity:0;transform:translateX(-30%)}20%{opacity:.9}100%{opacity:0;transform:translateX(30%)}}
        @keyframes acSpin{to{transform:rotate(360deg)}}
        @keyframes acLaunch{0%{transform:none}35%{transform:translateY(-22px) rotateX(13deg) scale(1.05)}60%{transform:translateY(-8px) rotateY(180deg) scale(1.02)}100%{transform:translateY(-6px) rotateY(180deg) scale(1)}}
        .ac-pop{animation:acPop .5s ease}
        .ac-go{animation:acSweep .9s ease}
        .ac-launch{animation:acLaunch 1.1s cubic-bezier(.5,0,.2,1) forwards}
        @media (prefers-reduced-motion:reduce){.ac-launch,.ac-go,.ac-pop{animation-duration:.001s !important}}
      `}</style>

      <div ref={cardRef} style={{
        position: 'relative', width: W, height: H, transformStyle: 'preserve-3d',
        transition: 'transform .5s cubic-bezier(.2,.7,.2,1)', willChange: 'transform',
      }}>
        {/* FRONT — a clean vertical flex stack: body grows, band pinned at the
            bottom, so no two zones ever overlap. */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg,#16294c,#0b1732)',
          boxShadow: '0 30px 60px -24px rgba(0,0,0,.6), 0 2px 0 rgba(140,180,255,.22) inset',
          border: '1px solid rgba(255,255,255,.10)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* faceted lines */}
          <svg viewBox="0 0 340 214" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {[['212','0','340','70'],['252','0','340','120'],['182','214','340','120'],['232','214','340','170']].map((p, i) => (
              <line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} stroke="rgba(196,154,26,.22)" strokeWidth="1" />
            ))}
          </svg>

          {/* BODY (everything above the band) */}
          <div style={{ position: 'relative', zIndex: 2, flex: 1, minHeight: 0, padding: '15px 18px 0', display: 'flex', flexDirection: 'column' }}>
            {/* row 1: wordmark + joystick */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 19, fontStyle: 'italic', letterSpacing: '-.5px', color: '#eef4ff', lineHeight: 1 }}>
                <i>my</i>maths<b style={{ color: GOLD, fontStyle: 'italic' }}>hero</b>
                <span style={{ fontSize: 9, verticalAlign: 'super', color: '#9fb3d6', fontStyle: 'normal', fontWeight: 600 }}>™</span>
              </div>
              <svg viewBox="0 0 40 32" style={{ width: 38, height: 30, flexShrink: 0, opacity: .85 }}>
                <g stroke={GOLD} fill="none" strokeWidth="1.6">
                  <rect x="4" y="12" width="32" height="16" rx="8" /><circle cx="20" cy="6" r="3" /><path d="M20 9v3" />
                  <circle cx="12" cy="20" r="1.6" /><path d="M28 18v4M26 20h4" />
                </g>
              </svg>
            </div>

            {/* mid: play-time (left) + Hero (right) */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: '#9fb3d6', textTransform: 'uppercase' }}>Play time</div>
                <div ref={minsRef} style={{
                  fontWeight: 900, fontSize: 38, color: '#eef4ff', lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: 6,
                }}>
                  {Math.max(0, minutes)} <span style={{ fontSize: 15, color: GOLD, fontWeight: 800 }}>min</span>
                </div>
              </div>
              {/* Hero + gold H coin */}
              <div style={{ position: 'relative', width: 120, height: 104, flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', left: -6, top: 8, width: 44, height: 44, borderRadius: '50%', zIndex: 3,
                  background: `radial-gradient(circle at 38% 32%,${GOLD_HI},${GOLD} 70%,#9a7415)`,
                  boxShadow: '0 0 0 3px rgba(255,240,190,.35), 0 8px 16px -6px rgba(196,154,26,.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, color: '#7a5c12', fontSize: 22, animation: 'acFloat 3.2s ease-in-out infinite',
                }}>H</div>
                <img src="/assets/robot/Heropeekingfromdown.png" alt="" aria-hidden
                  style={{ position: 'absolute', right: -4, bottom: -15, width: 118, height: 118, objectFit: 'contain', objectPosition: 'top' }} />
              </div>
            </div>

            {/* features — their own row, above the divider */}
            <div style={{ display: 'flex', gap: 16, marginTop: 'auto', marginBottom: 8 }}>
              {[['🎮', 'Play'], ['🏆', 'Rewards'], ['⭐', 'Level up']].map(([e, t]) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 700, color: '#9fb3d6' }}>
                  {e} <b style={{ color: '#eef4ff', textTransform: 'uppercase', letterSpacing: '.5px' }}>{t}</b>
                </div>
              ))}
            </div>
          </div>

          {/* BAND — fixed height, one clean line, nothing wraps */}
          <div style={{
            position: 'relative', zIndex: 2, height: 52, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px',
            background: 'linear-gradient(90deg,transparent, rgba(196,154,26,.06))',
            borderTop: '1px solid rgba(196,154,26,.22)',
          }}>
            <div style={{ width: 32, height: 24, borderRadius: 5, flexShrink: 0, position: 'relative', background: 'linear-gradient(135deg,#f4dd94,#E6C35A 60%,#b9902f)', boxShadow: 'inset 0 0 0 1px rgba(120,90,20,.5)' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(120,90,20,.45)' }} />
              <div style={{ position: 'absolute', top: 5, bottom: 5, left: '50%', width: 1, background: 'rgba(120,90,20,.45)' }} />
            </div>
            <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: 1.5, fontSize: 13, fontWeight: 700, color: '#eef4ff', whiteSpace: 'nowrap' }}>{cardNumber}</div>
            <div style={{ marginLeft: 'auto', fontSize: 8.5, lineHeight: 1.25, letterSpacing: 1.5, fontWeight: 800, color: '#9fb3d6', textTransform: 'uppercase', textAlign: 'right', flexShrink: 0 }}>
              {plan === 'premium' ? <>Premium<br />Access</> : <>Player<br />Access</>}
            </div>
          </div>

          {/* shimmer overlay */}
          <div ref={shineRef} style={{
            position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', opacity: 0, mixBlendMode: 'screen',
            background: `linear-gradient(105deg,transparent 30%,${GOLD_HI} 48%,transparent 66%)`,
          }} />
        </div>

        {/* BACK (launch) */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)', background: 'linear-gradient(135deg,#0b1732,#12233f)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(255,255,255,.10)',
        }}>
          <div style={{ textAlign: 'center', color: '#eef4ff' }}>
            <div style={{ width: 34, height: 34, margin: '0 auto 12px', borderRadius: '50%', border: '3px solid rgba(196,154,26,.25)', borderTopColor: GOLD, animation: 'acSpin .8s linear infinite' }} />
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.4px' }}>Loading…</div>
            <div style={{ fontSize: 13, color: '#9fb3d6', marginTop: 4 }}>Your time starts when it loads ⏱️</div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default ArcadeCard
