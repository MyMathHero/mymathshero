'use client'

import { useEffect, useRef } from 'react'

export default function AskHeroLauncher({ size = 92, alt = 'Ask Hero' }) {
  const videoRef = useRef(null)

  useEffect(() => {
    videoRef.current?.play?.().catch(() => {})
  }, [])

  // The launcher video has a solid navy background (MP4 can't store alpha), so
  // instead of trying to blend it away we clip it into a circular gold-ring
  // badge — the navy then reads as an intentional medallion backdrop.
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '3px solid #C49A1A',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        background: '#1B2B4B',
        pointerEvents: 'none',
      }}
    >
      <video
        ref={videoRef}
        src="/assets/robot/AskHeroChatBotVideo.MP4"
        autoPlay
        loop
        muted
        playsInline
        aria-label={alt}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
        }}
      />
    </div>
  )
}
