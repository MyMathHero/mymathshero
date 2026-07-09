'use client'
import { useEffect, useRef, useState } from 'react'

// A Hero video that "talks" in sync with the TTS: it PLAYS while `speaking` is
// true (the voice is talking) and FREEZES on a frame when silent. This is the
// "stop and talk back again" behaviour — the animation restarts each time Hero
// starts a new spoken line, so it reads as Hero speaking without needing real
// lip-sync (impossible for a canned clip + dynamic words).
//
// `blend`: the source videos have a white/near-white background; on a WHITE
// surface use 'multiply' (drops the white) — this is what makes the robot sit on
// the white "Your question" card with no visible box.
export default function HeroVideo({
  src, speaking, size = 200, blend = 'none', objectFit = 'cover', scale = 1,
}) {
  const ref = useRef(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (speaking) {
      // Restart from the top so each new spoken line begins the animation.
      try { v.currentTime = 0 } catch {}
      v.play().catch(() => {})
    } else {
      try { v.pause() } catch {}
    }
  }, [speaking, mounted])

  if (!mounted) return null

  return (
    <video
      ref={ref}
      src={src}
      muted loop playsInline preload="auto"
      style={{
        width: size, height: size,
        objectFit,
        transform: `scale(${scale})`,
        mixBlendMode: blend === 'none' ? undefined : blend,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
