/**
 * Column-arithmetic visual — parse a two-operand +, −, ×, ÷ problem out of a
 * question's wording so young students (Prep–3) get a vertical "stacked" working
 * layout under the question. Mirror of web lib/columnMath.js. Returns null when
 * the text isn't a clean two-number single operation, so we never draw a wrong
 * diagram. It only READS text — it never changes questions.
 *
 * Grade gating (grade 0 = Prep): shown only for grade ≤ 3; × and ÷ only for
 * grade ≥ 2.
 */
export type ColumnMathSpec = { a: number; b: number; op: '+' | '-' | '×' | '÷' }

const OP_SYMBOL: Record<string, ColumnMathSpec['op']> = {
  '+': '+', 'plus': '+', 'add': '+',
  '-': '-', '−': '-', 'minus': '-', 'subtract': '-', 'take away': '-',
  '×': '×', 'x': '×', '*': '×', 'times': '×', 'multiply': '×', 'multiplied by': '×',
  '÷': '÷', 'divide': '÷', 'divided by': '÷',
}

export function columnMathAllowed(grade: number, op: string): boolean {
  const g = Number(grade)
  if (!Number.isFinite(g) || g > 3) return false
  if ((op === '×' || op === '÷') && g < 2) return false
  return true
}

export function parseColumnMath(text: string | null | undefined): ColumnMathSpec | null {
  const t = String(text || '').trim()
  if (!t) return null

  const nums = t.match(/\d+/g) || []
  if (nums.length !== 2) return null

  // A bare "3/4" is a FRACTION, not division at this level.
  if (/\d+\s*\/\s*\d+/.test(t)) return null

  let a: number | null = null, b: number | null = null, op: ColumnMathSpec['op'] | null = null

  let m = t.match(/(\d+)\s*([+\-−×x*÷])\s*(\d+)/i)
  if (m) { a = parseInt(m[1], 10); b = parseInt(m[3], 10); op = OP_SYMBOL[m[2].toLowerCase()] || null }

  if (op == null) {
    m = t.match(/(\d+)\s+(plus|minus|times|add|subtract|multiply|divide|divided by|multiplied by)\s+(?:by\s+|and\s+)?(\d+)/i)
    if (m) { a = parseInt(m[1], 10); b = parseInt(m[3], 10); op = OP_SYMBOL[m[2].toLowerCase()] || null }
  }

  if (op == null) {
    m = t.match(/\b(add|plus|multiply|times)\s+(\d+)\s+and\s+(\d+)/i)
    if (m) { a = parseInt(m[2], 10); b = parseInt(m[3], 10); op = OP_SYMBOL[m[1].toLowerCase()] || null }
  }

  if (op == null) {
    m = t.match(/(?:subtract|take away|take)\s+(\d+)\s+(?:away\s+)?from\s+(\d+)/i)
    if (m) { a = parseInt(m[2], 10); b = parseInt(m[1], 10); op = '-' }
  }

  if (a == null || b == null || op == null) return null
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return null
  if (a > 9999 || b > 9999) return null

  return { a, b, op }
}

export function columnMathFor(text: string | null | undefined, grade: number): ColumnMathSpec | null {
  const parsed = parseColumnMath(text)
  if (!parsed) return null
  if (!columnMathAllowed(grade, parsed.op)) return null
  return parsed
}
