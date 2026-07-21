'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { LAUNCH_DATE_DISPLAY } from '@/lib/launchDate'
import { Analytics } from '@/lib/analytics'

const NAVY = '#1B2B4B', GOLD = '#C49A1A'

const TY_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap');
  @keyframes tyFall { to { transform: translate(var(--drift), 108vh) rotate(var(--rot)); opacity: 0; } }
  @keyframes tyPop { 0% { opacity: 0; transform: scale(0.6) translateY(20px); } 60% { transform: scale(1.06) translateY(0); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes tyRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  @keyframes tyFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes tyGlow { 0%,100% { box-shadow: 0 0 0 rgba(196,154,26,0); } 50% { box-shadow: 0 0 34px rgba(196,154,26,0.35); } }
  .ty-rise { opacity: 0; animation: tyRise 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
`

// Small deterministic-ish confetti field (client-only so SSR doesn't mismatch).
function Confetti() {
  const [pieces, setPieces] = useState([])
  useEffect(() => {
    const colors = ['#2563EB', '#16A34A', '#C49A1A', '#EF4444', '#7C3AED', '#FFD766']
    const arr = Array.from({ length: 70 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 2.6 + Math.random() * 2.2,
      size: 6 + Math.random() * 8,
      rot: Math.random() * 360,
      color: colors[i % colors.length],
      round: Math.random() > 0.5,
      drift: (Math.random() - 0.5) * 120,
    }))
    setPieces(arr)
  }, [])
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {pieces.map(p => (
        <span key={p.id} style={{
          position: 'absolute', top: '-6%', left: `${p.left}%`,
          width: p.size, height: p.size * (p.round ? 1 : 1.6),
          background: p.color, borderRadius: p.round ? '50%' : 2,
          opacity: 0.9,
          animation: `tyFall ${p.dur}s cubic-bezier(0.3,0.1,0.4,1) ${p.delay}s forwards`,
          ['--drift']: `${p.drift}px`, ['--rot']: `${p.rot}deg`,
        }} />
      ))}
    </div>
  )
}

function ThankYouInner() {
  // Personalisation is handed over in sessionStorage by the waitlist form, so
  // the URL stays clean (/thankyou — no name or status in the query string).
  // If it's missing (direct visit, storage blocked, refresh in a new tab) the
  // page simply renders the generic version.
  const [name, setName] = useState('')
  const [founding, setFounding] = useState(false)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)

    let ty = {}
    try { ty = JSON.parse(sessionStorage.getItem('mmh_ty') || '{}') } catch { /* ignore */ }
    const foundingFamily = !!ty.founding
    setName((ty.name || '').trim())
    setFounding(foundingFamily)

    // ── Marketing conversion tracking ──────────────────────────────────────
    // Fire the conversion EXACTLY ONCE per page load. This is the marketing
    // signal: GA4 event `waitlist_confirmed` (mark it a Key event/conversion in
    // GA4) + a dataLayer push so GTM triggers (ad pixels, etc.) can fire too.
    // The window flag guards against React StrictMode double-invoking the effect
    // (which would otherwise double-count the conversion).
    if (typeof window !== 'undefined' && window.__waitlistConfirmedFired) return
    if (typeof window !== 'undefined') window.__waitlistConfirmedFired = true

    Analytics.waitlistConfirmed({ foundingFamily })
    if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: 'waitlist_confirmed',
        founding_family: foundingFamily ? 'yes' : 'no',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#FFFFFF', color: NAVY,
      fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 20px', position: 'relative', overflow: 'hidden', textAlign: 'center',
    }}>
      {/* dangerouslySetInnerHTML so React treats the CSS as opaque (avoids a
          hydration text-content mismatch from the template literal). */}
      <style dangerouslySetInnerHTML={{ __html: TY_CSS }} />

      {mounted && <Confetti />}

      {/* soft brand aura */}
      <div aria-hidden style={{
        position: 'absolute', width: 720, height: 720, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.08), rgba(196,154,26,0.05) 45%, transparent 70%)',
        filter: 'blur(6px)', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 620, width: '100%' }}>
        {/* Hero robot celebrating */}
        <div style={{ animation: 'tyPop 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
          <img
            src="/assets/robot/HeroEnjoying.png"
            alt="Hero celebrating"
            style={{ width: 'min(240px, 60vw)', height: 'auto', filter: 'drop-shadow(0 22px 44px rgba(27,43,75,0.20))', animation: 'tyFloat 4s ease-in-out infinite' }}
          />
        </div>

        <div className="ty-rise" style={{ animationDelay: '0.15s' }}>
          <span style={{
            display: 'inline-block', marginTop: 6, marginBottom: 14,
            background: 'rgba(22,163,74,0.1)', color: '#16A34A',
            fontWeight: 800, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
            padding: '7px 16px', borderRadius: 99,
          }}>✓ You're on the list</span>
        </div>

        <h1 className="ty-rise" style={{ animationDelay: '0.22s', fontSize: 'clamp(34px, 6vw, 56px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.05, margin: '0 0 14px' }}>
          {name ? <>Thank you, {name}! <span style={{ color: GOLD }}>🎉</span></> : <>You're in! <span style={{ color: GOLD }}>🎉</span></>}
        </h1>

        <p className="ty-rise" style={{ animationDelay: '0.3s', fontSize: 18, lineHeight: 1.6, color: '#475569', margin: '0 auto 26px', maxWidth: 480 }}>
          You've joined the MyMathsHero founding-family waitlist. We'll email you with early-access details ahead of our <b style={{ color: NAVY }}>{LAUNCH_DATE_DISPLAY}</b> launch.
        </p>

        {/* Founding-family perk card (the actual queue number is intentionally
            NOT shown — better for marketing to keep it a mystery). */}
        {founding && (
          <div className="ty-rise" style={{ animationDelay: '0.38s', display: 'inline-flex', alignItems: 'center', gap: 12, background: '#F7F9FC', border: '1px solid #E7ECF3', borderRadius: 18, padding: '16px 24px', marginBottom: 26, textAlign: 'left', maxWidth: 340 }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>🎁</span>
            <div>
              <div style={{ fontWeight: 800, color: GOLD, fontSize: 15 }}>You're a Founding Family</div>
              <div style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.4, marginTop: 2 }}>1 month free + $19.99/mo for your first year</div>
            </div>
          </div>
        )}

        {/* What's next */}
        <div className="ty-rise" style={{ animationDelay: '0.46s', background: '#FFFFFF', border: '1px solid #E7ECF3', borderRadius: 20, padding: '22px 24px', marginBottom: 28, boxShadow: '0 12px 34px rgba(27,43,75,0.06)' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: NAVY, marginBottom: 14 }}>What happens next</div>
          <div style={{ display: 'grid', gap: 12, textAlign: 'left' }}>
            {[
              ['📧', 'Check your inbox', 'A confirmation email is on its way (peek in spam just in case).'],
              ['🚀', 'Early access first', "Founding families get in before everyone else — we'll invite you when it's ready."],
              ['🎁', 'Your perks are locked in', 'Your founding-family pricing and free month are reserved for you.'],
            ].map(([emoji, title, desc], i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>{title}</div>
                  <div style={{ color: '#64748B', fontSize: 13.5, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="ty-rise" style={{ animationDelay: '0.54s', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/how-it-works" style={{ background: 'linear-gradient(135deg, #C49A1A, #FFD700)', color: NAVY, fontWeight: 800, fontSize: 15, padding: '14px 26px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 10px 26px rgba(245,158,11,0.35)', animation: 'tyGlow 3s ease-in-out infinite' }}>
            See how Hero works →
          </Link>
          <Link href="/coming-soon" style={{ color: NAVY, fontWeight: 700, fontSize: 15, padding: '14px 20px', borderRadius: 14, textDecoration: 'none', border: '1px solid #E2E8F0' }}>
            Back home
          </Link>
        </div>

        {/* Share nudge */}
        <p className="ty-rise" style={{ animationDelay: '0.62s', marginTop: 26, fontSize: 13, color: '#94A3B8' }}>
          Know another family who'd love this? Tell them to grab a founding-family spot before all 1,000 are gone.
        </p>
      </div>
    </div>
  )
}

export default function ThankYouContent() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fff' }} />}>
      <ThankYouInner />
    </Suspense>
  )
}
