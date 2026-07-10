import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native'
import Svg, {
  Defs, LinearGradient as SvgGrad, Stop, Rect, Line,
  Text as SvgText, TSpan, Image as SvgImage, ClipPath, G,
} from 'react-native-svg'

// The MyMathsHero Arcade Card (React Native) — drawn with react-native-svg so
// every element sits at exact coordinates in fixed regions (text vs. robot),
// making overlap impossible. FRONT = name + play time + Hero. TAP flips to the
// BACK = the student's ID. Exposes shimmer()/launch()/reset(). No new dependency
// (react-native-svg is already installed).
const GOLD = '#C9A227', GOLD_HI = '#F2CE4B', INK = '#EAF1FF', SUB = '#93A6C8', DIM = '#6C7F9E'
const CW = 340, CH = 214
const ROBOT = require('../assets/Heropeekingfromdown.png')
const LOGO = require('../assets/arcadelogo.png')

export type ArcadeCardHandle = {
  shimmer: () => void
  launch: () => Promise<void>
  reset: () => void
}
type Props = {
  minutes?: number; plan?: string; cardNumber?: string; compact?: boolean
  studentName?: string; memberSince?: string | null
}

// One reusable card frame (background + circuit lines + border) as SVG defs.
function Frame() {
  return (
    <>
      <Defs>
        <SvgGrad id="cardbg" x1="0" y1="0" x2={String(CW)} y2={String(CH)} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#1b3059" /><Stop offset="0.8" stopColor="#0c1a35" />
        </SvgGrad>
        <SvgGrad id="chip" x1="0" y1="0" x2="34" y2="26" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#f6e2a0" /><Stop offset="0.55" stopColor="#E6C35A" /><Stop offset="1" stopColor="#b28a2b" />
        </SvgGrad>
        <ClipPath id="card"><Rect x="0" y="0" width={CW} height={CH} rx="20" /></ClipPath>
      </Defs>
      <Rect x="0" y="0" width={CW} height={CH} rx="20" fill="url(#cardbg)" />
      <G clipPath="url(#card)">
        {[[214, 0, 340, 66], [256, 0, 340, 118], [186, 214, 340, 122], [236, 214, 340, 172]].map(([a, b, d, e], i) => (
          <Line key={i} x1={a} y1={b} x2={d} y2={e} stroke="rgba(201,162,39,0.20)" strokeWidth="1" />
        ))}
      </G>
      <Rect x="0.5" y="0.5" width={CW - 1} height={CH - 1} rx="20" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
    </>
  )
}

const ArcadeCard = forwardRef<ArcadeCardHandle, Props>(function ArcadeCard(
  {
    minutes = 0, plan = 'standard', cardNumber = '2500 7250 1025 8888',
    studentName = 'Hero', memberSince = null, compact = false,
  },
  ref
) {
  const flip = useRef(new Animated.Value(0)).current   // 0 = front, 1 = ID back
  const shine = useRef(new Animated.Value(0)).current
  const [flipped, setFlipped] = useState(false)
  const [launching, setLaunching] = useState(false)

  useImperativeHandle(ref, () => ({
    shimmer() {
      shine.setValue(0)
      Animated.timing(shine, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start()
    },
    launch() { return new Promise<void>((res) => { setLaunching(true); setTimeout(() => res(), 700) }) },
    reset() { setLaunching(false) },
  }))

  function toggleFlip() {
    const to = flipped ? 0 : 1
    setFlipped(!flipped)
    Animated.timing(flip, { toValue: to, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start()
  }

  const scale = (compact ? 300 : 330) / CW
  const W = CW * scale, H = CH * scale

  const frontRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })
  const frontOpacity = flip.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] })
  const backOpacity = flip.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [0, 0, 1, 1] })
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-CW * 0.4, CW * 0.4] })
  const shineOp = shine.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 0.85, 0] })

  const faceStyle = { position: 'absolute' as const, top: 0, left: 0, width: W, height: H }
  const svgProps = { width: W, height: H, viewBox: `0 0 ${CW} ${CH}` }
  const planT = plan === 'premium' ? '★ PREMIUM' : 'PLAYER'
  const num = String(cardNumber)

  return (
    <Pressable onPress={toggleFlip} style={{ width: W, height: H }}>
      {/* FRONT */}
      <Animated.View style={[faceStyle, { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontRot }] }]}>
        <Svg {...svgProps}>
          <Frame />
          {/* robot in a clipped bottom-right zone; text is to its left. No
              floating coin — the robot wears the gold "H" on his chest already. */}
          <G clipPath="url(#card)">
            <SvgImage href={ROBOT} x={206} y={CH - 150} width={140} height={158} preserveAspectRatio="xMidYMax meet" />
          </G>
          {/* wordmark */}
          <SvgText x={18} y={34} fontSize="19" fontWeight="800" fontStyle="italic">
            <TSpan fill={INK}>mymaths</TSpan><TSpan fill={GOLD}>hero</TSpan>
            <TSpan fill={SUB} fontSize="9" dy="-7">™</TSpan>
          </SvgText>
          {/* logo top-right — bigger */}
          <SvgImage href={LOGO} x={CW - 16 - 44} y={8} width={44} height={44} preserveAspectRatio="xMidYMid meet" />
          {/* play time */}
          <SvgText x={18} y={74} fontSize="10" fontWeight="800" letterSpacing="3" fill={SUB}>PLAY TIME</SvgText>
          <SvgText x={18} y={116} fontWeight="900">
            <TSpan fontSize="46" fill={INK}>{Math.max(0, minutes)}</TSpan>
            <TSpan fontSize="16" fill={GOLD} dx="8">min</TSpan>
          </SvgText>
          {/* cardholder */}
          <SvgText x={18} y={146} fontSize="8" fontWeight="800" letterSpacing="2" fill={SUB}>CARDHOLDER</SvgText>
          <SvgText x={18} y={164} fontSize="15" fontWeight="800" fill={INK}>{ellip(studentName, 20)}</SvgText>
          {/* bottom band */}
          <Line x1={0} y1={CH - 52} x2={CW} y2={CH - 52} stroke="rgba(201,162,39,0.20)" strokeWidth="1" />
          <Rect x={18} y={CH - 39} width={34} height={26} rx={5} fill="url(#chip)" />
          <Line x1={21} y1={CH - 26} x2={49} y2={CH - 26} stroke="rgba(110,84,18,0.5)" strokeWidth="1" />
          <Line x1={35} y1={CH - 35} x2={35} y2={CH - 17} stroke="rgba(110,84,18,0.5)" strokeWidth="1" />
          <SvgText x={CW - 18} y={CH - 22} fontSize="11" fontWeight="800" letterSpacing="2" fill={GOLD} textAnchor="end">{planT}</SvgText>
        </Svg>
        {/* shimmer sweep */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, width: 80, left: '35%', opacity: shineOp, transform: [{ translateX: shineX }, { rotate: '12deg' }], backgroundColor: 'rgba(242,206,75,0.5)' }} />
      </Animated.View>

      {/* BACK (ID) */}
      <Animated.View style={[faceStyle, { opacity: backOpacity, transform: [{ perspective: 1000 }, { rotateY: backRot }] }]}>
        <Svg {...svgProps}>
          <Frame />
          <Rect x={0} y={16} width={CW} height={36} fill="#0a1424" />
          <SvgText x={18} y={74} fontSize="9" fontWeight="800" letterSpacing="2.5" fill={SUB}>HERO ARCADE ID</SvgText>
          {!!memberSince && <SvgText x={CW - 18} y={74} fontSize="8.5" fontWeight="700" fill={DIM} textAnchor="end">MEMBER SINCE {memberSince}</SvgText>}
          <SvgText x={18} y={104} fontSize="21" fontWeight="600" letterSpacing="3" fill={INK} fontFamily="Courier">{num}</SvgText>
          <SvgText x={18} y={126} fontSize="15" fontWeight="800" fill={GOLD}>{ellip(studentName, 26)}</SvgText>
          <SvgText x={18} y={CH - 22} fontSize="10" fontWeight="700" fill={SUB}>🎮 PLAY    🏆 REWARDS    ⭐ LEVEL UP</SvgText>
        </Svg>
      </Animated.View>

      {/* LAUNCH overlay */}
      {launching && (
        <View style={[faceStyle, s.launch]}>
          <Text style={s.launchBig}>Loading…</Text>
          <Text style={s.launchSub}>Your time starts when it loads ⏱️</Text>
        </View>
      )}
    </Pressable>
  )
})

function ellip(t: string, max: number) { const s = String(t || ''); return s.length > max ? s.slice(0, max - 1) + '…' : s }

const s = StyleSheet.create({
  launch: { borderRadius: 20, backgroundColor: '#0b1732', alignItems: 'center', justifyContent: 'center' },
  launchBig: { fontSize: 22, fontWeight: '900', color: INK },
  launchSub: { fontSize: 12, color: SUB, marginTop: 4 },
})

export default ArcadeCard
