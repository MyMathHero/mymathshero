// Junior Mode helpers (Prep–3), mobile copy of web lib/juniorMode.js. Keep in
// sync with the web version. Pure, no deps.

export const JUNIOR_MODE_MAX_GRADE = 3
export const JUNIOR_DIAGNOSTIC_MAX_GRADE = 2
export const JUNIOR_DIAGNOSTIC_LENGTH = 10

function toGrade(grade: unknown): number {
  if (typeof grade === 'number' && Number.isFinite(grade)) return grade
  if (typeof grade === 'string') {
    if (grade.trim().toLowerCase() === 'prep') return 0
    const d = grade.replace(/\D/g, '')
    if (d) return parseInt(d, 10)
  }
  return JUNIOR_MODE_MAX_GRADE + 1 // unknown → Standard (fail-safe)
}

export function isJuniorGrade(grade: unknown): boolean {
  return toGrade(grade) <= JUNIOR_MODE_MAX_GRADE
}
export function usesJuniorDiagnostic(grade: unknown): boolean {
  return toGrade(grade) <= JUNIOR_DIAGNOSTIC_MAX_GRADE
}
export function shouldAutoNarrate(grade: unknown): boolean {
  return isJuniorGrade(grade)
}

export type JuniorWorld = { id: string; name: string; emoji: string; categories: string[] }

export const JUNIOR_WORLDS: JuniorWorld[] = [
  { id: 'counting_jungle',  name: 'Counting Jungle',  emoji: '🐵', categories: ['number_sense'] },
  { id: 'compare_cove',     name: 'Compare Cove',     emoji: '🐠', categories: ['number_sense'] },
  { id: 'adding_mountain',  name: 'Adding Mountain',  emoji: '⛰️', categories: ['addition'] },
  { id: 'takeaway_track',   name: 'Take-Away Track',  emoji: '🚜', categories: ['subtraction'] },
  { id: 'shape_adventure',  name: 'Shape Adventure',  emoji: '🎈', categories: ['geometry'] },
  { id: 'pattern_castle',   name: 'Pattern Castle',   emoji: '🏰', categories: ['patterns'] },
  { id: 'measure_meadow',   name: 'Measure Meadow',   emoji: '📏', categories: ['measurement'] },
  { id: 'money_market',     name: 'Money Market',     emoji: '🪙', categories: ['money'] },
  { id: 'times_galaxy',     name: 'Times Galaxy',     emoji: '🚀', categories: ['multiplication', 'division'] },
  { id: 'fraction_forest',  name: 'Fraction Forest',  emoji: '🍕', categories: ['fractions'] },
]

export function worldForCategory(categoryKey: string): JuniorWorld | null {
  return JUNIOR_WORLDS.find(w => w.categories.includes(categoryKey)) || null
}
export function categoriesForWorld(worldId: string): string[] {
  return JUNIOR_WORLDS.find(w => w.id === worldId)?.categories || []
}
