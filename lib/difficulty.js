/**
 * MyMathsHero difficulty bands — single source of truth.
 *
 * Every question stores a numeric `difficulty` (0.1–0.9, used by the SmartScore
 * algorithm) AND a derived `difficultyBand` ('easy' | 'medium' | 'hard') used to
 * serve harder questions to stronger students. This file owns the mapping in
 * both directions so the generator, backfill, and serving logic stay aligned.
 */

export const BAND_ORDER = ['easy', 'medium', 'hard']

// Numeric difficulty (0.1–0.9) → band. Boundaries chosen so the AI's 0.1–0.9
// range splits roughly into thirds.
export function bandForDifficulty(difficulty) {
  const d = typeof difficulty === 'number' && !Number.isNaN(difficulty) ? difficulty : 0.5
  if (d < 0.4) return 'easy'
  if (d < 0.7) return 'medium'
  return 'hard'
}

// The numeric difficulty range a band should generate within. Used to constrain
// the AI generator so a question's stored `difficulty` matches its band.
export const BAND_RANGE = {
  easy: [0.1, 0.39],
  medium: [0.4, 0.69],
  hard: [0.7, 0.9],
}

// Student SmartScore (0–100 for a skill) → the band of questions to serve.
// Thresholds align with getScoreStatus() in smartscore.js (60 / 80 mastery
// bands), nudged so a near-mastered student gets genuinely hard items.
export function bandForScore(score) {
  const s = typeof score === 'number' && !Number.isNaN(score) ? score : 0
  if (s < 40) return 'easy'
  if (s < 75) return 'medium'
  return 'hard'
}

// Bands adjacent to the target, for graceful widening when the target band is
// empty. Returns the target plus its immediate neighbours, in difficulty order.
export function adjacentBands(band) {
  const i = BAND_ORDER.indexOf(band)
  if (i === -1) return [...BAND_ORDER]
  return BAND_ORDER.filter((_, j) => Math.abs(j - i) <= 1)
}

// Shift a band by `delta` notches, clamped to the band range. Used to apply the
// student's mandatory "too easy / too hard" feedback on top of the SmartScore
// band: too easy → +1 (harder), too hard → -1 (easier), just right → 0.
export function shiftBand(band, delta = 0) {
  const i = BAND_ORDER.indexOf(band)
  if (i === -1) return band
  const next = Math.max(0, Math.min(BAND_ORDER.length - 1, i + Math.trunc(delta || 0)))
  return BAND_ORDER[next]
}

// Map a difficulty-feedback message to a band shift. "too easy" means the work
// is below the student → serve harder (+1); "too hard" → serve easier (-1).
export function biasForFeedback(message) {
  if (message === 'too_easy') return 1
  if (message === 'too_hard') return -1
  return 0 // just_right / unknown
}
