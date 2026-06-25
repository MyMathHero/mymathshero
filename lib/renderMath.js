/**
 * Lightweight math rendering for Standard-mode questions (feedback: "2^(1/2)"
 * shown as raw text is poor). Detects math fragments in an otherwise-plain
 * string and converts them to KaTeX, leaving ordinary words as text.
 *
 * Design goals:
 *  - Never throw, never mangle plain English. If nothing looks like math, return
 *    the text unchanged (callers render it as a normal string).
 *  - Pure tokeniser (`splitMath`, `asciiToLatex`) is unit-tested; the actual
 *    KaTeX HTML render lives in the <MathText> component (browser-only).
 */

// Does this fragment look like maths worth rendering? (has a digit AND a math
// operator/symbol — avoids turning "I have 3 cats" into math).
const MATH_FRAGMENT = /[0-9][0-9\s.]*(?:\^|\/|\*|×|÷|−|–|\+|sqrt|√|=|<|>|≤|≥)[0-9\s().a-z^/*×÷+\-−–√]*[0-9)a-z]/i
// Standalone math-ish tokens like "2^(1/2)", "3/4", "√2", "x^2".
const MATH_TOKEN = /(?:√\s*\d+|\d+\s*\^\s*\(?[^)\s]+\)?|\d+\s*\/\s*\d+|[a-z]\s*\^\s*\d+|sqrt\([^)]*\))/i

// Convert a small ASCII-math fragment to a LaTeX string KaTeX understands.
export function asciiToLatex(s) {
  let t = String(s ?? '').trim()
  if (!t) return ''
  // sqrt(x) and √x → \sqrt{x}
  t = t.replace(/sqrt\(\s*([^)]+?)\s*\)/gi, '\\sqrt{$1}')
  t = t.replace(/√\s*([0-9a-z]+)/gi, '\\sqrt{$1}')
  // a^(b) or a^b → a^{b}
  t = t.replace(/\^\s*\(\s*([^)]+?)\s*\)/g, '^{$1}')
  t = t.replace(/\^\s*([0-9a-z]+)/gi, '^{$1}')
  // fractions a/b → \frac{a}{b} (only simple numeric/var fractions)
  t = t.replace(/(\b[0-9a-z]+)\s*\/\s*([0-9a-z]+\b)/gi, '\\frac{$1}{$2}')
  // operators
  t = t.replace(/\*/g, '\\times ').replace(/×/g, '\\times ').replace(/÷/g, '\\div ')
  t = t.replace(/(?<=\d)\s*-\s*(?=\d)/g, ' - ')
  return t
}

// Split a string into ordered parts: { type: 'text'|'math', value }. Math parts
// are LaTeX strings ready for KaTeX. Text parts are raw (caller escapes/renders).
export function splitMath(input) {
  const str = String(input ?? '')
  if (!str) return [{ type: 'text', value: '' }]
  if (!MATH_FRAGMENT.test(str) && !MATH_TOKEN.test(str)) {
    return [{ type: 'text', value: str }]
  }
  const parts = []
  let last = 0
  // Find math tokens globally and slice around them.
  const re = new RegExp(MATH_TOKEN.source, 'gi')
  let m
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: str.slice(last, m.index) })
    parts.push({ type: 'math', value: asciiToLatex(m[0]) })
    last = m.index + m[0].length
  }
  if (last < str.length) parts.push({ type: 'text', value: str.slice(last) })
  return parts.length ? parts : [{ type: 'text', value: str }]
}

// True if the string contains anything we'd render as math (cheap pre-check so
// callers can skip the <MathText> wrapper entirely for plain options).
export function hasMath(input) {
  const s = String(input ?? '')
  return MATH_FRAGMENT.test(s) || MATH_TOKEN.test(s)
}
