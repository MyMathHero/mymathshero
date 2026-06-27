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
  // toward black → it disappears; 'screen' drops the dark instead.
  //   blend="multiply" (default) — light surfaces
  //   blend="screen"             — always-dark surfaces (e.g. navy headers)
  //   blend="auto"               — follow the active theme (multiply light / screen dark)
  blend = 'multiply',
}) {
  const videoRef = useRef(null)
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (blend !== 'auto') return
    const read = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [blend])

  useEffect(() => {
    if (mounted && videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [mounted, src])

  if (!mounted) return null

  const effectiveBlend = blend === 'auto' ? (isDark ? 'screen' : 'multiply') : blend

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
        mixBlendMode: effectiveBlend,
        width,
        height: 'auto',
      }}
      className={className}
    />
  )
}
