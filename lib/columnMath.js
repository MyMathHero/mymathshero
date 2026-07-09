/**
 * Column-arithmetic visual — parse a two-operand +, −, ×, ÷ problem out of a
 * question's wording so young students (up to Grade 3) get a vertical "stacked"
 * working layout under the question (like a printed maths worksheet).
 *
 *   parseColumnMath("What is 28 + 45?")        → { a: 28, b: 45, op: '+' }
 *   parseColumnMath("Subtract 12 from 84")     → { a: 84, b: 12, op: '-' }
 *   parseColumnMath("6 x 3")                    → { a: 6,  b: 3,  op: '×' }
 *
 * Returns null when the text isn't a clean two-number single-operation sum, so
 * we never draw a wrong diagram. NOTHING here changes questions — it only reads
 * the existing text.
 *
 * Grade gating (grade 0 = Prep):
 *   • Shown only for grade ≤ 3.
 *   • × and ÷ are shown only for grade ≥ 2 (younger kids rarely do them).
 */

const OP_SYMBOL = { '+': '+', 'plus': '+', 'add': '+',
  '-': '-', '−': '-', 'minus': '-', 'subtract': '-', 'take away': '-',
  '×': '×', 'x': '×', '*': '×', 'times': '×', 'multiply': '×', 'multiplied by': '×',
  '÷': '÷', '/': '÷', 'divide': '÷', 'divided by': '÷' }

// Is this visual allowed for the given grade?
export function columnMathAllowed(grade, op) {
  const g = Number(grade)
  if (!Number.isFinite(g) || g > 3) return false
  if ((op === '×' || op === '÷') && g < 2) return false
  return true
}

// Extract { a, b, op } from question text, or null. Conservative: only matches a
// single clean "A <op> B" (in symbols OR words); rejects anything with a third
// number so multi-step word problems don't get a misleading two-number diagram.
export function parseColumnMath(text) {
  const t = String(text || '').trim()
  if (!t) return null

  // Reject if there are 3+ standalone numbers — likely a word problem, not a sum.
  const nums = t.match(/\d+/g) || []
  if (nums.length !== 2) return null

  // A bare "3/4" is a FRACTION, not division at this level — division questions
  // are written "÷" or "divided by". Bail so a fraction never gets a ÷ column.
  if (/\d+\s*\/\s*\d+/.test(t)) return null

  let a = null, b = null, op = null

  // 1) Symbolic form: "28 + 45", "84 − 12", "6 × 3", "24 ÷ 6" (spaces optional).
  //    Note: '/' is deliberately excluded (see fraction guard above).
  let m = t.match(/(\d+)\s*([+\-−×x*÷])\s*(\d+)/i)
  if (m) {
    a = parseInt(m[1], 10); b = parseInt(m[3], 10)
    op = OP_SYMBOL[m[2].toLowerCase()] || null
  }

  // 2) Word form, number first: "28 plus 45", "12 times 3", "20 divided by 4".
  if (op == null) {
    m = t.match(/(\d+)\s+(plus|minus|times|add|subtract|multiply|divide|divided by|multiplied by)\s+(?:by\s+|and\s+)?(\d+)/i)
    if (m) {
      a = parseInt(m[1], 10); b = parseInt(m[3], 10)
      op = OP_SYMBOL[m[2].toLowerCase()] || null
    }
  }

  // 3) Word form, verb first: "Add 28 and 45", "Multiply 6 and 3".
  if (op == null) {
    m = t.match(/\b(add|plus|multiply|times)\s+(\d+)\s+and\s+(\d+)/i)
    if (m) {
      a = parseInt(m[2], 10); b = parseInt(m[3], 10)
      op = OP_SYMBOL[m[1].toLowerCase()] || null
    }
  }

  // 3) "Subtract 12 from 84" / "take 12 away from 84" → 84 − 12 (order flips).
  if (op == null) {
    m = t.match(/(?:subtract|take away|take)\s+(\d+)\s+(?:away\s+)?from\s+(\d+)/i)
    if (m) { a = parseInt(m[2], 10); b = parseInt(m[1], 10); op = '-' }
  }

  if (a == null || b == null || op == null) return null
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  if (a < 0 || b < 0) return null
  // Keep it worksheet-sized (matches the up-to-Grade-3 use case).
  if (a > 9999 || b > 9999) return null

  return { a, b, op }
}

// Convenience: parse + grade-gate in one call. Returns the visual spec or null.
export function columnMathFor(text, grade) {
  const parsed = parseColumnMath(text)
  if (!parsed) return null
  if (!columnMathAllowed(grade, parsed.op)) return null
  return parsed
}
