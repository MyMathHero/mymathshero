import { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Animated,
  Easing, Platform,
} from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'

interface Props {
  onFinish: () => void
}

export default function SplashAnimation({ onFinish }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.7)).current
  const taglineOpacity = useRef(new Animated.Value(0)).current
  const robotOpacity = useRef(new Animated.Value(0)).current
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

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
      // Robot fades in
      Animated.timing(robotOpacity, {
        toValue: 1, duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      // Logo + scale spring
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
      // Tagline
      Animated.timing(taglineOpacity, {
        toValue: 1, duration: 400,
        useNativeDriver: true,
      }),
      // Gold dots staggered
      Animated.stagger(120, [
        Animated.spring(dot1, { toValue: 1, useNativeDriver: true }),
        Animated.spring(dot2, { toValue: 1, useNativeDriver: true }),
        Animated.spring(dot3, { toValue: 1, useNativeDriver: true }),
      ]),
      // Hold
      Animated.delay(1200),
      // Fade everything out
      Animated.timing(containerOpacity, {
        toValue: 0, duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Background glow accents */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* Robot — navy circle container hides the video's white edges so the
          robot appears in a clean spotlight rather than a white rectangle. */}
      <Animated.View style={[styles.robotWrapper, { opacity: robotOpacity }]}>
        <VideoView
          player={player}
          style={styles.robotVideo}
          contentFit="contain"
          nativeControls={false}
        />
      </Animated.View>

      {/* Logo */}
      <Animated.View style={[styles.logoBox, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        <Text style={styles.logoText}>
          MyMaths<Text style={styles.gold}>Hero</Text>
        </Text>
        <View style={styles.goldUnderline} />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Personalised AI Maths Learning
      </Animated.Text>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, {
            opacity: dot,
            transform: [{
              scale: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            }],
          }]} />
        ))}
      </View>

      {/* Bottom-pinned subtitle */}
      <Animated.Text style={[styles.bottomText, { opacity: taglineOpacity }]}>
        🇦🇺 Made for Australian students
      </Animated.Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    width: 400, height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(196,154,26,0.06)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    width: 300, height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(196,154,26,0.04)',
  },
  // Navy circular container masks the video's baked-in white background.
  robotWrapper: {
    width: 240,
    height: 240,
    backgroundColor: '#1B2B4B',
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  robotVideo: { width: 240, height: 240 },
  logoBox: { alignItems: 'center', marginBottom: 10 },
  logoText: {
    fontSize: 38, fontWeight: '800',
    color: 'white', letterSpacing: -0.5,
  },
  gold: { color: '#C49A1A' },
  goldUnderline: {
    width: 70, height: 3,
    backgroundColor: '#C49A1A',
    borderRadius: 2, marginTop: 8,
  },
  tagline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14, letterSpacing: 0.4, marginBottom: 28,
  },
  dotsRow: { flexDirection: 'row', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C49A1A' },
  bottomText: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 52 : 32,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
})
