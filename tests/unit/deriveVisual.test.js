import { describe, it, expect } from 'vitest'
import { deriveVisual, withDerivedVisual } from '../../lib/deriveVisual.js'

describe('deriveVisual (Prep–3 only)', () => {
  it('returns null above grade 3', () => {
    expect(deriveVisual('What is 7 + 5?', 4)).toBeNull()
    expect(deriveVisual('What is 7 + 5?', 8)).toBeNull()
  })

  it('draws an addition group for small + word problems', () => {
    const v = deriveVisual('Sam has 3 apples and gets 2 more. How many apples?', 1)
    // "how many" + single-number path OR add path — either is a real visual.
    expect(v).toBeTruthy()
    expect(['add', 'count']).toContain(v.type)
  })

  it('draws an add visual for an explicit small addition', () => {
    const v = deriveVisual('What is 3 + 4?', 2)
    expect(v.type).toBe('add')
    expect(v.a).toBe(3); expect(v.b).toBe(4)
  })

  it('draws a takeaway visual for small subtraction', () => {
    const v = deriveVisual('What is 8 - 3?', 2)
    expect(v.type).toBe('takeaway')
    expect(v.a).toBe(8); expect(v.b).toBe(3)
  })

  it('shows an equation for bigger arithmetic (still grade 3)', () => {
    const v = deriveVisual('What is 12 × 3?', 3)
    expect(v.type).toBe('equation')
    expect(v.op).toBe('×')
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
})

describe('withDerivedVisual', () => {
  it('attaches a visual in place for grade ≤3, leaves existing ones alone', () => {
    const doc = { question: 'What is 3 + 4?', grade: 2 }
    withDerivedVisual(doc, 2)
    expect(doc.visual?.type).toBe('add')

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
