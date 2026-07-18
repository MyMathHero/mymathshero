'use client'

import { useEffect, useRef } from 'react'

// ── ScrubReveal ─────────────────────────────────────────────────────────────
// A heading (or any text) that "paints in" as it scrolls through a short band
// of the viewport: a soft left→right mask sweeps across, revealing the text
// tied to scroll position — then it's done. No pinning, no added scroll
// distance, so it's safe on EVERY section heading across the site.
//
//   <ScrubReveal as="h2" className="cs-h2">
//     Confidence starts when <span style={{color:'#2563EB'}}>maths</span> makes sense.
//   </ScrubReveal>
//
// Uses a CSS mask (not a text-colour clip), so coloured child spans keep their
// own colours and still reveal. Falls back to fully-visible text when
// prefers-reduced-motion is set or before JS runs (mask defaults to shown).

export default function ScrubReveal({
  as: Tag = 'span',
  children,
  className = '',
  style,
  // Scroll band (fractions of viewport height): reveal starts when the element's
  // top passes `start` and completes by `end`. Defaults = subtle & quick.
  start = 0.82,
  end = 0.42,
  ...rest
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--scrub-p', '1')
      return
    }
    // Start hidden only once JS is confirmed running, so no-JS shows full text.
    el.dataset.armed = '1'
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const band = Math.max(1, innerHeight * (start - end))
      const p = Math.min(1, Math.max(0, (innerHeight * start - r.top) / band))
      el.style.setProperty('--scrub-p', p.toFixed(3))
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
  }, [start, end])

  return (
    <Tag ref={ref} className={`mmh-scrub ${className}`} style={style} {...rest}>
      {children}
      <style jsx>{`
        .mmh-scrub {
          --scrub-p: 1; /* default shown (no-JS / pre-arm) */
        }
        /* Once JS arms it, apply the sweeping mask driven by --scrub-p. The soft
           edge (a ~14% feather) makes the reveal read as a paint, not a hard wipe. */
        .mmh-scrub[data-armed='1'] {
          -webkit-mask-image: linear-gradient(
            90deg,
            #000 0,
            #000 calc(var(--scrub-p) * 118% - 18%),
            transparent calc(var(--scrub-p) * 118% - 4%),
            transparent 100%
          );
          mask-image: linear-gradient(
            90deg,
            #000 0,
            #000 calc(var(--scrub-p) * 118% - 18%),
            transparent calc(var(--scrub-p) * 118% - 4%),
            transparent 100%
          );
          transition: -webkit-mask-position 0.08s linear, mask-position 0.08s linear;
        }
      `}</style>
    </Tag>
  )
}
