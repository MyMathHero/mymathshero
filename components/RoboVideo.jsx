'use client'
import { useEffect, useRef, useState } from 'react'

export default function RoboVideo({
  src,
  className = '',
  autoPlay = true,
  loop = false,
  width = 200,
  onEnded = null,
}) {
  const videoRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [mounted, src])

  if (!mounted) return null

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay={autoPlay}
      loop={loop}
      muted
      playsInline
      onEnded={onEnded}
      style={{
        mixBlendMode: 'multiply',
        width,
        height: 'auto',
      }}
      className={className}
    />
  )
}
