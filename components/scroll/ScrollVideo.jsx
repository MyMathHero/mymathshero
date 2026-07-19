'use client'

import { useEffect, useRef, useState } from 'react'

// ── ScrollVideo ──────────────────────────────────────────────────────────────
// A marketing video that plays ONLY while it's in view — starts when the user
// scrolls to it, pauses when it scrolls away (saves battery/data and makes the
// reveal feel intentional). Muted + playsInline so autoplay is allowed on all
// browsers. A subtle fade/rise-in on first reveal. Poster shows before load.
//
//   <ScrollVideo src="/assets/robot/meetherovideo.MP4" />

export default function ScrollVideo({
  src,
  poster,
  className = '',
  rounded = 24,
  loop = true,
  maxWidth = 860,
  ...rest
}) {
  const wrapRef = useRef(null)
  const videoRef = useRef(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const video = videoRef.current
    if (!wrap || !video) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          if (!reduce) video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.4 }
    )
    io.observe(wrap)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        maxWidth, width: '100%', margin: '0 auto',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'none' : 'translateY(28px)',
        transition: 'opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop={loop}
        playsInline
        preload="metadata"
        style={{
          width: '100%', height: 'auto', display: 'block',
          borderRadius: rounded,
          boxShadow: '0 30px 70px rgba(27,43,75,0.22)',
          background: '#000',
        }}
        {...rest}
      />
    </div>
  )
}
