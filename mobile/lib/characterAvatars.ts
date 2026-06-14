// Original character avatar catalogue — kept in sync with the web version at
// /lib/characterAvatars.js. These are ORIGINAL characters (no licensed IP),
// rendered as inline SVG via react-native-svg so they're crisp at any size.

export interface CharacterPalette {
  skin: string
  suit: string
  accent: string
  hair: string
}

export interface Character {
  id: string
  name: string
  tagline: string
  cost: number
  bg: [string, string]
  palette: CharacterPalette
}

export const CHARACTER_AVATARS: Character[] = [
  { id: 'hero',      name: 'Captain Hero', tagline: 'Superhero',     cost: 0, bg: ['#3B82F6', '#1D4ED8'], palette: { skin: '#F5C9A6', suit: '#1E3A8A', accent: '#FBBF24', hair: '#3B2A1A' } },
  { id: 'ninja',     name: 'Shadow Ninja', tagline: 'Stealth Master', cost: 0, bg: ['#6366F1', '#312E81'], palette: { skin: '#E8B98F', suit: '#1F2937', accent: '#EF4444', hair: '#111827' } },
  { id: 'astronaut', name: 'Star Explorer', tagline: 'Astronaut',     cost: 0, bg: ['#0EA5E9', '#0C4A6E'], palette: { skin: '#F5C9A6', suit: '#F8FAFC', accent: '#38BDF8', hair: '#3B2A1A' } },
  { id: 'gamer',     name: 'Pixel Pro',    tagline: 'Gamer',          cost: 0, bg: ['#A855F7', '#6B21A8'], palette: { skin: '#E8B98F', suit: '#7C3AED', accent: '#22D3EE', hair: '#1F2937' } },
  { id: 'cricketer', name: 'Star Batter',  tagline: 'Cricketer',      cost: 0, bg: ['#22C55E', '#15803D'], palette: { skin: '#D9A066', suit: '#F8FAFC', accent: '#1D4ED8', hair: '#111827' } },
  { id: 'scientist', name: 'Brainy Spark', tagline: 'Scientist',      cost: 0, bg: ['#14B8A6', '#0F766E'], palette: { skin: '#F5C9A6', suit: '#F8FAFC', accent: '#34D399', hair: '#6B21A8' } },
  { id: 'wizard',    name: 'Number Mage',  tagline: 'Wizard',         cost: 0, bg: ['#8B5CF6', '#4C1D95'], palette: { skin: '#E8B98F', suit: '#5B21B6', accent: '#FBBF24', hair: '#E5E7EB' } },
  { id: 'racer',     name: 'Turbo Ace',    tagline: 'Racer',          cost: 0, bg: ['#EF4444', '#991B1B'], palette: { skin: '#D9A066', suit: '#DC2626', accent: '#FBBF24', hair: '#1F2937' } },
  { id: 'robot',     name: 'Mecha Buddy',  tagline: 'Robot',          cost: 0, bg: ['#64748B', '#1E293B'], palette: { skin: '#CBD5E1', suit: '#94A3B8', accent: '#22D3EE', hair: '#475569' } },
  { id: 'pilot',     name: 'Sky Captain',  tagline: 'Pilot',          cost: 0, bg: ['#0891B2', '#155E75'], palette: { skin: '#F5C9A6', suit: '#0E7490', accent: '#FBBF24', hair: '#3B2A1A' } },
  { id: 'queen',     name: 'Royal Ace',    tagline: 'Royalty',        cost: 0, bg: ['#EC4899', '#9D174D'], palette: { skin: '#E8B98F', suit: '#DB2777', accent: '#FBBF24', hair: '#3B2A1A' } },
  { id: 'detective', name: 'Clue Hunter',  tagline: 'Detective',      cost: 0, bg: ['#F59E0B', '#B45309'], palette: { skin: '#D9A066', suit: '#78350F', accent: '#FCD34D', hair: '#1F2937' } },
]

export const DEFAULT_AVATAR_ID = 'hero'

export function getCharacter(id?: string | null): Character | null {
  return CHARACTER_AVATARS.find(c => c.id === id) || null
}

export function isCharacterId(value?: string | null): boolean {
  return typeof value === 'string' && CHARACTER_AVATARS.some(c => c.id === value)
}
