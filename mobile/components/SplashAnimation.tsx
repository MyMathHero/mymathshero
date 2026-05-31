import { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Animated,
  Easing, Dimensions,
} from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { theme } from '../lib/theme'

const { height } = Dimensions.get('window')

interface Props {
  onFinish: () => void
}

export default function SplashAnimation({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.7)).current
  const taglineOpacity = useRef(new Animated.Value(0)).current
  const robotOpacity = useRef(new Animated.Value(0)).current
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current
  const containerOpacity = useRef(new Animated.Value(1)).current

  const player = useVideoPlayer(
    require('../assets/wavingrobo.mp4'),
    p => {
      p.loop = true
      p.muted = true
      p.play()
    }
  )

  useEffect(() => {
    Animated.sequence([
      Animated.timing(robotOpacity, {
        toValue: 1, duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, tension: 60, friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1, duration: 400,
        useNativeDriver: true,
      }),
      Animated.stagger(150, [
        Animated.spring(dot1, { toValue: 1, useNativeDriver: true }),
        Animated.spring(dot2, { toValue: 1, useNativeDriver: true }),
        Animated.spring(dot3, { toValue: 1, useNativeDriver: true }),
      ]),
      Animated.delay(1000),
      Animated.timing(containerOpacity, {
        toValue: 0, duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View style={[sp.container, { opacity: containerOpacity }]}>
      <View style={sp.glow} />

      <Animated.View style={[sp.robotContainer, { opacity: robotOpacity }]}>
        <VideoView
          player={player}
          style={sp.robotVideo}
          contentFit="contain"
          nativeControls={false}
        />
      </Animated.View>

      <Animated.View style={[sp.logoBox, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        <Text style={sp.logoText}>
          MyMaths<Text style={sp.gold}>Hero</Text>
        </Text>
        <View style={sp.goldLine} />
      </Animated.View>

      <Animated.Text style={[sp.tagline, { opacity: taglineOpacity }]}>
        Personalised AI Maths Learning
      </Animated.Text>

      <View style={sp.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[sp.dot, {
            opacity: dot,
            transform: [{
              scale: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            }],
          }]} />
        ))}
      </View>

      <Animated.Text style={[sp.aussie, { opacity: taglineOpacity }]}>
        🇦🇺 Made for Australian students
      </Animated.Text>
    </Animated.View>
  )
}

const sp = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: theme.colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300, height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(196,154,26,0.08)',
    top: height * 0.15,
  },
  robotContainer: {
    width: 220, height: 220, marginBottom: 16,
    // Navy mask so the baked-in white video background blends into the splash.
    backgroundColor: theme.colors.navy,
    borderRadius: 20,
    overflow: 'hidden',
  },
  robotVideo: { width: '100%', height: '100%' },
  logoBox: { alignItems: 'center', marginBottom: 12 },
  logoText: {
    fontSize: 38, fontWeight: '800',
    color: 'white', letterSpacing: -0.5,
  },
  gold: { color: theme.colors.gold },
  goldLine: {
    width: 60, height: 3,
    backgroundColor: theme.colors.gold,
    borderRadius: 2, marginTop: 8,
  },
  tagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14, letterSpacing: 0.5, marginBottom: 32,
  },
  dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.gold },
  aussie: {
    position: 'absolute', bottom: 50,
    color: 'rgba(255,255,255,0.4)', fontSize: 12,
  },
})
