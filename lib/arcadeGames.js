// Arcade games config
// Source URLs are hidden from students — they never see where games come from
// All games are served through our proxy/embed system

export const ARCADE_TIERS = {
  standard: {
    label: 'Standard',
    dailyMinutes: 30,
    gamesPerDay: 3,
    color: '#2563EB',
  },
  premium: {
    label: 'Premium',
    dailyMinutes: 60,
    gamesPerDay: 10,
    color: '#C49A1A',
  },
}

// ── ARCADE GAMES ────────────────────────────────────────────────────────────
// embedUrl / comingSoon policy:
// Every external URL supplied for these games was verified with a live fetch
// (see verification run, 2026-06). All gamedistribution.com hashes returned a
// 200 status but a "Not found at origin!" body (the hashes are not real games),
// and play2048.co is frame-blocked (X-Frame-Options/CSP), so none can be
// embedded. Those are shipped as `comingSoon: true` with `embedUrl: null` until
// a real, licensed, embeddable URL is available.
//
// The two SELF-HOSTED games (Snake Hero, Maths Blaster) live in /public/games
// and are guaranteed to work — no external dependency. Those are the only
// immediately-playable games.
export const ARCADE_GAMES = [
  {
    id: 'block_blast',
    title: 'Block Blast',
    category: 'Puzzle',
    emoji: '🧩',
    description: 'Stack the blocks and clear the lines!',
    pointsCost: 20,
    premiumOnly: false,
    ageRating: '5+',
    // gamedistribution hash verified dead ("Not found at origin") — coming soon.
    embedUrl: null,
    comingSoon: true,
    tags: ['puzzle', 'classic', 'free'],
  },
  {
    id: 'snake_hero',
    title: 'Snake Hero',
    category: 'Classic',
    emoji: '🐍',
    description: 'Grow your snake and eat everything!',
    pointsCost: 15,
    premiumOnly: false,
    ageRating: '5+',
    // Self-hosted in /public/games/snake — guaranteed to work.
    embedUrl: '/games/snake/index.html',
    comingSoon: false,
    tags: ['classic', 'easy', 'free'],
  },
  {
    id: '2048_game',
    title: '2048',
    category: 'Puzzle',
    emoji: '🔢',
    description: 'Combine the tiles to reach 2048!',
    pointsCost: 25,
    premiumOnly: false,
    ageRating: '7+',
    // play2048.co is frame-blocked (X-Frame-Options) — cannot embed. Coming soon.
    embedUrl: null,
    comingSoon: true,
    tags: ['puzzle', 'maths', 'popular', 'free'],
  },
  {
    id: 'bubble_pop',
    title: 'Bubble Pop',
    category: 'Puzzle',
    emoji: '🫧',
    description: 'Match and pop all the bubbles!',
    pointsCost: 20,
    premiumOnly: false,
    ageRating: '5+',
    // gamedistribution hash verified dead — coming soon.
    embedUrl: null,
    comingSoon: true,
    tags: ['puzzle', 'match', 'free'],
  },
  {
    id: 'space_blaster',
    title: 'Space Blaster',
    category: 'Action',
    emoji: '🚀',
    description: 'Defend Earth from the alien invasion!',
    pointsCost: 35,
    premiumOnly: false,
    ageRating: '6+',
    // gamedistribution hash verified dead — coming soon.
    embedUrl: null,
    comingSoon: true,
    tags: ['action', 'shooting', 'free'],
  },
  {
    id: 'car_rush',
    title: 'Car Rush',
    category: 'Racing',
    emoji: '🏎️',
    description: 'Race to the finish at top speed!',
    pointsCost: 40,
    premiumOnly: false,
    ageRating: '6+',
    // gamedistribution hash verified dead — coming soon.
    embedUrl: null,
    comingSoon: true,
    tags: ['racing', 'speed', 'free'],
  },
  {
    id: 'word_search',
    title: 'Word Search',
    category: 'Education',
    emoji: '🔤',
    description: 'Find all the hidden words!',
    pointsCost: 20,
    premiumOnly: false,
    ageRating: '6+',
    // gamedistribution hash verified dead — coming soon.
    embedUrl: null,
    comingSoon: true,
    tags: ['education', 'words', 'free'],
  },
  {
    id: 'math_blaster',
    title: 'Maths Blaster',
    category: 'Education',
    emoji: '🧮',
    description: 'Answer maths questions and beat the clock!',
    pointsCost: 20,
    premiumOnly: false,
    ageRating: '6+',
    // Self-hosted in /public/games/math_blaster — guaranteed to work.
    embedUrl: '/games/math_blaster/index.html',
    comingSoon: false,
    tags: ['maths', 'education', 'popular', 'free'],
  },
  {
    id: 'tower_jump',
    title: 'Tower Jump',
    category: 'Action',
    emoji: '🏃',
    description: 'Jump as high as you can!',
    pointsCost: 50,
    premiumOnly: false,
    ageRating: '6+',
    embedUrl: null,
    comingSoon: true,
    tags: ['action', 'jumping'],
  },
  {
    id: 'castle_defense',
    title: 'Castle Defense',
    category: 'Strategy',
    emoji: '🏰',
    description: 'Build towers to defend your kingdom!',
    pointsCost: 80,
    premiumOnly: true,
    ageRating: '8+',
    embedUrl: null,
    comingSoon: true,
    tags: ['strategy', 'premium'],
  },
]

export const ARCADE_CATEGORIES = [
  { id: 'all', label: 'All Games', emoji: '🎮' },
  { id: 'Action', label: 'Action', emoji: '⚡' },
  { id: 'Puzzle', label: 'Puzzle', emoji: '🧩' },
  { id: 'Classic', label: 'Classic', emoji: '👾' },
  { id: 'Racing', label: 'Racing', emoji: '🏎️' },
  { id: 'Education', label: 'Education', emoji: '📚' },
  { id: 'Strategy', label: 'Strategy', emoji: '🏰' },
]

export function canPlayGame(game, studentXP, plan) {
  if (game.comingSoon || !game.embedUrl) return {
    allowed: false,
    reason: 'Coming soon!',
  }
  if (studentXP < game.pointsCost) return {
    allowed: false,
    reason: `Need ${game.pointsCost} Hero Points to unlock`,
  }
  if (game.premiumOnly && plan !== 'premium') return {
    allowed: false,
    reason: 'Premium subscription required',
  }
  return { allowed: true }
}
