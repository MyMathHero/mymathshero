'use client'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

// The MyMathsHero Arcade Card — a collectible membership card that IS the
// play-time wallet. Dark theme only. FRONT shows the student's name + play time
// + Hero. TAP flips it to the BACK, the student's "ID" (unique card number,
// name, member-since, perks). Exposed methods:
//   ref.shimmer()  → gold sweep + a pop on the minutes (after a top-up)
//   ref.launch()   → forward "launch" flip for starting a game (Promise ~700ms)
//   ref.reset()    → clear the launch flip
const GOLD = '#C49A1A'
const GOLD_HI = '#FFD54A'

const ArcadeCard = forwardRef(function ArcadeCard(
  {
    minutes = 0, plan = 'standard', cardNumber = '2500 7250 1025 8888',
    studentName = 'Hero', memberSince = null, compact = false,
  },
  ref
) {
  const cardRef = useRef(null)
  const shineRef = useRef(null)
  const minsRef = useRef(null)
  const [flipped, setFlipped] = useState(false)   // tap → show ID back
  const [launching, setLaunching] = useState(false)

  useImperativeHandle(ref, () => ({
    shimmer() {
      const shine = shineRef.current, m = minsRef.current
      if (shine) { shine.classList.remove('ac-go'); void shine.offsetWidth; shine.classList.add('ac-go') }
      if (m) { m.classList.remove('ac-pop'); void m.offsetWidth; m.classList.add('ac-pop') }
    },
    launch() {
      return new Promise((res) => { setFlipped(false); setLaunching(true); setTimeout(() => res(), 700) })
    },
    reset() { setLaunching(false) },
    el() { return cardRef.current },
  }))

  const W = compact ? 300 : 340
  const H = compact ? 189 : 214

  // Each face is hidden the AWAY-facing side two ways: backface-visibility AND an
  // opacity gate that swaps at the flip's midpoint — because overflow:hidden +
  // rounded corners can flatten the 3D context and defeat backface-visibility
  // alone (that caused the front to bleed through the back).
  const faceGate = { transition: 'opacity 0s linear .28s' }
  const frontOpacity = flipped ? 0 : 1
  const backOpacity = flipped ? 1 : 0

  return (
    <div style={{ perspective: 1400, display: 'flex', justifyContent: 'center' }}>
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

      <div
        ref={cardRef}
        onClick={() => { if (!launching) setFlipped(f => !f) }}
        className={launching ? 'ac-launch' : ''}
        style={{
          position: 'relative', width: W, height: H, transformStyle: 'preserve-3d',
          transition: 'transform .6s cubic-bezier(.3,.8,.25,1)', willChange: 'transform',
          transform: launching ? undefined : `rotateY(${flipped ? 180 : 0}deg)`, cursor: 'pointer',
        }}
      >
        {/* FRONT — a clean vertical flex stack: body grows, band pinned at the
            bottom, so no two zones ever overlap. */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg,#16294c,#0b1732)',
          boxShadow: '0 30px 60px -24px rgba(0,0,0,.6), 0 2px 0 rgba(140,180,255,.22) inset',
          border: '1px solid rgba(255,255,255,.10)',
          display: 'flex', flexDirection: 'column',
          opacity: frontOpacity, ...faceGate,
        }}>
          {/* faceted lines */}
          <svg viewBox="0 0 340 214" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {[['212','0','340','70'],['252','0','340','120'],['182','214','340','120'],['232','214','340','170']].map((p, i) => (
              <line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} stroke="rgba(196,154,26,.22)" strokeWidth="1" />
            ))}
          </svg>

          {/* Hero mascot — pinned to the card's bottom-right at its NATURAL aspect
              ratio (width fixed, height auto), clipped by the card's overflow. It
              sits BELOW the text zones (zIndex 1) so its PNG size can never push
              the layout. The gold coin floats beside the robot's hand. */}
          <img src="/assets/robot/Heropeekingfromdown.png" alt="" aria-hidden
            style={{ position: 'absolute', right: 6, bottom: -6, width: compact ? 116 : 128, height: 'auto', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{
            position: 'absolute', right: compact ? 96 : 108, top: compact ? 44 : 52,
            width: 42, height: 42, borderRadius: '50%', zIndex: 1,
            background: `radial-gradient(circle at 38% 32%,${GOLD_HI},${GOLD} 70%,#9a7415)`,
            boxShadow: '0 0 18px rgba(196,154,26,.55), 0 6px 14px -4px rgba(0,0,0,.5)',
            border: '2px solid rgba(255,240,190,.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: '#7a5c12', fontSize: 20, animation: 'acFloat 3.2s ease-in-out infinite',
          }}>H</div>

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

            {/* mid: play-time (left). Hero is a pinned decorative layer (below),
                so its PNG size can never push these zones around. */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: '#9fb3d6', textTransform: 'uppercase' }}>Play time</div>
              <div ref={minsRef} style={{
                fontWeight: 900, fontSize: 38, color: '#eef4ff', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: 6,
              }}>
                {Math.max(0, minutes)} <span style={{ fontSize: 15, color: GOLD, fontWeight: 800 }}>min</span>
              </div>
            </div>

            {/* cardholder name + a subtle "tap to flip" hint */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', marginBottom: 8, gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 8.5, letterSpacing: 2, fontWeight: 800, color: '#9fb3d6', textTransform: 'uppercase' }}>Cardholder</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#eef4ff', letterSpacing: '.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
                  {studentName}
                </div>
              </div>
              <div style={{ fontSize: 9, color: '#7d8fb2', fontWeight: 700, whiteSpace: 'nowrap' }}>tap to flip ↻</div>
            </div>
          </div>

          {/* BAND (front) — chip + plan badge. The card NUMBER lives on the back. */}
          <div style={{
            position: 'relative', zIndex: 2, height: 48, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px',
            background: 'linear-gradient(90deg,transparent, rgba(196,154,26,.06))',
            borderTop: '1px solid rgba(196,154,26,.22)',
          }}>
            <div style={{ width: 32, height: 24, borderRadius: 5, flexShrink: 0, position: 'relative', background: 'linear-gradient(135deg,#f4dd94,#E6C35A 60%,#b9902f)', boxShadow: 'inset 0 0 0 1px rgba(120,90,20,.5)' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(120,90,20,.45)' }} />
              <div style={{ position: 'absolute', top: 5, bottom: 5, left: '50%', width: 1, background: 'rgba(120,90,20,.45)' }} />
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 10, letterSpacing: 2, fontWeight: 800, color: GOLD, textTransform: 'uppercase' }}>
              {plan === 'premium' ? '⭐ Premium' : 'Player'}
            </div>
          </div>

          {/* shimmer overlay */}
          <div ref={shineRef} style={{
            position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', opacity: 0, mixBlendMode: 'screen',
            background: `linear-gradient(105deg,transparent 30%,${GOLD_HI} 48%,transparent 66%)`,
          }} />
        </div>

        {/* BACK — the student's Arcade ID (shown on tap-flip). */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)', background: 'linear-gradient(135deg,#16294c,#0b1732)',
          border: '1px solid rgba(255,255,255,.10)', display: 'flex', flexDirection: 'column',
          opacity: backOpacity, ...faceGate,
        }}>
          {/* magnetic stripe */}
          <div style={{ height: 34, marginTop: 14, background: 'linear-gradient(90deg,#05070d,#12203a)', borderTop: '1px solid rgba(0,0,0,.5)', borderBottom: '1px solid rgba(255,255,255,.06)' }} />

          <div style={{ flex: 1, minHeight: 0, padding: '14px 18px 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 9, letterSpacing: 2, fontWeight: 800, color: '#9fb3d6', textTransform: 'uppercase' }}>Hero Arcade ID</div>
              {memberSince && <div style={{ fontSize: 8.5, letterSpacing: 1.5, fontWeight: 700, color: '#7d8fb2' }}>MEMBER SINCE {memberSince}</div>}
            </div>

            {/* the unique card number — big, the way a real card back reads */}
            <div style={{
              marginTop: 12, fontFamily: 'ui-monospace,Menlo,monospace', fontVariantNumeric: 'tabular-nums',
              letterSpacing: 2, fontSize: compact ? 18 : 20, fontWeight: 700, color: '#eef4ff', whiteSpace: 'nowrap',
            }}>{cardNumber}</div>
            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 800, color: GOLD, letterSpacing: '.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{studentName}</div>

            {/* perks — moved from the front to the back ID */}
            <div style={{ display: 'flex', gap: 14, marginTop: 'auto', marginBottom: 14, flexWrap: 'wrap' }}>
              {[['🎮', 'Play'], ['🏆', 'Rewards'], ['⭐', 'Level up']].map(([e, t]) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 700, color: '#9fb3d6' }}>
                  {e} <b style={{ color: '#eef4ff', textTransform: 'uppercase', letterSpacing: '.5px' }}>{t}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LAUNCH overlay — sits on top during a game launch. */}
        {launching && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 20, zIndex: 6,
            background: 'linear-gradient(135deg,#0b1732,#12233f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center', color: '#eef4ff' }}>
              <div style={{ width: 34, height: 34, margin: '0 auto 12px', borderRadius: '50%', border: '3px solid rgba(196,154,26,.25)', borderTopColor: GOLD, animation: 'acSpin .8s linear infinite' }} />
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.4px' }}>Loading…</div>
              <div style={{ fontSize: 13, color: '#9fb3d6', marginTop: 4 }}>Your time starts when it loads ⏱️</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default ArcadeCard
