'use client'
import { useEffect, useRef, useState } from 'react'

export default function RoboVideo({
  src,
  className = '',
  autoPlay = true,
  loop = false,
  width = 200,
  onEnded = null,
  // The robot videos have a near-WHITE background. On LIGHT surfaces 'multiply'
  // blends that white away. On a DARK surface 'multiply' multiplies the robot
  // toward black → it disappears; use 'screen' there (drops the dark, keeps the
  // bright robot). Callers on dark headers should pass blend="screen".
  blend = 'multiply',
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
        mixBlendMode: blend,
        width,
        height: 'auto',
      }}
      className={className}
    />
  )
}
