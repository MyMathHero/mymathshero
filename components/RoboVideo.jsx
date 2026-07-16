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
  // Wrap the video in a white rounded "card" so its white background reads as a
  // deliberate framed portrait instead of a messy blend. Use this on GRADIENT /
  // non-solid-white surfaces where mixBlendMode:multiply leaves a dirty box
  // (mirrors the mobile HeroRobot containerStyle="card"). When card=true the
  // blend mode is dropped — the card IS the background, so no keying is needed.
  card = false,
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

  const video = (
    <video
      ref={videoRef}
      src={src}
      autoPlay={autoPlay}
      loop={loop}
      muted
      playsInline
      onEnded={onEnded}
      style={{
        // Inside a white card the video sits on its own white background, so no
        // blend is needed (and multiply over the card would darken edges).
        mixBlendMode: card ? 'normal' : effectiveBlend,
        width,
        height: 'auto',
        display: 'block',
      }}
      className={className}
    />
  )

  if (!card) return video

  // White rounded card — turns the video's white background into a clean framed
  // portrait on gradient/light surfaces. Matches mobile HeroRobot "card".
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 20,
        border: '2px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: 8,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {video}
    </div>
  )
}
