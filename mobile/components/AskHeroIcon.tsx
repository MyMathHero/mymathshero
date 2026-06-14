import { Image, View, type ImageStyle, type StyleProp } from 'react-native'

const iconSource = require('../assets/askheroCHATBOT.png')

interface Props {
  size?: number
  style?: StyleProp<ImageStyle>
  /**
   * When true, wraps the badge in a circular gold-ring medallion so the floating
   * launcher matches the web AskHeroLauncher look. The PNG already has
   * transparent corners, so inline uses (no badge) render cleanly on any bg.
   */
  badge?: boolean
}

export default function AskHeroIcon({ size = 32, style, badge = false }: Props) {
  const image = (
    <Image
      source={iconSource}
      style={[
        { width: size, height: size },
        style,
      ]}
      resizeMode="contain"
    />
  )

  if (!badge) return image

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#C49A1A',
        backgroundColor: '#1B2B4B',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <Image
        source={iconSource}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    </View>
  )
}
