// Arcade games config (mobile) — kept in sync with web lib/arcadeGames.js.
// Source URLs are hidden from students — they never see where games come from.
// Self-hosted /games/* titles are served from the web origin via WebView.

export interface ArcadeTier {
  label: string
  dailyMinutes: number
  gamesPerDay: number
  color: string
}

export interface ArcadeGame {
  id: string
  title: string
  category: string
  emoji: string
  description: string
  pointsCost: number
  premiumOnly: boolean
  ageRating: string
  embedUrl: string | null
  comingSoon: boolean
  tags: string[]
}

export interface ArcadeCategory {
  id: string
  label: string
  emoji: string
}

export interface ArcadePlan {
  plan?: string
}

export const ARCADE_TIERS: Record<'standard' | 'premium', ArcadeTier> = {
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

// embedUrl / comingSoon policy mirrors the web app: every external URL supplied
// was verified dead (gamedistribution "Not found at origin"; play2048 frame-
// blocked), so only the two self-hosted games are immediately playable.
export const ARCADE_GAMES: ArcadeGame[] = [
  {
    id: 'block_blast',
    title: 'Block Blast',
    category: 'Puzzle',
    emoji: '🧩',
    description: 'Stack the blocks and clear the lines!',
    pointsCost: 20,
    premiumOnly: false,
    ageRating: '5+',
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

export const ARCADE_CATEGORIES: ArcadeCategory[] = [
  { id: 'all', label: 'All Games', emoji: '🎮' },
  { id: 'Action', label: 'Action', emoji: '⚡' },
  { id: 'Puzzle', label: 'Puzzle', emoji: '🧩' },
  { id: 'Classic', label: 'Classic', emoji: '👾' },
  { id: 'Racing', label: 'Racing', emoji: '🏎️' },
  { id: 'Education', label: 'Education', emoji: '📚' },
  { id: 'Strategy', label: 'Strategy', emoji: '🏰' },
]

export function canPlayGame(
  game: ArcadeGame,
  studentXP: number,
  plan?: string
): { allowed: boolean; reason?: string } {
  if (game.comingSoon || !game.embedUrl) {
    return { allowed: false, reason: 'Coming soon!' }
  }
  if (studentXP < game.pointsCost) {
    return { allowed: false, reason: `Need ${game.pointsCost} Hero Points to unlock` }
  }
  if (game.premiumOnly && plan !== 'premium') {
    return { allowed: false, reason: 'Premium subscription required' }
  }
  return { allowed: true }
}
