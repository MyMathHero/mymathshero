import { useRef, useEffect } from 'react'
import { View, Animated, Easing } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'

export type RobotMood = 'happy' | 'thinking' | 'sad' | 'waving' | 'celebrating'

interface Props {
  mood?: RobotMood
  size?: number
  style?: any
  // How the robot's white video background is handled:
  //   'circle' — white circle "spotlight" on navy backgrounds (e.g. dashboard
  //               header, login). The white video edges become part of the design.
  //   'card'   — white rounded card with subtle border on light backgrounds.
  //   'none'   — raw output (only safe on white backgrounds).
  containerStyle?: 'circle' | 'card' | 'none'
}

// Assets verified present in mobile/assets/:
//   HeroHappy.png, HeroSad.png, wavingrobo.mp4, thinkinggotidearobo.mp4,
//   happyjumpingrobo.mp4 (used for both "happy" video moments and "celebrating")
const VIDEO_ASSETS: Partial<Record<RobotMood, any>> = {
  waving:       require('../assets/wavingrobo.mp4'),
  celebrating:  require('../assets/happyjumpingrobo.mp4'),
  thinking:     require('../assets/thinkinggotidearobo.mp4'),
}

const IMAGE_ASSETS: Partial<Record<RobotMood, any>> = {
  happy: require('../assets/HeroHappy.png'),
  sad:   require('../assets/HeroSad.png'),
}

// Inner video component — remounted with key={mood} so useVideoPlayer always
// loads the freshly selected source instead of staying on first-render src.
function RobotVideo({ source, size }: { source: any; size: number }) {
  const player = useVideoPlayer(source, p => {
    p.loop = true
    p.muted = true
    p.play()
  })
  return (
    <VideoView
      player={player}
      style={{ width: size, height: size }}
      contentFit="contain"
      nativeControls={false}
    />
  )
}

// Inner image component with gentle bounce.
function RobotImage({ source, size }: { source: any; size: number }) {
  const bounce = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -6, duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(bounce, {
          toValue: 0, duration: 900,
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
      style={{
        width: size, height: size,
        transform: [{ translateY: bounce }],
      }}
      resizeMode="contain"
    />
  )
}

export default function HeroRobot({
  mood = 'waving',
  size = 120,
  style,
  containerStyle = 'none',
}: Props) {
  const videoSrc = VIDEO_ASSETS[mood]
  const imageSrc = IMAGE_ASSETS[mood]
  const isVideo = !!videoSrc

  // Decide what to render. Prefer the mood's own asset; fall back to a video
  // mood (waving) if the mood has neither (shouldn't happen — defensive).
  const robotNode = isVideo
    ? <RobotVideo key={mood} source={videoSrc} size={size} />
    : imageSrc
      ? <RobotImage source={imageSrc} size={size} />
      : <RobotVideo key={mood + '_fallback'} source={VIDEO_ASSETS.waving} size={size} />

  if (containerStyle === 'circle') {
    // White spotlight circle — designed for NAVY backgrounds.
    const outer = size + 24
    return (
      <View style={[{
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#C49A1A',
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }, style]}>
        {robotNode}
      </View>
    )
  }

  if (containerStyle === 'card') {
    // White rounded card — designed for LIGHT backgrounds (#F0F4F8/white).
    const outer = size + 16
    return (
      <View style={[{
        width: outer,
        height: outer,
        borderRadius: 20,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }, style]}>
        {robotNode}
      </View>
    )
  }

  // 'none' — raw output, only safe on white backgrounds.
  return (
    <View style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
      {robotNode}
    </View>
  )
}
