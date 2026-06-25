'use client'
import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { splitMath } from '@/lib/renderMath'

// Renders a string with embedded ASCII math (e.g. "What does 2^(1/2) equal?")
// as text + KaTeX-rendered maths. Plain strings pass through untouched. Used in
// Standard-mode question/option/exam/diagnostic text so exponents, fractions and
// surds look like real maths instead of "2^(1/2)".
export default function MathText({ children, style }) {
  const text = typeof children === 'string' ? children : String(children ?? '')
  const parts = useMemo(() => splitMath(text), [text])

  return (
    <span style={style}>
      {parts.map((p, i) => {
        if (p.type !== 'math') return <span key={i}>{p.value}</span>
        let html
        try {
          html = katex.renderToString(p.value, { throwOnError: false, displayMode: false })
        } catch {
          return <span key={i}>{p.value}</span> // fall back to raw if KaTeX chokes
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
      })}
    </span>
  )
}
