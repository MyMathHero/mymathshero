'use client'

import { getCharacter, isCharacterId } from '@/lib/characterAvatars'
import AvatarRender from '@/components/AvatarRender'

// Renders a student's avatar. Order of preference:
//   1. `config` → the new LAYERED avatar (built from their chosen parts)
//   2. a known character id → the legacy preset drawing
//   3. anything else → the raw value as an emoji (oldest avatars)
// Keeping all three means every existing call site works untouched while
// screens migrate to passing `config`.
//
// Props:
//   config – layered avatar config (wins when present)
//   id     – character id OR legacy emoji string
//   size   – pixel diameter (default 64)
//   ring   – show the gold ring badge frame (default true)
export default function CharacterAvatar({ id, config, size = 64, ring = true, style }) {
  const char = isCharacterId(id) ? getCharacter(id) : null

  const frame = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    border: ring ? `${Math.max(2, size * 0.04)}px solid #C49A1A` : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...style,
  }

  // New layered avatar takes precedence over the legacy preset drawing.
  if (config) {
    return (
      <div style={frame}>
        <AvatarRender config={config} size={size} rounded={false} />
      </div>
    )
  }

  if (!char) {
    // Legacy emoji / fallback
    return (
      <div style={{ ...frame, background: 'var(--accent-gold-light, #FFFBEB)' }}>
        <span style={{ fontSize: size * 0.58, lineHeight: 1 }}>{id || '🦊'}</span>
      </div>
    )
  }

  return (
    <div style={frame}>
      <CharacterSVG char={char} size={size} />
    </div>
  )
}

// The actual drawing — exported so picker grids can reuse it without the frame.
export function CharacterSVG({ char, size = 64 }) {
  const p = char.palette
  const [bg1, bg2] = char.bg
  const gid = `cbg-${char.id}`

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={char.name}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bg1} />
          <stop offset="100%" stopColor={bg2} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />

      {/* shoulders / body */}
      <path d="M16 100 Q16 74 50 74 Q84 74 84 100 Z" fill={p.suit} />
      <path d="M16 100 Q16 74 50 74 L50 100 Z" fill={p.suit} opacity="0.85" />
      {/* chest accent emblem */}
      <circle cx="50" cy="90" r="7" fill={p.accent} opacity="0.9" />

      {/* neck */}
      <rect x="44" y="62" width="12" height="12" rx="4" fill={p.skin} />

      {/* head */}
      <circle cx="50" cy="46" r="22" fill={p.skin} />

      {/* hair (base) */}
      <path d="M28 44 Q28 22 50 22 Q72 22 72 44 Q72 33 50 31 Q28 33 28 44 Z" fill={p.hair} />

      {/* eyes */}
      <circle cx="42" cy="46" r="3.1" fill="#1F2937" />
      <circle cx="58" cy="46" r="3.1" fill="#1F2937" />
      {/* smile */}
      <path d="M43 55 Q50 60 57 55" stroke="#1F2937" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* per-character accessory layer */}
      <Accessory char={char} />
    </svg>
  )
}

function Accessory({ char }) {
  const p = char.palette
  switch (char.id) {
    case 'hero':
      // domino mask
      return (
        <path d="M30 42 Q50 36 70 42 Q68 50 58 50 Q50 47 42 50 Q32 50 30 42 Z"
          fill={p.accent} opacity="0.9" />
      )
    case 'ninja':
      // headband + mask covering lower face
      return (
        <>
          <rect x="27" y="38" width="46" height="7" fill={p.accent} />
          <path d="M50 45 L70 41 L66 50 Z" fill={p.accent} />
          <path d="M30 52 Q50 50 70 52 L70 68 Q50 72 30 68 Z" fill={p.suit} />
        </>
      )
    case 'astronaut':
      // helmet ring + glass reflection
      return (
        <>
          <circle cx="50" cy="46" r="24" fill="none" stroke="#E2E8F0" strokeWidth="3" />
          <path d="M40 34 Q46 30 52 32" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
        </>
      )
    case 'gamer':
      // headset
      return (
        <>
          <path d="M28 46 Q28 24 50 24 Q72 24 72 46" fill="none" stroke="#111827" strokeWidth="4" />
          <rect x="24" y="44" width="8" height="12" rx="3" fill="#111827" />
          <rect x="68" y="44" width="8" height="12" rx="3" fill={p.accent} />
        </>
      )
    case 'cricketer':
      // cap
      return (
        <>
          <path d="M28 38 Q50 22 72 38 Q50 32 28 38 Z" fill={p.suit === '#F8FAFC' ? '#1D4ED8' : p.suit} />
          <path d="M28 38 Q22 40 20 44 Q30 42 40 41 Z" fill={p.accent} />
        </>
      )
    case 'scientist':
      // round glasses
      return (
        <>
          <circle cx="42" cy="46" r="6" fill="none" stroke="#111827" strokeWidth="2" />
          <circle cx="58" cy="46" r="6" fill="none" stroke="#111827" strokeWidth="2" />
          <line x1="48" y1="46" x2="52" y2="46" stroke="#111827" strokeWidth="2" />
        </>
      )
    case 'wizard':
      // pointed hat
      return (
        <>
          <path d="M30 30 L50 4 L70 30 Z" fill={p.suit} />
          <path d="M26 30 Q50 24 74 30 L74 34 Q50 28 26 34 Z" fill={p.suit} />
          <circle cx="50" cy="12" r="2.5" fill={p.accent} />
        </>
      )
    case 'racer':
      // racing helmet
      return (
        <>
          <path d="M26 46 Q26 22 50 22 Q74 22 74 46 L74 40 Q50 30 26 40 Z" fill={p.suit} />
          <rect x="30" y="40" width="40" height="9" rx="4" fill="#0F172A" opacity="0.85" />
          <rect x="34" y="22" width="8" height="20" fill={p.accent} opacity="0.8" />
        </>
      )
    case 'robot':
      // antenna + bolts
      return (
        <>
          <line x1="50" y1="24" x2="50" y2="14" stroke={p.accent} strokeWidth="2.5" />
          <circle cx="50" cy="12" r="3" fill={p.accent} />
          <rect x="34" y="40" width="12" height="9" rx="2" fill="#0F172A" opacity="0.25" />
          <rect x="54" y="40" width="12" height="9" rx="2" fill="#0F172A" opacity="0.25" />
        </>
      )
    case 'pilot':
      // aviator cap + goggles
      return (
        <>
          <path d="M26 44 Q26 24 50 24 Q74 24 74 44 Q50 36 26 44 Z" fill={p.suit} />
          <circle cx="42" cy="40" r="5" fill="none" stroke={p.accent} strokeWidth="2.5" />
          <circle cx="58" cy="40" r="5" fill="none" stroke={p.accent} strokeWidth="2.5" />
        </>
      )
    case 'queen':
      // crown
      return (
        <path d="M30 30 L36 20 L43 28 L50 16 L57 28 L64 20 L70 30 Q50 24 30 30 Z"
          fill={p.accent} stroke="#B45309" strokeWidth="0.8" />
      )
    case 'detective':
      // deerstalker-ish hat brim
      return (
        <>
          <path d="M24 40 Q50 22 76 40 Q50 34 24 40 Z" fill={p.suit} />
          <ellipse cx="50" cy="40" rx="30" ry="4" fill={p.accent} opacity="0.7" />
        </>
      )
    default:
      return null
  }
}
