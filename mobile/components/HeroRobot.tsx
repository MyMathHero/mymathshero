import { useRef, useEffect } from 'react'
import { View, Animated, StyleSheet, Easing } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'

export type RobotMood = 'happy' | 'thinking' | 'sad' | 'waving' | 'celebrating'

interface Props {
  mood?: RobotMood
  size?: number
  style?: any
  // Container background. React Native has no mix-blend-mode, so the only way
  // to hide the baked-in white video background on light screens is to draw
  // a coloured container behind the video. Set to '#1B2B4B' (navy) on light
  // backgrounds; leave undefined when the parent screen is already navy.
  background?: string
  // Render the container as a circle (size/2 radius). Default rounded
  // rectangle (16px).
  rounded?: boolean
  // 'contain' keeps the full robot but may leave inner whitespace.
  // 'cover' fills the container but can crop the robot. Defaults to 'contain'.
  fillMode?: 'contain' | 'cover'
}

// Asset bundle map. Verified present in mobile/assets/:
//   HeroHappy.png, HeroSad.png, wavingrobo.mp4, thinkinggotidearobo.mp4,
//   happyjumpingrobo.mp4 (used for both "happy" video moments and "celebrating")
const ROBOT_SOURCES: Record<RobotMood, { type: 'video' | 'image', src: any }> = {
  happy:        { type: 'image', src: require('../assets/HeroHappy.png') },
  sad:          { type: 'image', src: require('../assets/HeroSad.png') },
  thinking:     { type: 'video', src: require('../assets/thinkinggotidearobo.mp4') },
  waving:       { type: 'video', src: require('../assets/wavingrobo.mp4') },
  celebrating:  { type: 'video', src: require('../assets/happyjumpingrobo.mp4') },
}

// Inner video-mode component. Remounted via `key={mood}` from the parent so
// useVideoPlayer always loads the freshly selected source instead of being
// stuck on whatever it loaded on first render.
function VideoRobot({
  source, size, fillMode,
}: {
  source: any; size: number; fillMode: 'contain' | 'cover'
}) {
  const player = useVideoPlayer(source, p => {
    p.loop = true
    p.muted = true
    p.play()
  })
  return (
    <VideoView
      player={player}
      style={{ width: size, height: size }}
      contentFit={fillMode}
      nativeControls={false}
    />
  )
}

// Inner image-mode component with a gentle bounce.
function ImageRobot({ source, size }: { source: any; size: number }) {
  const bounce = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -8, duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(bounce, {
          toValue: 0, duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [bounce])

  return (
    <Animated.Image
      source={source}
      style={[
        styles.image,
        { width: size, height: size, transform: [{ translateY: bounce }] },
      ]}
      resizeMode="contain"
    />
  )
}

export default function HeroRobot({
  mood = 'waving',
  size = 120,
  style,
  background,
  rounded = false,
  fillMode = 'contain',
}: Props) {
  const entry = ROBOT_SOURCES[mood] || ROBOT_SOURCES.waving

  const containerStyle = {
    width: size,
    height: size,
    backgroundColor: background || 'transparent',
    borderRadius: rounded ? size / 2 : 16,
    overflow: 'hidden' as const,
  }

  return (
    <View style={[containerStyle, style]}>
      {entry.type === 'video' ? (
        // The key forces a fresh useVideoPlayer instance each time the mood
        // switches between video sources — no manual replaceAsync needed.
        <VideoRobot key={mood} source={entry.src} size={size} fillMode={fillMode} />
      ) : (
        <ImageRobot source={entry.src} size={size} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  image: { resizeMode: 'contain' },
})
