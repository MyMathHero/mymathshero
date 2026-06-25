/**
 * Junior visual question schema + validation (Junior Mode, Prep–3).
 *
 * Junior questions are answered by LOOKING, not reading: each carries a `visual`
 * the screen draws big (objects to count, two groups to compare, a shape, a
 * pattern…), with large emoji/number answer options and a short spoken prompt.
 * Stored in the same `questions` collection as normal questions, plus:
 *   mode: 'junior', visual: {...}, narration: '<what Hero says aloud>'
 * They keep `question`, `options`, `correctAnswer`, `difficultyBand` so the
 * existing serving/answer pipeline works unchanged.
 *
 * Pure + unit-tested. Never throws.
 */

export const JUNIOR_VISUAL_TYPES = ['count', 'compare', 'add', 'takeaway', 'shape', 'pattern']

const ALLOWED_SHAPES = ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'diamond']

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return null
  return Math.max(lo, Math.min(hi, n))
}
function str(v, max = 40) { return String(v ?? '').trim().slice(0, max) }

// Validate/coerce a `visual` object → safe shape, or null if unusable.
export function validateVisual(v) {
  if (!v || typeof v !== 'object') return null
  const type = v.type
  if (!JUNIOR_VISUAL_TYPES.includes(type)) return null

  switch (type) {
    case 'count': {
      const n = clampInt(v.n, 1, 20)
      const icon = str(v.icon || v.items, 8) || '🟡'
      if (n == null) return null
      return { type, n, icon }
    }
    case 'compare': {
      const a = clampInt(v.a, 0, 20), b = clampInt(v.b, 0, 20)
      if (a == null || b == null) return null
      return {
        type, a, b,
        iconA: str(v.iconA, 8) || '🔵',
        iconB: str(v.iconB, 8) || '🔴',
        ask: v.ask === 'fewer' || v.ask === 'smaller' ? v.ask : 'bigger', // which to pick
      }
    }
    case 'add':
    case 'takeaway': {
      const a = clampInt(v.a, 0, 10), b = clampInt(v.b, 0, 10)
      if (a == null || b == null) return null
      return { type, a, b, icon: str(v.icon, 8) || '🍎' }
    }
    case 'shape': {
      const shape = ALLOWED_SHAPES.includes(v.shape) ? v.shape : null
      if (!shape) return null
      return { type, shape }
    }
    case 'pattern': {
      const seq = Array.isArray(v.sequence) ? v.sequence.map(s => str(s, 8)).filter(Boolean).slice(0, 8) : []
      if (seq.length < 2) return null
      return { type, sequence: seq }
    }
    default:
      return null
  }
}

// Validate a full Junior question doc fragment (as returned by the generator).
// Returns a clean object or null. Options are kept as plain strings (emoji/number).
export function validateJuniorQuestion(q) {
  if (!q || typeof q !== 'object') return null
  const visual = validateVisual(q.visual)
  if (!visual) return null
  const options = Array.isArray(q.options)
    ? q.options.map(o => str(o, 24)).filter(Boolean)
    : []
  const correctAnswer = str(q.correctAnswer, 24)
  if (options.length < 2 || !correctAnswer) return null
  if (!options.includes(correctAnswer)) return null
  return {
    question: str(q.question, 120) || 'Tap the answer!',
    narration: str(q.narration, 160) || str(q.question, 160) || '',
    options,
    correctAnswer,
    visual,
  }
}
