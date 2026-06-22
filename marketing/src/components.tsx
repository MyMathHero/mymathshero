import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig, Video, staticFile } from 'remotion'
import { NAVY, GOLD, WHITE, FONT } from './theme'

// Flip to true once real screen recordings exist in public/screens/. Until then
// every ScreenFrame shows a labelled placeholder so the render never 404s.
export const HAS_SCREENS = false

// Fade/slide-up wrapper — the standard entrance used across scenes.
export const FadeUp: React.FC<{ children: React.ReactNode; delay?: number; style?: React.CSSProperties }> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } })
  const opacity = interpolate(s, [0, 1], [0, 1])
  const translateY = interpolate(s, [0, 1], [40, 0])
  return <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>{children}</div>
}

// Big caption block. `vertical` lifts it into the safe area for 9:16.
export const Caption: React.FC<{
  text: string; sub?: string; delay?: number; color?: string; vertical?: boolean
}> = ({ text, sub, delay = 0, color = WHITE, vertical = false }) => {
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0,
      bottom: vertical ? '18%' : '8%',
      padding: '0 8%',
      textAlign: 'center',
      fontFamily: FONT,
    }}>
      <FadeUp delay={delay}>
        <div style={{
          color, fontWeight: 900,
          fontSize: vertical ? 64 : 58,
          lineHeight: 1.1,
          textShadow: '0 4px 24px rgba(0,0,0,0.45)',
        }}>{text}</div>
        {sub && (
          <div style={{ color: GOLD, fontWeight: 800, fontSize: vertical ? 38 : 34, marginTop: 16, textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>{sub}</div>
        )}
      </FadeUp>
    </div>
  )
}

// A device-frame placeholder for a screen recording. Until a real capture is
// dropped into public/screens/<name>, it shows a labelled navy/gold mock so the
// timeline reads correctly. Swap by adding the file + flipping `hasReal`.
export const ScreenFrame: React.FC<{
  src?: string; label: string; width: number; height: number; delay?: number
}> = ({ src, label, width, height, delay = 0 }) => {
  const showReal = HAS_SCREENS && src
  return (
    <FadeUp delay={delay} style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)' }}>
      <div style={{
        width, height, borderRadius: 28, overflow: 'hidden',
        border: `6px solid ${GOLD}`, background: NAVY,
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {showReal ? (
          // Screen recordings are .mp4 — play them muted, cover the frame.
          <Video src={staticFile(src as string)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.55)', fontFamily: FONT, textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎬</div>
            <div style={{ fontWeight: 800, fontSize: 26 }}>{label}</div>
            <div style={{ fontSize: 16, marginTop: 8, opacity: 0.7 }}>screen recording goes here</div>
          </div>
        )}
      </div>
    </FadeUp>
  )
}
