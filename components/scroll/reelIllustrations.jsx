// Inline SVG illustrations for HorizontalReel cards — crisp, tiny, brand-coloured,
// no external assets (CSP-safe, no licensing). Each takes an `accent` colour and
// draws on a soft tinted disc. Keyed by name; add more as needed.
//
//   import { ReelArt } from './reelIllustrations'
//   <ReelArt name="target" accent="#2563EB" />

function Disc({ accent, children }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill={accent} opacity="0.1" />
      <circle cx="60" cy="60" r="56" stroke={accent} strokeOpacity="0.25" strokeWidth="1.5" />
      {children}
    </svg>
  )
}

const ART = {
  // 🎯 Personalised Learning — a dartboard with a hit dart
  target: (accent) => (
    <Disc accent={accent}>
      <circle cx="58" cy="60" r="30" stroke={accent} strokeWidth="4" />
      <circle cx="58" cy="60" r="19" stroke={accent} strokeWidth="4" opacity="0.6" />
      <circle cx="58" cy="60" r="7" fill={accent} />
      <path d="M58 60 L92 30" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <path d="M92 30 l-9 1 l1 -9 z" fill={accent} />
    </Disc>
  ),
  // 📖 Australian Curriculum — an open book
  book: (accent) => (
    <Disc accent={accent}>
      <path d="M60 40 C50 33 38 33 30 37 L30 82 C38 78 50 78 60 85 C70 78 82 78 90 82 L90 37 C82 33 70 33 60 40 Z"
        fill={accent} fillOpacity="0.14" stroke={accent} strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 40 L60 85" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <path d="M38 48 H52 M38 58 H52 M68 48 H82 M68 58 H82" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </Disc>
  ),
  // 💬 Step-by-Step Support — a chat bubble with a spark
  chat: (accent) => (
    <Disc accent={accent}>
      <path d="M34 42 H86 A8 8 0 0 1 94 50 V72 A8 8 0 0 1 86 80 H60 L48 92 V80 H34 A8 8 0 0 1 26 72 V50 A8 8 0 0 1 34 42 Z"
        fill={accent} fillOpacity="0.14" stroke={accent} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="46" cy="61" r="3.5" fill={accent} />
      <circle cx="60" cy="61" r="3.5" fill={accent} />
      <circle cx="74" cy="61" r="3.5" fill={accent} />
    </Disc>
  ),
  // ⭐ Builds Confidence — a star inside a rosette/badge
  star: (accent) => (
    <Disc accent={accent}>
      <path d="M60 30 l8.5 17.5 L88 50 l-14 13.5 l3.4 19.4 L60 74 l-17.4 8.9 L46 63.5 L32 50 l19.5 -2.5 Z"
        fill={accent} fillOpacity="0.16" stroke={accent} strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 88 l10 -6 l10 6 l-2 -14 M50 88 l0 -14" stroke={accent} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    </Disc>
  ),
}

export function ReelArt({ name, accent = '#1B2B4B' }) {
  const draw = ART[name]
  return draw ? draw(accent) : null
}

export const REEL_ART_NAMES = Object.keys(ART)
