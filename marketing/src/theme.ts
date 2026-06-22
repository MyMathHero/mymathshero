// Brand tokens — mirror the app palette so the video matches the product.
export const NAVY = '#1B2B4B'
export const GOLD = '#C49A1A'
export const OFFWHITE = '#F0F4F8'
export const WHITE = '#FFFFFF'

export const FONT = '"Helvetica Neue", Arial, sans-serif'

// Total video length in seconds (drives every composition's durationInFrames).
export const FPS = 30
export const TOTAL_SECONDS = 38
export const TOTAL_FRAMES = FPS * TOTAL_SECONDS

// Scene boundaries in seconds → frames. Keep in sync with SCRIPT.md.
export const SCENES = {
  hook: { from: 0, dur: 4 },
  problem: { from: 4, dur: 5 },
  diagnostic: { from: 9, dur: 7 },
  askHero: { from: 16, dur: 8 },
  delight: { from: 24, dur: 6 },
  parentTrust: { from: 30, dur: 5 },
  cta: { from: 35, dur: 3 },
} as const

export const sec = (s: number) => Math.round(s * FPS)
