'use client'

import { useEffect, useRef, useState } from 'react'

// ── WordSwap ────────────────────────────────────────────────────────────────
// A short pinned moment: the surrounding frame sticks to the viewport while one
// key word cycles through a list as you scroll, with progress dots. Releases
// quickly (default track ≈ 1.7 screens) to honour "don't scroll a lot".
//
//   <WordSwap
//     prefix={<>Hero helps every child<br/></>}
//     words={[
//       { text: 'understand.', color: '#2563EB' },
//       { text: 'improve.',    color: '#C49A1A' },
//       { text: 'thrive.',     color: '#16A34A' },
//     ]}
//     eyebrow="Meet Hero"
//     headingClassName="cs-h2"
//   />
//
// On phones (≤820px) or reduced-motion it collapses to a static heading showing
// just the first word — no pin, no cycling.

export default function WordSwap({
  prefix,
  words = [],
  eyebrow,
  headingClassName = '',
  className = '',
  // Track height as a multiple of the viewport. Bigger = slower cycle / more
  // scroll. 1.7 is a tight, quick-release default.
  trackVh = 170,
}) {
  const trackRef = useRef(null)
  const [idx, setIdx] = useState(0)
  const [pinned, setPinned] = useState(true) // false → static fallback

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const check = () => setPinned(!reduce && window.innerWidth > 820)
    check()

    let raf = 0
    const update = () => {
      raf = 0
      if (reduce || window.innerWidth <= 820) { setIdx(0); return }
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      if (total <= 0) return
      const p = Math.min(1, Math.max(0, -r.top / total))
      setIdx(Math.min(words.length - 1, Math.floor(p * words.length * 0.999)))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', () => { check(); onScroll() })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [words.length])

  return (
    <div
      ref={trackRef}
      className={`mmh-ws ${className}`}
      style={{ height: pinned ? `${trackVh}vh` : 'auto', position: 'relative' }}
    >
      <div className="mmh-ws-pin" data-pinned={pinned ? '1' : '0'}>
        <div className="mmh-ws-frame">
          {eyebrow && <div className="mmh-ws-eyebrow">{eyebrow}</div>}
          <div className={`mmh-ws-h ${headingClassName}`}>
            {prefix}
            <span className="mmh-ws-rot" aria-label={words.map((w) => w.text).join(' ')}>
              {words.map((w, i) => (
                <span
                  key={w.text}
                  className={i === idx ? 'on' : ''}
                  style={{ color: w.color }}
                  aria-hidden={i !== idx}
                >
                  {w.text}
                </span>
              ))}
            </span>
          </div>
          {pinned && words.length > 1 && (
            <div className="mmh-ws-dots" aria-hidden>
              {words.map((w, i) => (
                <i key={w.text} className={i === idx ? 'on' : ''} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .mmh-ws-pin { display: grid; place-items: center; text-align: center; }
        .mmh-ws-pin[data-pinned='1'] { position: sticky; top: 0; height: 100vh; }
        .mmh-ws-pin[data-pinned='0'] { padding: 80px 0; }
        .mmh-ws-frame { max-width: 900px; padding: 0 24px; }
        .mmh-ws-eyebrow {
          display: inline-block; font-size: 12px; font-weight: 800; letter-spacing: 0.16em;
          text-transform: uppercase; color: #C49A1A; margin-bottom: 18px;
        }
        .mmh-ws-rot { position: relative; display: inline-grid; }
        .mmh-ws-rot > span {
          grid-area: 1 / 1; opacity: 0; transform: translateY(0.42em);
          transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .mmh-ws-rot > span.on { opacity: 1; transform: none; }
        /* Static fallback (not pinned): only the first word is shown, in flow. */
        .mmh-ws-pin[data-pinned='0'] .mmh-ws-rot { display: inline; }
        .mmh-ws-pin[data-pinned='0'] .mmh-ws-rot > span { position: static; opacity: 0; transform: none; }
        .mmh-ws-pin[data-pinned='0'] .mmh-ws-rot > span.on { opacity: 1; display: inline; }
        .mmh-ws-pin[data-pinned='0'] .mmh-ws-rot > span:not(.on) { display: none; }
        .mmh-ws-dots { display: flex; gap: 8px; justify-content: center; margin-top: 30px; }
        .mmh-ws-dots i {
          width: 8px; height: 8px; border-radius: 99px; background: rgba(27, 43, 75, 0.14);
          transition: 0.3s; transform: scale(1);
        }
        .mmh-ws-dots i.on { background: #2563EB; transform: scale(1.35); }
      `}</style>
    </div>
  )
}
