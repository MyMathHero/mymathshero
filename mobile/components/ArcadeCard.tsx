import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native'
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

        {/* BODY — clean flex stack so zones never overlap */}
        <View style={s.body}>
          {/* row 1: wordmark + joystick */}
          <View style={s.row1}>
            <Text style={s.wordmark}><Text style={s.wmItalic}>my</Text>maths<Text style={{ color: GOLD }}>hero</Text><Text style={s.tm}>™</Text></Text>
            <Text style={s.joystick}>🕹️</Text>
          </View>

          {/* mid: play-time (left) + Hero (right) */}
          <View style={s.mid}>
            <View>
              <Text style={s.balLab}>PLAY TIME</Text>
              <Animated.View style={{ flexDirection: 'row', alignItems: 'flex-end', transform: [{ scale: pop }] }}>
                <Text style={s.balVal}>{Math.max(0, minutes)}</Text>
                <Text style={s.balMin}> min</Text>
              </Animated.View>
            </View>
            <View style={s.robo}>
              <View style={s.coin}><Text style={s.coinH}>H</Text></View>
              <Image source={require('../assets/Heropeekingfromdown.png')} style={s.roboImg} resizeMode="contain" />
            </View>
          </View>

          {/* features — own row above the band */}
          <View style={s.feats}>
            <Text style={s.feat}>🎮 PLAY</Text><Text style={s.feat}>🏆 REWARDS</Text><Text style={s.feat}>⭐ LEVEL UP</Text>
          </View>
        </View>

        {/* BAND — fixed line, nothing wraps */}
        <View style={s.band}>
          <View style={s.chip} />
          <Text style={s.num} numberOfLines={1}>{cardNumber}</Text>
          <Text style={s.premium}>{plan === 'premium' ? 'PREMIUM\nACCESS' : 'PLAYER\nACCESS'}</Text>
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
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', flexDirection: 'column',
  },
  back: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 13, zIndex: 2 },
  row1: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  wordmark: { fontSize: 18, fontWeight: '800', fontStyle: 'italic', color: '#eef4ff' },
  wmItalic: { fontStyle: 'italic' },
  tm: { fontSize: 9, color: '#9fb3d6' },
  joystick: { fontSize: 22 },
  mid: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 },
  balLab: { fontSize: 10, letterSpacing: 3, fontWeight: '800', color: '#9fb3d6' },
  balVal: { fontSize: 36, fontWeight: '900', color: '#eef4ff', lineHeight: 38 },
  balMin: { fontSize: 14, color: GOLD, fontWeight: '800', marginBottom: 5 },
  robo: { width: 108, height: 92 },
  roboImg: { position: 'absolute', right: -4, bottom: -8, width: 110, height: 110 },
  coin: {
    position: 'absolute', left: -4, top: 4, width: 38, height: 38, borderRadius: 19,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: GOLD_HI, zIndex: 3,
  },
  coinH: { fontWeight: '900', color: '#7a5c12', fontSize: 20 },
  feats: { flexDirection: 'row', gap: 14, marginTop: 'auto', marginBottom: 8 },
  feat: { fontSize: 9, fontWeight: '700', color: '#cdd9f2' },
  band: {
    height: 50, flexShrink: 0, paddingHorizontal: 16, zIndex: 2,
    flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(196,154,26,0.22)',
  },
  chip: { width: 32, height: 24, borderRadius: 5, backgroundColor: '#E6C35A' },
  num: { fontFamily: 'Courier', letterSpacing: 1, fontSize: 13, fontWeight: '700', color: '#eef4ff', flexShrink: 1 },
  premium: { marginLeft: 'auto', fontSize: 8.5, lineHeight: 11, letterSpacing: 1, fontWeight: '800', color: '#9fb3d6', textAlign: 'right' },
  shine: { position: 'absolute', top: 0, bottom: 0, width: 90, left: '35%', zIndex: 4 },
  launchBig: { fontSize: 22, fontWeight: '900', color: '#eef4ff' },
  launchSub: { fontSize: 12, color: '#9fb3d6', marginTop: 4 },
})

export default ArcadeCard
