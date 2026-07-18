import { useMemo } from 'react'
import Svg, {
  Defs, LinearGradient, Stop, ClipPath, Rect, G,
  Circle, Ellipse, Line, Path,
} from 'react-native-svg'
// Shared registry — the SAME part definitions the web uses, so both platforms
// draw an identical avatar from the same config. buildAvatar returns plain shape
// data, so this is a thin renderer (mirror of components/AvatarRender.jsx).
import { buildAvatar } from '../lib/avatarParts'

type Shape = Record<string, any>

let uidCounter = 0

function ShapeNode({ s }: { s: Shape }) {
  switch (s.type) {
    case 'circle':
      return <Circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} opacity={s.opacity} />
    case 'ellipse':
      return <Ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} opacity={s.opacity} />
    case 'rect':
      return <Rect x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} opacity={s.opacity} />
    case 'line':
      return <Line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.stroke} strokeWidth={s.strokeWidth} strokeLinecap={s.strokeLinecap} opacity={s.opacity} />
    case 'path':
      return <Path d={s.d} fill={s.fill ?? 'none'} stroke={s.stroke} strokeWidth={s.strokeWidth} strokeLinecap={s.strokeLinecap} opacity={s.opacity} />
    default:
      return null
  }
}

export default function AvatarRender({
  config, size = 96, rounded = true,
}: { config: any; size?: number; rounded?: boolean }) {
  // Stable ids per mounted instance (RN has no useId in older versions).
  const uid = useMemo(() => `av${++uidCounter}`, [])
  const { background, shapes } = useMemo(() => buildAvatar(config), [config])
  const gid = `${uid}-bg`
  const cid = `${uid}-clip`

  return (
    <Svg width={size} height={size*1.6} viewBox="0 0 100 160">
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={background?.grad?.[0] || '#60A5FA'} />
          <Stop offset="100%" stopColor={background?.grad?.[1] || '#1D4ED8'} />
        </LinearGradient>
        {rounded && (
          <ClipPath id={cid}>
            <Rect x="0" y="0" width="100" height="160" rx="16" />
          </ClipPath>
        )}
      </Defs>
      <G clipPath={rounded ? `url(#${cid})` : undefined}>
        <Rect width="100" height="160" fill={`url(#${gid})`} />
        {shapes.map((s: Shape, i: number) => <ShapeNode key={i} s={s} />)}
      </G>
    </Svg>
  )
}
