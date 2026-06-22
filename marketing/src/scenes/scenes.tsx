import React from 'react'
import { AbsoluteFill, Video, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { NAVY, GOLD, OFFWHITE, WHITE, FONT } from '../theme'
import { Caption, FadeUp, ScreenFrame } from '../components'

// Layout passed to each scene so one component renders all aspect ratios.
export interface Layout {
  vertical: boolean
  screenW: number
  screenH: number
}

// The robot clips have a WHITE background. `mixBlendMode: 'multiply'` makes
// white transparent — but only over a LIGHT surface (same trick the app uses in
// components/RoboVideo.jsx, where the robot sits on white cards). So on dark
// scenes we place the clip on a soft light "badge" circle: white × light = the
// light shows through, the robot stays crisp, and it reads as an on-brand avatar.
const RobotClip: React.FC<{ src: string; size: number; badge?: boolean }> = ({ src, size, badge = true }) => (
  <div style={{
    position: 'relative', width: size, height: size,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%',
    // Light radial badge so multiply has something light to drop white into.
    background: badge ? 'radial-gradient(circle at 50% 45%, #ffffff 0%, #eef2f8 60%, #e2e8f0 100%)' : 'transparent',
    boxShadow: badge ? '0 24px 60px rgba(0,0,0,0.35)' : 'none',
    overflow: 'hidden',
  }}>
    <Video src={staticFile(src)} loop muted style={{
      width: '92%', height: '92%', objectFit: 'contain',
      mixBlendMode: 'multiply',
    }} />
  </div>
)

// A looping robot clip, centred in the scene.
const Robot: React.FC<{ src: string; size: number; top?: string; badge?: boolean }> = ({ src, size, top = '38%', badge = true }) => (
  <div style={{ position: 'absolute', left: '50%', top, transform: 'translate(-50%,-50%)' }}>
    <RobotClip src={src} size={size} badge={badge} />
  </div>
)

// 1. HOOK — robot waves, brand reveal.
export const Hook: React.FC<{ layout: Layout }> = ({ layout }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const logoIn = spring({ frame: frame - 12, fps, config: { damping: 14 } })
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, #24395f, ${NAVY})` }}>
      <Robot src="robot/wavingrobo.mp4" size={layout.vertical ? 620 : 520} top="36%" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: layout.vertical ? '60%' : '64%', textAlign: 'center', fontFamily: FONT }}>
        <div style={{ transform: `scale(${interpolate(logoIn, [0, 1], [0.7, 1])})`, opacity: logoIn }}>
          <Img src={staticFile('logos/logo-full.png')} style={{ width: layout.vertical ? 460 : 380 }} />
        </div>
      </div>
      <Caption text="Maths homework, minus the tears." delay={20} vertical={layout.vertical} />
    </AbsoluteFill>
  )
}

// 2. PROBLEM — every kid learns differently.
export const Problem: React.FC<{ layout: Layout }> = ({ layout }) => (
  <AbsoluteFill style={{ background: NAVY }}>
    <FloatingNumbers />
    <div style={{ position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%,-50%)' }}>
      <FadeUp><Img src={staticFile('robot/HeroSad.png')} style={{ width: layout.vertical ? 380 : 320 }} /></FadeUp>
    </div>
    <Caption text="Every kid learns differently." sub="One-size-fits-all doesn't work." vertical={layout.vertical} delay={6} />
  </AbsoluteFill>
)

// 3. DIAGNOSTIC — finds their level fast.
export const Diagnostic: React.FC<{ layout: Layout }> = ({ layout }) => (
  <AbsoluteFill style={{ background: OFFWHITE }}>
    <ScreenFrame label="Diagnostic placement" width={layout.screenW} height={layout.screenH} src="screens/diagnostic.mp4" />
    <Caption text="Hero finds their exact level" sub="in about 3 minutes." color={NAVY} vertical={layout.vertical} delay={10} />
  </AbsoluteFill>
)

// 4. ASK HERO — patient AI tutor.
export const AskHero: React.FC<{ layout: Layout }> = ({ layout }) => (
  <AbsoluteFill style={{ background: `linear-gradient(160deg, #1f3052, ${NAVY})` }}>
    <ScreenFrame label="Ask Hero — step-by-step help" width={layout.screenW} height={layout.screenH} src="screens/askhero.mp4" />
    <div style={{ position: 'absolute', right: layout.vertical ? '8%' : '14%', top: layout.vertical ? '20%' : '24%' }}>
      <FadeUp delay={8}><RobotClip src="robot/thinking.mp4" size={layout.vertical ? 220 : 200} /></FadeUp>
    </div>
    <Caption text="A patient AI tutor" sub="that guides — never just gives the answer." vertical={layout.vertical} delay={12} />
  </AbsoluteFill>
)

// 5. DELIGHT — arcade, badges, avatars.
export const Delight: React.FC<{ layout: Layout }> = ({ layout }) => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #2a4068, ${NAVY})` }}>
    <Robot src="robot/happyjumping.mp4" size={layout.vertical ? 560 : 460} top="40%" />
    <EmojiBurst />
    <Caption text="Practice that feels like play" sub="🎮 Arcade · 🏅 Badges · 🔥 Streaks" vertical={layout.vertical} delay={8} />
  </AbsoluteFill>
)

// 6. PARENT TRUST — real progress + free month.
export const ParentTrust: React.FC<{ layout: Layout }> = ({ layout }) => (
  <AbsoluteFill style={{ background: OFFWHITE }}>
    <ScreenFrame label="Parent dashboard" width={layout.screenW} height={layout.screenH} src="screens/parent.mp4" />
    <Caption text="Parents see real progress" sub="✨ Free first month" color={NAVY} vertical={layout.vertical} delay={10} />
  </AbsoluteFill>
)

// 7. CTA — logo + url + badges.
export const CTA: React.FC<{ layout: Layout }> = ({ layout }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame, fps, config: { damping: 16 } })
  return (
    <AbsoluteFill style={{ background: NAVY, alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`, opacity: s, textAlign: 'center' }}>
        <Img src={staticFile('logos/logo-full.png')} style={{ width: layout.vertical ? 520 : 440 }} />
        <div style={{ color: GOLD, fontWeight: 900, fontSize: layout.vertical ? 56 : 48, marginTop: 30 }}>mymathshero.com.au</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: layout.vertical ? 32 : 28, marginTop: 18 }}>
          Australian Curriculum · Prep–Year 6
        </div>
        <div style={{ color: WHITE, fontWeight: 800, fontSize: layout.vertical ? 30 : 26, marginTop: 24, opacity: 0.9 }}>
          📱 App Store &nbsp;·&nbsp; Google Play
        </div>
      </div>
    </AbsoluteFill>
  )
}

// — decorative helpers —
const FloatingNumbers: React.FC = () => {
  const frame = useCurrentFrame()
  const items = ['7', '½', '12', '×', '3.5', '%', '9', '+', '8']
  return (
    <>
      {items.map((n, i) => {
        const seed = (i * 97) % 100
        const x = 8 + ((seed * 11) % 84)
        const y = 10 + ((seed * 7) % 70)
        const drift = Math.sin((frame + i * 20) / 30) * 14
        return (
          <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translateY(${drift}px)`, color: 'rgba(196,154,26,0.25)', fontWeight: 900, fontSize: 60, fontFamily: FONT }}>{n}</div>
        )
      })}
    </>
  )
}

const EmojiBurst: React.FC = () => {
  const frame = useCurrentFrame()
  const items = ['⭐', '🏅', '🎮', '🔥', '✨', '🎉']
  return (
    <>
      {items.map((e, i) => {
        const a = (i / items.length) * Math.PI * 2
        const r = interpolate(frame, [0, 30], [0, 260], { extrapolateRight: 'clamp' })
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', top: '40%', transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)`, fontSize: 54 }}>{e}</div>
        )
      })}
    </>
  )
}
