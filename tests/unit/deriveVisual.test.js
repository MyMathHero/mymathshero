import { describe, it, expect } from 'vitest'
import { deriveVisual, withDerivedVisual } from '../../lib/deriveVisual.js'

describe('deriveVisual (Prep–3 only)', () => {
  it('returns null above grade 3', () => {
    expect(deriveVisual('What is 7 + 5?', 4)).toBeNull()
    expect(deriveVisual('What is 7 + 5?', 8)).toBeNull()
  })

  it('draws an addition group for small + word problems', () => {
    const v = deriveVisual('Sam has 3 apples and gets 2 more. How many apples?', 1)
    // A word problem (not a clean "A + B" sum) → derive a group picture.
    expect(v).toBeTruthy()
    expect(['add', 'count']).toContain(v.type)
  })

  it('DEFERS a clean column sum to ColumnMath (no double visual)', () => {
    // "What is 3 + 4?" is drawn by the stacked ColumnMath worksheet in the UI,
    // so deriveVisual must NOT also produce a visual — else two show at once
    // (the "532 - 318 = ?" + column-worksheet bug).
    expect(deriveVisual('What is 3 + 4?', 2)).toBeNull()
    expect(deriveVisual('What is 8 - 3?', 2)).toBeNull()
    expect(deriveVisual('What is 532 - 318?', 3)).toBeNull()
    expect(deriveVisual('What is 12 × 3?', 3)).toBeNull()
  })

  it('shows a shape when the question is about a named shape', () => {
    const v = deriveVisual('How many sides does a triangle have?', 3)
    expect(v.type).toBe('shape')
    expect(v.shape).toBe('triangle')
  })

  it('counts objects for a single-number "how many"', () => {
    const v = deriveVisual('How many stars are there if there are 6 stars?', 0)
    expect(v.type).toBe('count')
    expect(v.n).toBe(6)
    expect(v.icon).toBe('⭐')
  })

  it('reuses the fraction diagram parser', () => {
    const v = deriveVisual('A circle is divided into 4 equal parts. 3 parts are shaded.', 3)
    expect(v.type).toBe('fraction-circle')
    expect(v.parts).toBe(4); expect(v.shaded).toBe(3)
  })

  it('returns null when nothing sensible can be drawn', () => {
    expect(deriveVisual('What is the name of the first month of the year?', 2)).toBeNull()
  })

  it('does NOT draw a "3 ÷ 6" equation for a fraction written as 3/6', () => {
    // Regression: the bare "/" once matched as a division operator, drawing a
    // nonsensical "3 ÷ 6 = ?" over "Which fraction is equivalent to 3/6?".
    const v = deriveVisual('Which fraction is equivalent to 3/6?', 3)
    expect(v?.type).not.toBe('equation')
  })

  it('defers a clean ÷ sum to ColumnMath (grade 2+)', () => {
    // ColumnMath draws × and ÷ for grade ≥2, so deriveVisual should defer.
    expect(deriveVisual('What is 12 ÷ 3?', 3)).toBeNull()
  })
})

describe('withDerivedVisual', () => {
  it('attaches a visual in place for grade ≤3, leaves existing ones alone', () => {
    // A shape question (not column arithmetic) → derive attaches a visual.
    const doc = { question: 'How many sides does a triangle have?', grade: 2 }
    withDerivedVisual(doc, 2)
    expect(doc.visual?.type).toBe('shape')

    const has = { question: 'x', grade: 2, visual: { type: 'shape', shape: 'circle' } }
    withDerivedVisual(has, 2)
    expect(has.visual.shape).toBe('circle') // untouched
  })
  it('no-ops above grade 3', () => {
    const doc = { question: 'What is 3 + 4?', grade: 5 }
    withDerivedVisual(doc, 5)
    expect(doc.visual).toBeUndefined()
  })
})
