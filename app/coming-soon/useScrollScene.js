'use client'

import { useEffect, useRef, useState } from 'react'

// ── Scroll-driven animation helpers (no external libraries; CSP-safe) ────────

// Returns a ref + a 0→1 progress value for how far a tall "pinned" section has
// scrolled through the viewport. Used to drive apple.com-style transforms on a
// sticky child while the section scrolls past.
//   0   → the section's top just reached the top of the viewport
//   1   → we've scrolled one section-height further (its bottom reaches top)
// prefers-reduced-motion → progress snaps to a mid value so content is simply shown.
export function useScrollProgress() {
  const ref = useRef(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setProgress(0.5)
      return
    }
    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      if (total <= 0) { setProgress(rect.top <= 0 ? 1 : 0); return }
      // How far the top has scrolled past 0, normalised to the scrollable range.
      const p = Math.min(1, Math.max(0, -rect.top / total))
      setProgress(p)
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
  }, [])

  return [ref, progress]
}

// Fires `visible=true` once the element enters the viewport (for reveal-on-scroll).
// Stays true afterwards so content doesn't flicker when scrolling back.
export function useInView(options = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px', ...options }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// Small helpers.
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
// Map t in [a,b] → [0,1], clamped. Great for phasing sub-animations inside a scene.
export const range = (t, a, b) => clamp((t - a) / (b - a))
export const lerp = (a, b, t) => a + (b - a) * t
