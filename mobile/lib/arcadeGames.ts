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
  coinsCost: number
  premiumOnly: boolean
  ageRating: string
  embedUrl: string | null
  comingSoon: boolean
  tags: string[]
  provider?: 'crazygames'
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

// All playable games are SELF-HOSTED single-file HTML5 games in /public/games,
// served from the web origin via the WebView. Mirrors web lib/arcadeGames.js.
export const ARCADE_GAMES: ArcadeGame[] = [
  {
    id: 'block_blast',
    title: 'Block Blast',
    category: 'Puzzle',
    emoji: '🧩',
    description: 'Stack the blocks and clear the lines!',
    coinsCost: 10,
    premiumOnly: false,
    ageRating: '5+',
    embedUrl: '/games/tetris/index.html',
    comingSoon: false,
    tags: ['puzzle', 'classic', 'free'],
  },
  {
    id: 'snake_hero',
    title: 'Snake Hero',
    category: 'Classic',
    emoji: '🐍',
    description: 'Grow your snake and eat everything!',
    coinsCost: 5,
    premiumOnly: false,
    ageRating: '5+',
    embedUrl: '/games/snake/index.html',
    comingSoon: false,
    tags: ['classic', 'easy', 'free'],
  },
  {
    id: 'number_crunch',
    title: 'Number Crunch',
    category: 'Puzzle',
    emoji: '🔢',
    description: 'Combine the tiles to reach 2048!',
    coinsCost: 20,
    premiumOnly: false,
    ageRating: '7+',
    embedUrl: '/games/2048/index.html',
    comingSoon: false,
    tags: ['puzzle', 'maths', 'popular', 'free'],
  },
  {
    id: 'ball_smash',
    title: 'Ball Smash',
    category: 'Action',
    emoji: '🏓',
    description: 'Break all the bricks with the ball!',
    coinsCost: 15,
    premiumOnly: false,
    ageRating: '6+',
    embedUrl: '/games/breakout/index.html',
    comingSoon: false,
    tags: ['action', 'classic', 'free'],
  },
  {
    id: 'flappy_hero',
    title: 'Flappy Hero',
    category: 'Action',
    emoji: '🤖',
    description: 'Fly the Hero robot through the pipes!',
    coinsCost: 20,
    premiumOnly: false,
    ageRating: '6+',
    embedUrl: '/games/flappy/index.html',
    comingSoon: false,
    tags: ['action', 'skill', 'free'],
  },
  {
    id: 'whack_it',
    title: 'Whack It!',
    category: 'Action',
    emoji: '🔨',
    description: 'Whack the moles before they escape!',
    coinsCost: 10,
    premiumOnly: false,
    ageRating: '5+',
    embedUrl: '/games/whack/index.html',
    comingSoon: false,
    tags: ['action', 'reflex', 'free'],
  },
  {
    id: 'math_blaster',
    title: 'Maths Blaster',
    category: 'Education',
    emoji: '🧮',
    description: 'Answer maths questions and beat the clock!',
    coinsCost: 5,
    premiumOnly: false,
    ageRating: '6+',
    embedUrl: '/games/math_blaster/index.html',
    comingSoon: false,
    tags: ['maths', 'education', 'popular', 'free'],
  },
  {
    id: 'brain_match',
    title: 'Brain Match',
    category: 'Puzzle',
    emoji: '🧠',
    description: 'Match all the pairs from memory!',
    coinsCost: 10,
    premiumOnly: false,
    ageRating: '5+',
    embedUrl: '/games/memory/index.html',
    comingSoon: false,
    tags: ['puzzle', 'memory', 'free'],
  },
  {
    id: 'block_world',
    title: 'BlockWorld',
    category: 'Adventure',
    emoji: '⛏️',
    description: 'Explore, mine and build in a blocky 3D world!',
    coinsCost: 30,
    premiumOnly: false,
    ageRating: '7+',
    embedUrl: '/games/blockworld/index.html',
    comingSoon: false,
    tags: ['adventure', 'sandbox', '3d', 'popular'],
  },
  {
    id: 'castle_defense',
    title: 'Castle Defense',
    category: 'Strategy',
    emoji: '🏰',
    description: 'Build towers to defend your kingdom!',
    coinsCost: 40,
    premiumOnly: true,
    ageRating: '8+',
    embedUrl: null,
    comingSoon: true,
    tags: ['strategy', 'premium'],
  },

  // More self-hosted games (free, ad-free, no licensing). Served from the site.
  {
    id: 'bubble_pop',
    title: 'Bubble Pop',
    category: 'Action',
    emoji: '🫧',
    description: 'Pop as many bubbles as you can before time runs out!',
    coinsCost: 0,
    premiumOnly: false,
    ageRating: '4+',
    embedUrl: '/games/bubblepop/index.html',
    comingSoon: false,
    tags: ['action', 'casual', 'free'],
  },
  {
    id: 'coin_catch',
    title: 'Coin Catcher',
    category: 'Action',
    emoji: '🪙',
    description: 'Catch the falling coins — dodge the bombs!',
    coinsCost: 0,
    premiumOnly: false,
    ageRating: '5+',
    embedUrl: '/games/coincatch/index.html',
    comingSoon: false,
    tags: ['action', 'arcade', 'free'],
  },
  {
    id: 'hero_memory',
    title: 'Hero Memory',
    category: 'Puzzle',
    emoji: '🧠',
    description: 'Watch and repeat the pattern — how far can you go?',
    coinsCost: 0,
    premiumOnly: false,
    ageRating: '5+',
    embedUrl: '/games/simon/index.html',
    comingSoon: false,
    tags: ['puzzle', 'memory', 'free'],
  },
  {
    id: 'maze_muncher',
    title: 'Maze Muncher',
    category: 'Classic',
    emoji: '🟡',
    description: 'Eat all the dots and dodge the ghost!',
    coinsCost: 0,
    premiumOnly: false,
    ageRating: '5+',
    embedUrl: '/games/maze/index.html',
    comingSoon: false,
    tags: ['classic', 'maze', 'free'],
  },

  // CrazyGames placeholders (embedded, ad-free). Swap embedUrl for licensed
  // titles: 'https://www.crazygames.com/embed/<slug>'. Mirror of web config.
  {
    id: 'cg_placeholder_1',
    title: 'CrazyGames Pick #1',
    category: 'Action',
    emoji: '🎯',
    description: 'A licensed CrazyGames title (add embed URL).',
    provider: 'crazygames',
    coinsCost: 0,
    premiumOnly: false,
    ageRating: '7+',
    embedUrl: null,
    comingSoon: true,
    tags: ['crazygames', 'action'],
  },
  {
    id: 'cg_placeholder_2',
    title: 'CrazyGames Pick #2',
    category: 'Racing',
    emoji: '🏎️',
    description: 'A licensed CrazyGames title (add embed URL).',
    provider: 'crazygames',
    coinsCost: 0,
    premiumOnly: false,
    ageRating: '7+',
    embedUrl: null,
    comingSoon: true,
    tags: ['crazygames', 'racing'],
  },
  {
    id: 'cg_placeholder_3',
    title: 'CrazyGames Pick #3',
    category: 'Puzzle',
    emoji: '🧩',
    description: 'A licensed CrazyGames title (add embed URL).',
    provider: 'crazygames',
    coinsCost: 0,
    premiumOnly: false,
    ageRating: '7+',
    embedUrl: null,
    comingSoon: true,
    tags: ['crazygames', 'puzzle'],
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
  { id: 'Adventure', label: 'Adventure', emoji: '⛏️' },
]

export function canPlayGame(
  game: ArcadeGame,
  studentCoins: number,
  plan?: string
): { allowed: boolean; reason?: string } {
  if (game.comingSoon || !game.embedUrl) {
    return { allowed: false, reason: 'Coming soon!' }
  }
  if (studentCoins < game.coinsCost) {
    return { allowed: false, reason: `Need ${game.coinsCost} coins 🪙 to unlock` }
  }
  if (game.premiumOnly && plan !== 'premium') {
    return { allowed: false, reason: 'Premium subscription required' }
  }
  return { allowed: true }
}
