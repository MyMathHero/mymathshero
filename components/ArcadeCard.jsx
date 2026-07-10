'use client'
import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback } from 'react'

// The MyMathsHero Arcade Card — drawn on <canvas> so every element (text, coin,
// robot, logo) is painted at exact coordinates. Text and graphics live in fixed
// regions and can NEVER overlap. FRONT = name + play time + Hero. TAP flips to
// the BACK = the student's ID (unique number, name, member-since, perks).
// Exposed methods: ref.shimmer() (top-up sweep), ref.launch() (Promise ~700ms),
// ref.reset().
const CW = 340, CH = 214
const GOLD = '#C9A227', GOLD_HI = '#F2CE4B', INK = '#EAF1FF', SUB = '#93A6C8', DIM = '#6C7F9E'

// ── low-level canvas painters (module scope, reused for both faces) ──────────
function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
}
function paintBg(c) {
  const g = c.createLinearGradient(0, 0, CW, CH)
  g.addColorStop(0, '#1b3059'); g.addColorStop(0.8, '#0c1a35')
  roundRect(c, 0, 0, CW, CH, 20); c.fillStyle = g; c.fill()
  c.save(); roundRect(c, 0, 0, CW, CH, 20); c.clip()
  c.strokeStyle = 'rgba(201,162,39,.20)'; c.lineWidth = 1
  for (const [a, b, d, e] of [[214, 0, 340, 66], [256, 0, 340, 118], [186, 214, 340, 122], [236, 214, 340, 172]]) {
    c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke()
  }
  c.restore()
  roundRect(c, 0.5, 0.5, CW - 1, CH - 1, 20); c.strokeStyle = 'rgba(255,255,255,.09)'; c.lineWidth = 1; c.stroke()
}
// letter-spaced label; returns the x after the last glyph.
function label(c, t, x, y, { size = 9, color = SUB, weight = '800', ls = 2, upper = true } = {}) {
  c.font = `${weight} ${size}px -apple-system,"SF Pro Rounded",system-ui,sans-serif`
  c.fillStyle = color; c.textAlign = 'left'; c.textBaseline = 'alphabetic'
  const s = upper ? String(t).toUpperCase() : String(t)
  let cx = x
  for (const ch of s) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + ls }
  return cx
}
function spacedWidth(c, t, ls) { let w = 0; for (const ch of t) w += c.measureText(ch).width + ls; return w - ls }
function clipText(c, t, max) { let s = String(t); while (c.measureText(s).width > max && s.length > 1) s = s.slice(0, -1); return s === String(t) ? s : s + '…' }
function chip(c, x, y) {
  const g = c.createLinearGradient(x, y, x + 34, y + 26)
  g.addColorStop(0, '#f6e2a0'); g.addColorStop(0.55, '#E6C35A'); g.addColorStop(1, '#b28a2b')
  roundRect(c, x, y, 34, 26, 5); c.fillStyle = g; c.fill()
  c.strokeStyle = 'rgba(110,84,18,.5)'; c.lineWidth = 1
  c.beginPath(); c.moveTo(x + 3, y + 13); c.lineTo(x + 31, y + 13); c.moveTo(x + 17, y + 4); c.lineTo(x + 17, y + 22); c.stroke()
}
function coin(c, cx, cy, r) {
  c.save(); c.shadowColor = 'rgba(201,162,39,.6)'; c.shadowBlur = 18
  const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r)
  g.addColorStop(0, GOLD_HI); g.addColorStop(0.72, GOLD); g.addColorStop(1, '#8f7016')
  c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fillStyle = g; c.fill()
  c.shadowBlur = 0; c.lineWidth = 2; c.strokeStyle = 'rgba(255,240,190,.55)'; c.stroke()
  c.fillStyle = '#5c460f'; c.font = `900 ${Math.round(r)}px -apple-system,system-ui,sans-serif`
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', cx, cy + 1)
  c.textAlign = 'left'; c.restore()
}

const ArcadeCard = forwardRef(function ArcadeCard(
  {
    minutes = 0, plan = 'standard', cardNumber = '2500 7250 1025 8888',
    studentName = 'Hero', memberSince = null, compact = false,
  },
  ref
) {
  const frontRef = useRef(null)
  const backRef = useRef(null)
  const robotRef = useRef(null)   // loaded Hero PNG
  const logoRef = useRef(null)    // loaded arcade logo
  const shineRef = useRef(null)
  const [flipped, setFlipped] = useState(false)
  const [launching, setLaunching] = useState(false)

  // ── draw the FRONT ──
  const drawFront = useCallback(() => {
    const cv = frontRef.current; if (!cv) return
    const c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, CW, CH); paintBg(c)

    // ROBOT zone (bottom-right, clipped). Text is laid out to its LEFT only.
    c.save(); roundRect(c, 0, 0, CW, CH, 20); c.clip()
    const img = robotRef.current
    if (img && img.complete && img.naturalWidth) {
      const zx = 210, zw = 130, zh = 152, zy = CH - zh + 6
      const ar = img.naturalWidth / img.naturalHeight
      let dw = zw, dh = dw / ar; if (dh < zh) { dh = zh; dw = dh * ar }
      c.drawImage(img, zx + (zw - dw) / 2, zy + (zh - dh), dw, dh)
    }
    c.restore()
    coin(c, 236, 96, 21) // anchored above the robot's shoulder

    // wordmark (top-left)
    c.textAlign = 'left'; c.textBaseline = 'alphabetic'
    c.font = '800 italic 19px -apple-system,"SF Pro Rounded",system-ui,sans-serif'
    c.fillStyle = INK; let wx = 18; c.fillText('mymaths', wx, 34)
    wx += c.measureText('mymaths').width; c.fillStyle = GOLD; c.fillText('hero', wx, 34)
    wx += c.measureText('hero').width; c.font = '600 9px system-ui'; c.fillStyle = SUB; c.fillText('™', wx + 1, 28)

    // arcade logo (top-right)
    const lg = logoRef.current
    if (lg && lg.complete && lg.naturalWidth) c.drawImage(lg, CW - 18 - 30, 8, 30, 30)

    // PLAY TIME + big minutes (left column)
    label(c, 'PLAY TIME', 18, 74, { size: 10, ls: 3 })
    c.font = '900 46px -apple-system,"SF Pro Rounded",system-ui,sans-serif'; c.fillStyle = INK
    const mstr = String(Math.max(0, minutes)); c.fillText(mstr, 18, 116)
    const mw = c.measureText(mstr).width
    c.font = '800 16px -apple-system,system-ui,sans-serif'; c.fillStyle = GOLD; c.fillText('min', 18 + mw + 8, 116)

    // CARDHOLDER + name
    label(c, 'CARDHOLDER', 18, 146, { size: 8, ls: 2 })
    c.font = '800 15px -apple-system,"SF Pro Rounded",system-ui,sans-serif'; c.fillStyle = INK
    c.fillText(clipText(c, studentName, 170), 18, 164)

    // bottom band
    c.strokeStyle = 'rgba(201,162,39,.20)'; c.lineWidth = 1
    c.beginPath(); c.moveTo(0, CH - 52); c.lineTo(CW, CH - 52); c.stroke()
    chip(c, 18, CH - 39)
    const planT = plan === 'premium' ? '★ PREMIUM' : 'PLAYER'
    c.font = '800 11px -apple-system,system-ui,sans-serif'
    label(c, planT, CW - 18 - spacedWidth(c, planT, 2), CH - 22, { size: 11, ls: 2, color: GOLD, upper: false })
  }, [minutes, plan, studentName])

  // ── draw the BACK (ID) ──
  const drawBack = useCallback(() => {
    const cv = backRef.current; if (!cv) return
    const c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, CW, CH); paintBg(c)
    c.fillStyle = '#0a1424'; c.fillRect(0, 16, CW, 36) // mag stripe
    label(c, 'HERO ARCADE ID', 18, 74, { size: 9, ls: 2.5 })
    if (memberSince) {
      const since = 'MEMBER SINCE ' + memberSince
      c.font = '700 8.5px system-ui'
      label(c, since, CW - 18 - spacedWidth(c, since, 1), 74, { size: 8.5, ls: 1, color: DIM, upper: false })
    }
    c.font = '600 21px "SF Mono",ui-monospace,Menlo,monospace'; c.fillStyle = INK
    let nx = 18; for (const ch of String(cardNumber)) { c.fillText(ch, nx, 104); nx += c.measureText(ch).width + 3 }
    c.font = '800 15px -apple-system,"SF Pro Rounded",system-ui,sans-serif'; c.fillStyle = GOLD
    c.fillText(clipText(c, studentName, 300), 18, 126)
    // perks row
    let px = 18
    for (const [e, t] of [['🎮', 'PLAY'], ['🏆', 'REWARDS'], ['⭐', 'LEVEL UP']]) {
      c.font = '16px system-ui'; c.fillStyle = INK; c.textBaseline = 'alphabetic'; c.fillText(e, px, CH - 22)
      px += c.measureText(e).width + 6
      px = label(c, t, px, CH - 24, { size: 9.5, ls: 0.5, color: INK, upper: false }) + 18
    }
  }, [cardNumber, memberSince, studentName])

  // Load the images once, then redraw.
  useEffect(() => {
    const robot = new Image(); robot.src = '/assets/robot/Heropeekingfromdown.png'
    robot.onload = () => { robotRef.current = robot; drawFront() }
    robotRef.current = robot
    const logo = new Image(); logo.src = '/assets/arcadelogo.png'
    logo.onload = () => { logoRef.current = logo; drawFront() }
    logoRef.current = logo
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw whenever the data changes.
  useEffect(() => { drawFront() }, [drawFront])
  useEffect(() => { drawBack() }, [drawBack])

  useImperativeHandle(ref, () => ({
    shimmer() {
      const s = shineRef.current
      if (s) { s.classList.remove('ac-go'); void s.offsetWidth; s.classList.add('ac-go') }
    },
    launch() { return new Promise((res) => { setFlipped(false); setLaunching(true); setTimeout(() => res(), 700) }) },
    reset() { setLaunching(false) },
  }))

  const W = compact ? 300 : 340
  const H = compact ? 189 : 214
  const faceBase = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 20,
    backfaceVisibility: 'hidden', transition: 'opacity 0s linear .28s',
    boxShadow: '0 26px 60px -26px rgba(0,0,0,.7)',
  }

  return (
    <div style={{ perspective: 1600, width: W, height: H }}>
      <style>{`
        @keyframes acSpin{to{transform:rotate(360deg)}}
        @keyframes acSweep{0%{opacity:0;transform:translateX(-30%)}22%{opacity:.85}100%{opacity:0;transform:translateX(30%)}}
        .ac-go{animation:acSweep 1s ease}
        @media (prefers-reduced-motion:reduce){.ac-go{animation:none}}
      `}</style>

      <div
        onClick={() => { if (!launching) setFlipped(f => !f) }}
        style={{
          position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d',
          transition: 'transform .6s cubic-bezier(.3,.8,.25,1)', cursor: 'pointer',
          transform: launching ? undefined : `rotateY(${flipped ? 180 : 0}deg)`,
        }}
      >
        {/* FRONT canvas */}
        <canvas ref={frontRef} width={CW * 2} height={CH * 2}
          style={{ ...faceBase, opacity: flipped ? 0 : 1 }} />
        {/* gold shimmer sweep on top-up (overlaid on the front) */}
        <div ref={shineRef} style={{
          position: 'absolute', inset: 0, borderRadius: 20, pointerEvents: 'none', opacity: 0,
          mixBlendMode: 'screen', backfaceVisibility: 'hidden',
          background: `linear-gradient(105deg,transparent 34%,${GOLD_HI} 50%,transparent 64%)`,
          display: flipped ? 'none' : 'block',
        }} />
        {/* BACK canvas */}
        <canvas ref={backRef} width={CW * 2} height={CH * 2}
          style={{ ...faceBase, transform: 'rotateY(180deg)', opacity: flipped ? 1 : 0 }} />

        {/* LAUNCH overlay */}
        {launching && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 20, zIndex: 6,
            background: 'linear-gradient(135deg,#0b1732,#12233f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center', color: INK }}>
              <div style={{ width: 34, height: 34, margin: '0 auto 12px', borderRadius: '50%', border: `3px solid rgba(201,162,39,.25)`, borderTopColor: GOLD, animation: 'acSpin .8s linear infinite' }} />
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.4px' }}>Loading…</div>
              <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>Your time starts when it loads ⏱️</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default ArcadeCard
