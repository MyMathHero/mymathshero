/**
 * Junior Mode — a voice-first, reading-light experience for the youngest students
 * (Victorian-Curriculum feedback). Pure helpers only, so they're shared by web +
 * mobile and unit-tested.
 *
 * Two grade boundaries (intentionally different):
 *   • Junior MODE: Prep–Grade 3 (≤3) — adventure worlds, big buttons, Hero reads
 *     everything, visual questions, whiteboard tutor.
 *   • Junior DIAGNOSTIC: Prep–Grade 2 (≤2) — a short 10-question visual diagnostic.
 *     Grade 3 bridges up to the "big" adaptive diagnostic used from Grade 4.
 */

export const JUNIOR_MODE_MAX_GRADE = 3
export const JUNIOR_DIAGNOSTIC_MAX_GRADE = 2
export const JUNIOR_DIAGNOSTIC_LENGTH = 10

// Grade may arrive as a number, '3', 'Year 3', 'Prep'. Normalise to an int.
// Unknown/garbage defaults ABOVE the junior boundary so an older student is
// never accidentally trapped in Junior Mode (fail safe = Standard).
function toGrade(grade) {
  if (typeof grade === 'number' && Number.isFinite(grade)) return grade
  if (typeof grade === 'string') {
    if (grade.trim().toLowerCase() === 'prep') return 0
    const d = grade.replace(/\D/g, '')
    if (d) return parseInt(d, 10)
  }
  return JUNIOR_MODE_MAX_GRADE + 1 // safe default = Standard
}

// Should this student see Junior Mode (adventure worlds, narration, big UI)?
export function isJuniorGrade(grade) {
  return toGrade(grade) <= JUNIOR_MODE_MAX_GRADE
}

// Should this student get the short visual 10-question diagnostic (Prep–2)?
export function usesJuniorDiagnostic(grade) {
  return toGrade(grade) <= JUNIOR_DIAGNOSTIC_MAX_GRADE
}

// Auto-narration on by default for Junior grades (Prep–3). Optional above.
export function shouldAutoNarrate(grade) {
  return isJuniorGrade(grade)
}

/**
 * Kid-facing "Learning Worlds" — adventure names over the real curriculum
 * categories (children see worlds; parents/teachers/admin still see strands).
 * `categories` are SKILL_CATEGORIES keys; a world maps the categories its
 * activities draw from. Ordered roughly easy → harder for Prep–3.
 */
export const JUNIOR_WORLDS = [
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

// category key → the world that owns it (first match wins).
export function worldForCategory(categoryKey) {
  return JUNIOR_WORLDS.find(w => w.categories.includes(categoryKey)) || null
}

// All SKILL_CATEGORIES keys a given world covers.
export function categoriesForWorld(worldId) {
  return JUNIOR_WORLDS.find(w => w.id === worldId)?.categories || []
}
