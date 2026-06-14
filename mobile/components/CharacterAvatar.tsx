import { View, Text, type StyleProp, type ViewStyle } from 'react-native'
import Svg, {
  Defs, LinearGradient, Stop, Rect, Path, Circle, Line, Ellipse,
} from 'react-native-svg'
import { getCharacter, isCharacterId, type Character } from '../lib/characterAvatars'

interface Props {
  id?: string | null
  size?: number
  ring?: boolean
  style?: StyleProp<ViewStyle>
}

// Renders an original character avatar (inline SVG) for a given character id.
// Falls back to rendering the value as an emoji when it isn't a known id.
export default function CharacterAvatar({ id, size = 64, ring = true, style }: Props) {
  const char = isCharacterId(id) ? getCharacter(id) : null

  const frame: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    borderWidth: ring ? Math.max(2, size * 0.04) : 0,
    borderColor: '#C49A1A',
    alignItems: 'center',
    justifyContent: 'center',
  }

  if (!char) {
    return (
      <View style={[frame, { backgroundColor: '#FFFBEB' }, style]}>
        <Text style={{ fontSize: size * 0.56 }}>{id || '🦊'}</Text>
      </View>
    )
  }

  return (
    <View style={[frame, style]}>
      <CharacterSVG char={char} size={size} />
    </View>
  )
}

export function CharacterSVG({ char, size = 64 }: { char: Character; size?: number }) {
  const p = char.palette
  const gid = `cbg-${char.id}`

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={char.bg[0]} />
          <Stop offset="1" stopColor={char.bg[1]} />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" fill={`url(#${gid})`} />

      <Path d="M16 100 Q16 74 50 74 Q84 74 84 100 Z" fill={p.suit} />
      <Circle cx="50" cy="90" r="7" fill={p.accent} opacity={0.9} />
      <Rect x="44" y="62" width="12" height="12" rx="4" fill={p.skin} />
      <Circle cx="50" cy="46" r="22" fill={p.skin} />
      <Path d="M28 44 Q28 22 50 22 Q72 22 72 44 Q72 33 50 31 Q28 33 28 44 Z" fill={p.hair} />
      <Circle cx="42" cy="46" r="3.1" fill="#1F2937" />
      <Circle cx="58" cy="46" r="3.1" fill="#1F2937" />
      <Path d="M43 55 Q50 60 57 55" stroke="#1F2937" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      <Accessory char={char} />
    </Svg>
  )
}

function Accessory({ char }: { char: Character }) {
  const p = char.palette
  switch (char.id) {
    case 'hero':
      return <Path d="M30 42 Q50 36 70 42 Q68 50 58 50 Q50 47 42 50 Q32 50 30 42 Z" fill={p.accent} opacity={0.9} />
    case 'ninja':
      return (
        <>
          <Rect x="27" y="38" width="46" height="7" fill={p.accent} />
          <Path d="M50 45 L70 41 L66 50 Z" fill={p.accent} />
          <Path d="M30 52 Q50 50 70 52 L70 68 Q50 72 30 68 Z" fill={p.suit} />
        </>
      )
    case 'astronaut':
      return (
        <>
          <Circle cx="50" cy="46" r="24" fill="none" stroke="#E2E8F0" strokeWidth="3" />
          <Path d="M40 34 Q46 30 52 32" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.7} />
        </>
      )
    case 'gamer':
      return (
        <>
          <Path d="M28 46 Q28 24 50 24 Q72 24 72 46" fill="none" stroke="#111827" strokeWidth="4" />
          <Rect x="24" y="44" width="8" height="12" rx="3" fill="#111827" />
          <Rect x="68" y="44" width="8" height="12" rx="3" fill={p.accent} />
        </>
      )
    case 'cricketer':
      return (
        <>
          <Path d="M28 38 Q50 22 72 38 Q50 32 28 38 Z" fill="#1D4ED8" />
          <Path d="M28 38 Q22 40 20 44 Q30 42 40 41 Z" fill={p.accent} />
        </>
      )
    case 'scientist':
      return (
        <>
          <Circle cx="42" cy="46" r="6" fill="none" stroke="#111827" strokeWidth="2" />
          <Circle cx="58" cy="46" r="6" fill="none" stroke="#111827" strokeWidth="2" />
          <Line x1="48" y1="46" x2="52" y2="46" stroke="#111827" strokeWidth="2" />
        </>
      )
    case 'wizard':
      return (
        <>
          <Path d="M30 30 L50 4 L70 30 Z" fill={p.suit} />
          <Path d="M26 30 Q50 24 74 30 L74 34 Q50 28 26 34 Z" fill={p.suit} />
          <Circle cx="50" cy="12" r="2.5" fill={p.accent} />
        </>
      )
    case 'racer':
      return (
        <>
          <Path d="M26 46 Q26 22 50 22 Q74 22 74 46 L74 40 Q50 30 26 40 Z" fill={p.suit} />
          <Rect x="30" y="40" width="40" height="9" rx="4" fill="#0F172A" opacity={0.85} />
          <Rect x="34" y="22" width="8" height="20" fill={p.accent} opacity={0.8} />
        </>
      )
    case 'robot':
      return (
        <>
          <Line x1="50" y1="24" x2="50" y2="14" stroke={p.accent} strokeWidth="2.5" />
          <Circle cx="50" cy="12" r="3" fill={p.accent} />
          <Rect x="34" y="40" width="12" height="9" rx="2" fill="#0F172A" opacity={0.25} />
          <Rect x="54" y="40" width="12" height="9" rx="2" fill="#0F172A" opacity={0.25} />
        </>
      )
    case 'pilot':
      return (
        <>
          <Path d="M26 44 Q26 24 50 24 Q74 24 74 44 Q50 36 26 44 Z" fill={p.suit} />
          <Circle cx="42" cy="40" r="5" fill="none" stroke={p.accent} strokeWidth="2.5" />
          <Circle cx="58" cy="40" r="5" fill="none" stroke={p.accent} strokeWidth="2.5" />
        </>
      )
    case 'queen':
      return <Path d="M30 30 L36 20 L43 28 L50 16 L57 28 L64 20 L70 30 Q50 24 30 30 Z" fill={p.accent} stroke="#B45309" strokeWidth="0.8" />
    case 'detective':
      return (
        <>
          <Path d="M24 40 Q50 22 76 40 Q50 34 24 40 Z" fill={p.suit} />
          <Ellipse cx="50" cy="40" rx="30" ry="4" fill={p.accent} opacity={0.7} />
        </>
      )
    default:
      return null
  }
}
