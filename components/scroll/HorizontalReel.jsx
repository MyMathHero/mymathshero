'use client'

import { useEffect, useRef } from 'react'

// ── HorizontalReel ──────────────────────────────────────────────────────────
// A compact pinned section where vertical scroll drives a horizontal reel of
// cards sideways, with a progress bar. Releases quickly (default ≈ 2.3 screens).
//
//   <HorizontalReel
//     eyebrow="How it works"
//     heading={<>Four steps, one confident learner.</>}
//     items={[{ n:1, title, desc, color }, …]}
//   />
//
// On phones (≤820px) / reduced-motion it collapses to a normal vertical stack
// of cards — no pin, no horizontal motion.

export default function HorizontalReel({
  eyebrow,
  heading,
  items = [],
  trackVh = 230,
  className = '',
}) {
  const trackRef = useRef(null)
  const railRef = useRef(null)
  const progRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    const rail = railRef.current
    if (!track || !rail) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    const update = () => {
      raf = 0
      if (reduce || window.innerWidth <= 820) {
        rail.style.transform = ''
        return
      }
      const r = track.getBoundingClientRect()
      const total = r.height - window.innerHeight
      if (total <= 0) return
      const p = Math.min(1, Math.max(0, -r.top / total))
      const dist = rail.scrollWidth - window.innerWidth + window.innerWidth * 0.16
      rail.style.transform = `translateX(${-p * Math.max(0, dist)}px)`
      if (progRef.current) progRef.current.style.width = `${p * 100}%`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [items.length])

  return (
    <div ref={trackRef} className={`mmh-hz ${className}`} style={{ height: `${trackVh}vh`, position: 'relative' }}>
      <div className="mmh-hz-pin">
        {(eyebrow || heading) && (
          <div className="mmh-hz-head">
            {eyebrow && <div className="mmh-hz-eyebrow">{eyebrow}</div>}
            {heading && <h2 className="mmh-hz-heading">{heading}</h2>}
          </div>
        )}
        <div ref={railRef} className="mmh-hz-rail">
          {items.map((it, i) => (
            <div
              key={it.title || i}
              className="mmh-hz-card"
              style={{ background: it.gradient || `linear-gradient(160deg, ${it.color || '#1B2B4B'}, #0a1428)` }}
            >
              {/* Show a big number only when `n` is explicitly given (steps);
                  pass n:null to hide it (non-sequential pillars). */}
              {it.n != null && <span className="mmh-hz-big">{it.n}</span>}
              {it.emoji && <span className={`mmh-hz-emoji${it.n == null ? ' solo' : ''}`}>{it.emoji}</span>}
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
            </div>
          ))}
        </div>
        <div className="mmh-hz-prog"><i ref={progRef} /></div>
      </div>

      <style jsx>{`
        .mmh-hz { background: #1B2B4B; }
        .mmh-hz-pin { position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
        .mmh-hz-head { color: #fff; padding: 0 8vw 26px; }
        .mmh-hz-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #C49A1A; }
        .mmh-hz-heading { font-size: clamp(26px, 4vw, 46px); font-weight: 900; letter-spacing: -0.03em; margin-top: 10px; max-width: 16ch; line-height: 1.05; }
        .mmh-hz-rail { display: flex; gap: 22px; padding: 0 8vw; will-change: transform; }
        .mmh-hz-card {
          flex: 0 0 clamp(240px, 28vw, 360px); height: 46vh; border-radius: 22px; padding: 26px;
          color: #fff; display: flex; flex-direction: column; justify-content: flex-end;
          position: relative; overflow: hidden; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
        }
        .mmh-hz-big { position: absolute; top: 16px; left: 22px; font-size: 52px; font-weight: 900; opacity: 0.24; line-height: 1; }
        .mmh-hz-emoji { position: absolute; top: 20px; right: 24px; font-size: 30px; }
        /* When there's no number badge, the emoji becomes the card's lead icon. */
        .mmh-hz-emoji.solo { top: 22px; left: 24px; right: auto; font-size: 44px; }
        .mmh-hz-card h3 { font-size: clamp(20px, 2.2vw, 26px); font-weight: 900; letter-spacing: -0.02em; margin-bottom: 6px; }
        .mmh-hz-card p { font-size: 14px; line-height: 1.5; color: rgba(255, 255, 255, 0.86); }
        .mmh-hz-prog { margin: 22px 8vw 0; height: 3px; background: rgba(255, 255, 255, 0.18); border-radius: 99px; overflow: hidden; }
        .mmh-hz-prog i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #C49A1A, #fff); }

        @media (max-width: 820px) {
          .mmh-hz { height: auto !important; padding: 70px 0; }
          .mmh-hz-pin { position: static; height: auto; overflow: visible; }
          .mmh-hz-head { padding: 0 24px 24px; }
          .mmh-hz-rail { flex-direction: column; padding: 0 24px; transform: none !important; }
          .mmh-hz-card { flex: none; height: auto; min-height: 170px; }
          .mmh-hz-prog { display: none; }
        }
      `}</style>
    </div>
  )
}
