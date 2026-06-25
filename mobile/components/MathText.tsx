import { Text, TextStyle } from 'react-native'

// Lightweight readable-math for React Native (no KaTeX engine on mobile). Turns
// ASCII math into readable Unicode so "2^(1/2)" shows as "2^(½)"-style maths
// instead of raw caret/slash text. Plain English is untouched. Mirrors the
// INTENT of web's <MathText> (which uses full KaTeX).

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾', n: 'ⁿ', x: 'ˣ', y: 'ʸ', a: 'ᵃ', b: 'ᵇ', '/': '⁄', '.': '·',
}
const VULGAR: Record<string, string> = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾' }

function toSuper(s: string): string {
  return s.split('').map(ch => SUP[ch] ?? ch).join('')
}

export function formatMath(input: string): string {
  let t = String(input ?? '')
  if (!t) return ''
  // sqrt(x) → √x ; keep existing √
  t = t.replace(/sqrt\(\s*([^)]+?)\s*\)/gi, '√$1')
  // a^(b) → a + superscript(b)  ; a^b → a + superscript(b)
  t = t.replace(/\^\s*\(\s*([^)]+?)\s*\)/g, (_, b) => toSuper(b))
  t = t.replace(/\^\s*([0-9a-z]+)/gi, (_, b) => toSuper(b))
  // common vulgar fractions
  t = t.replace(/\b([1-3])\/([2-4])\b/g, (m) => VULGAR[m] || m)
  // operators
  t = t.replace(/\*/g, '×')
  return t
}

export default function MathText({ children, style }: { children: any; style?: TextStyle }) {
  const text = typeof children === 'string' ? children : String(children ?? '')
  return <Text style={style}>{formatMath(text)}</Text>
}
