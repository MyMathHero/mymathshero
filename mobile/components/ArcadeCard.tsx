import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Line } from 'react-native-svg'

// The MyMathsHero Arcade Card (React Native) — the collectible play-time wallet.
// Dark theme only. Minutes live on the card. Exposes:
//   ref.shimmer()  → gold sweep + a pop on the minutes (after a top-up)
//   ref.launch()   → flip the card forward to launch a game (Promise, ~700ms)
//   ref.reset()    → flip back
const GOLD = '#C49A1A'
const GOLD_HI = '#FFD54A'

export type ArcadeCardHandle = {
  shimmer: () => void
  launch: () => Promise<void>
  reset: () => void
}

type Props = { minutes?: number; plan?: string; cardNumber?: string; compact?: boolean }

const ArcadeCard = forwardRef<ArcadeCardHandle, Props>(function ArcadeCard(
  { minutes = 0, plan = 'standard', cardNumber = '2500 7250 1025 8888', compact = false },
  ref
) {
  const flip = useRef(new Animated.Value(0)).current      // 0 = front, 1 = back
  const shine = useRef(new Animated.Value(0)).current     // shimmer sweep
  const pop = useRef(new Animated.Value(1)).current       // minutes pop
  const [flipped, setFlipped] = useState(false)

  useImperativeHandle(ref, () => ({
    shimmer() {
      shine.setValue(0)
      Animated.timing(shine, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start()
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.16, duration: 180, useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, useNativeDriver: true }),
      ]).start()
    },
    launch() {
      return new Promise<void>((res) => {
        setFlipped(true)
        Animated.timing(flip, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
          .start(() => res())
      })
    },
    reset() {
      Animated.timing(flip, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => setFlipped(false))
    },
  }))

  const W = compact ? 300 : 330
  const H = compact ? 189 : 208

  const frontRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-W * 0.4, W * 0.4] })
  const shineOpacity = shine.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] })

  return (
    <View style={{ width: W, height: H }}>
      {/* FRONT */}
      <Animated.View style={[s.face, { width: W, height: H, transform: [{ perspective: 1000 }, { rotateY: frontRot }], backfaceVisibility: 'hidden' }]}>
        <LinearGradient colors={['#12233f', '#0b1732']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* faceted lines */}
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Line x1={W * 0.62} y1={0} x2={W} y2={H * 0.33} stroke="rgba(196,154,26,0.2)" strokeWidth={1} />
          <Line x1={W * 0.74} y1={0} x2={W} y2={H * 0.56} stroke="rgba(196,154,26,0.2)" strokeWidth={1} />
          <Line x1={W * 0.53} y1={H} x2={W} y2={H * 0.56} stroke="rgba(196,154,26,0.2)" strokeWidth={1} />
        </Svg>

        {/* wordmark */}
        <Text style={s.wordmark}><Text style={s.wmItalic}>my</Text>maths<Text style={{ color: GOLD }}>hero</Text><Text style={s.tm}>™</Text></Text>
        <Text style={s.joystick}>🕹️</Text>

        {/* minutes on the card */}
        <View style={s.balance}>
          <Text style={s.balLab}>PLAY TIME</Text>
          <Animated.View style={{ flexDirection: 'row', alignItems: 'flex-end', transform: [{ scale: pop }] }}>
            <Text style={s.balVal}>{Math.max(0, minutes)}</Text>
            <Text style={s.balMin}> min</Text>
          </Animated.View>
        </View>

        {/* Hero + H coin (simple mark for RN) */}
        <View style={s.robo}>
          <Text style={s.roboFace}>🤖</Text>
          <View style={s.coin}><Text style={s.coinH}>H</Text></View>
        </View>

        {/* feature row */}
        <View style={s.feats}>
          <Text style={s.feat}>🎮 PLAY</Text><Text style={s.feat}>🏆 REWARDS</Text><Text style={s.feat}>⭐ LEVEL UP</Text>
        </View>

        {/* bottom band */}
        <View style={s.band}>
          <View style={s.chip} />
          <Text style={s.num}>{cardNumber}</Text>
          <Text style={s.premium}>{plan === 'premium' ? 'PREMIUM' : 'PLAYER'}</Text>
        </View>

        {/* shimmer */}
        <Animated.View pointerEvents="none" style={[s.shine, { opacity: shineOpacity, transform: [{ translateX: shineX }, { rotate: '12deg' }] }]}>
          <LinearGradient colors={['transparent', GOLD_HI, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      </Animated.View>

      {/* BACK (launch) */}
      {flipped && (
        <Animated.View style={[s.face, s.back, { width: W, height: H, transform: [{ perspective: 1000 }, { rotateY: backRot }], backfaceVisibility: 'hidden' }]}>
          <LinearGradient colors={['#0b1732', '#12233f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={s.launchBig}>Loading…</Text>
          <Text style={s.launchSub}>Your time starts when it loads ⏱️</Text>
        </Animated.View>
      )}
    </View>
  )
})

const s = StyleSheet.create({
  face: {
    position: 'absolute', top: 0, left: 0, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  back: { alignItems: 'center', justifyContent: 'center' },
  wordmark: { position: 'absolute', left: 16, top: 14, fontSize: 19, fontWeight: '800', fontStyle: 'italic', color: '#eef4ff' },
  wmItalic: { fontStyle: 'italic' },
  tm: { fontSize: 9, color: '#9fb3d6' },
  joystick: { position: 'absolute', right: 16, top: 13, fontSize: 22 },
  balance: { position: 'absolute', left: 16, top: 50 },
  balLab: { fontSize: 9, letterSpacing: 2, fontWeight: '800', color: '#9fb3d6' },
  balVal: { fontSize: 34, fontWeight: '900', color: '#eef4ff', lineHeight: 36 },
  balMin: { fontSize: 14, color: GOLD, fontWeight: '800', marginBottom: 4 },
  robo: { position: 'absolute', right: 22, top: 44, alignItems: 'center' },
  roboFace: { fontSize: 62 },
  coin: {
    position: 'absolute', left: -34, top: 14, width: 40, height: 40, borderRadius: 20,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: GOLD_HI,
  },
  coinH: { fontWeight: '900', color: '#7a5c12', fontSize: 20 },
  feats: { position: 'absolute', left: 16, bottom: 42, flexDirection: 'row', gap: 10 },
  feat: { fontSize: 9, fontWeight: '700', color: '#cdd9f2' },
  band: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(196,154,26,0.2)',
  },
  chip: { width: 32, height: 24, borderRadius: 5, backgroundColor: '#E6C35A' },
  num: { fontFamily: 'Courier', letterSpacing: 1.5, fontSize: 14, fontWeight: '700', color: '#eef4ff' },
  premium: { marginLeft: 'auto', fontSize: 10, letterSpacing: 1.5, fontWeight: '800', color: '#9fb3d6' },
  shine: { position: 'absolute', top: 0, bottom: 0, width: 90, left: '35%' },
  launchBig: { fontSize: 22, fontWeight: '900', color: '#eef4ff' },
  launchSub: { fontSize: 12, color: '#9fb3d6', marginTop: 4 },
})

export default ArcadeCard
