import { parseFractionVisual } from './fractionVisual'

// Derive a `visual` spec from a Prep–Grade 3 question's TEXT so every young
// question can show a picture/diagram/equation (Phase 3). Pure + deterministic;
// returns null when nothing sensible can be drawn (so we never attach a wrong
// picture). Rendered by FractionVisual on web / the mobile equivalent.
//
// Order of preference (most specific first):
//   1. fraction diagram  (reuse parseFractionVisual)
//   2. shape             ("a triangle", "which shape has 4 sides")
//   3. equation          (an arithmetic expression like "7 + 5 =")
//   4. count / add / takeaway  (small whole-number word problems)
//
// Only used for grade ≤ 3. Numbers are capped so the drawing stays readable.

const MAX_DRAW = 20 // don't draw more than this many icons

const SHAPE_WORDS = ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'diamond', 'pentagon', 'hexagon']
const THEME_ICONS = [
  { re: /apple/i, icon: '🍎' }, { re: /ball/i, icon: '⚽' }, { re: /star/i, icon: '⭐' },
  { re: /flower/i, icon: '🌸' }, { re: /cat/i, icon: '🐱' }, { re: /dog/i, icon: '🐶' },
  { re: /fish/i, icon: '🐟' }, { re: /car/i, icon: '🚗' }, { re: /balloon/i, icon: '🎈' },
  { re: /cooki|biscuit/i, icon: '🍪' }, { re: /candy|lolly|sweet/i, icon: '🍬' },
  { re: /bird/i, icon: '🐦' }, { re: /duck/i, icon: '🦆' }, { re: /sheep/i, icon: '🐑' },
]

function iconFor(text) {
  for (const t of THEME_ICONS) if (t.re.test(text)) return t.icon
  return '🔵'
}

// Whole numbers mentioned in the text (small ones only).
function smallNums(text, cap = MAX_DRAW) {
  return (String(text).match(/\d+/g) || [])
    .map(Number)
    .filter(n => Number.isFinite(n) && n >= 0 && n <= cap)
}

export function deriveVisual(question, grade) {
  const g = Number(grade)
  if (!Number.isFinite(g) || g > 3) return null
  const t = String(question || '')
  if (!t.trim()) return null

  // 1. Fraction diagram (shaded parts).
  const frac = parseFractionVisual(t)
  if (frac) return frac

  // 2. Shape recognition — "which shape is a triangle", "a square has how many
  // sides". Show the shape named in the question.
  const shapeM = SHAPE_WORDS.find(s => new RegExp(`\\b${s}s?\\b`, 'i').test(t))
  if (shapeM && /\b(shape|sides?|corners?|vertic|angle)\b/i.test(t)) {
    return { type: 'shape', shape: shapeM }
  }

  // 3. Equation diagram — an explicit arithmetic expression in the text.
  //    "What is 7 + 5?", "12 - 4 =", "3 × 4". Show it big.
  // NOTE: the bare slash "/" is deliberately EXCLUDED as a division operator.
  // In young questions "3/6" is a FRACTION, not "3 ÷ 6" — matching "/" here drew
  // a nonsensical "3 ÷ 6 = ?" over "Which fraction is equivalent to 3/6?".
  // Fractions are handled by parseFractionVisual (step 1); only the explicit "÷"
  // glyph means division. Also skip if a lone slash pairs the same two numbers
  // (i.e. the "operator" is actually a fraction bar) for extra safety.
  const eq = t.match(/(\d+)\s*([+\-−×x*÷])\s*(\d+)/)
  if (eq) {
    const a = +eq[1], b = +eq[3]
    const opRaw = eq[2]
    const op = /[+]/.test(opRaw) ? '+' : /[-−]/.test(opRaw) ? '−' : /[×x*]/.test(opRaw) ? '×' : '÷'
    // For small +/− with everyday objects, a group picture is friendlier than
    // an equation; otherwise show the equation itself.
    if (op === '+' && a <= MAX_DRAW && b <= MAX_DRAW && a + b <= MAX_DRAW) {
      return { type: 'add', icon: iconFor(t), a, b }
    }
    if (op === '−' && a <= MAX_DRAW && b <= a) {
      return { type: 'takeaway', icon: iconFor(t), a, b }
    }
    return { type: 'equation', a, b, op }
  }

  // 4. Word problems with "how many".
  if (/how many/i.test(t)) {
    const nums = smallNums(t)
    // One number → a counting picture.
    if (nums.length === 1 && nums[0] >= 1) {
      return { type: 'count', icon: iconFor(t), n: nums[0] }
    }
    // Two numbers with join words ("more", "altogether", "in all", "total",
    // "and ... gets") → an addition picture.
    if (nums.length === 2 && /\b(more|altogether|in all|total|combined|join|both|gets?|added?)\b/i.test(t)) {
      const [a, b] = nums
      if (a + b <= MAX_DRAW) return { type: 'add', icon: iconFor(t), a, b }
    }
    // Two numbers with remove words → a takeaway picture.
    if (nums.length === 2 && /\b(left|gave away|ate|lost|removed?|takes? away|fewer|remain)\b/i.test(t)) {
      const [a, b] = nums.slice().sort((x, y) => y - x) // bigger first
      if (a <= MAX_DRAW && b <= a) return { type: 'takeaway', icon: iconFor(t), a, b }
    }
  }

  return null
}

// Attach a derived visual to a question doc IN PLACE if it's grade ≤3 and has
// none yet. Returns the (possibly mutated) doc. No-op above grade 3.
export function withDerivedVisual(doc, grade) {
  if (!doc || doc.visual) return doc
  const g = grade ?? doc.grade
  const v = deriveVisual(doc.question, g)
  if (v) doc.visual = v
  return doc
}
