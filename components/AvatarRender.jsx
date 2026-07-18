'use client'

import { useId } from 'react'
import { buildAvatar } from '@/lib/avatarParts'

// Draws a layered avatar from a config object. The config (not an image) is what
// we store per student, so the avatar is rebuilt from their choices every time.
//
// buildAvatar() returns PLAIN SHAPE DATA, so this component is a thin renderer —
// the mobile version (mobile/components/AvatarRender.tsx) draws the exact same
// data with react-native-svg. Keep the two in sync.
//
//   <AvatarRender config={student.avatarConfig} size={96} />

function Shape({ s }) {
  switch (s.type) {
    case 'circle':
      return <circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} opacity={s.opacity} />
    case 'ellipse':
      return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} opacity={s.opacity} />
    case 'rect':
      return <rect x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} opacity={s.opacity} />
    case 'line':
      return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.stroke} strokeWidth={s.strokeWidth} strokeLinecap={s.strokeLinecap} opacity={s.opacity} />
    case 'path':
      return <path d={s.d} fill={s.fill ?? 'none'} stroke={s.stroke} strokeWidth={s.strokeWidth} strokeLinecap={s.strokeLinecap} opacity={s.opacity} />
    default:
      return null
  }
}

export default function AvatarRender({ config, size = 96, rounded = true, className = '', style }) {
  const uid = useId().replace(/:/g, '')
  const { background, shapes } = buildAvatar(config)
  const gid = `avbg-${uid}`
  const cid = `avclip-${uid}`

  return (
    <svg
      width={size}
      height={size * 1.6}
      viewBox="0 0 100 160"
      className={className}
      style={style}
      role="img"
      aria-label="Student avatar"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={background?.grad?.[0] || '#60A5FA'} />
          <stop offset="100%" stopColor={background?.grad?.[1] || '#1D4ED8'} />
        </linearGradient>
        {rounded && (
          <clipPath id={cid}>
            <rect x="0" y="0" width="100" height="160" rx="16" />
          </clipPath>
        )}
      </defs>
      <g clipPath={rounded ? `url(#${cid})` : undefined}>
        <rect width="100" height="160" fill={`url(#${gid})`} />
        {shapes.map((s, i) => <Shape key={i} s={s} />)}
      </g>
    </svg>
  )
}
