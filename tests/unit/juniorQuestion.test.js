import { describe, it, expect } from 'vitest'
import { validateVisual, validateJuniorQuestion } from '../../lib/juniorQuestion.js'

describe('validateVisual', () => {
  it('count: clamps n and defaults icon', () => {
    expect(validateVisual({ type: 'count', n: 4, icon: '🍎' })).toEqual({ type: 'count', n: 4, icon: '🍎' })
    expect(validateVisual({ type: 'count', n: 99 }).n).toBe(20)        // clamped
    expect(validateVisual({ type: 'count', n: 3 }).icon).toBe('🟡')    // default icon
  })
  it('compare: keeps groups + ask, defaults ask to bigger', () => {
    const v = validateVisual({ type: 'compare', a: 8, b: 5, iconA: '🦖', iconB: '🐭' })
    expect(v).toMatchObject({ type: 'compare', a: 8, b: 5, ask: 'bigger' })
    expect(validateVisual({ type: 'compare', a: 1, b: 2, ask: 'fewer' }).ask).toBe('fewer')
  })
  it('add/takeaway: within range', () => {
    expect(validateVisual({ type: 'add', a: 2, b: 3 })).toMatchObject({ type: 'add', a: 2, b: 3 })
    expect(validateVisual({ type: 'takeaway', a: 5, b: 2 }).type).toBe('takeaway')
  })
  it('shape: only allowed shapes', () => {
    expect(validateVisual({ type: 'shape', shape: 'triangle' })).toEqual({ type: 'shape', shape: 'triangle' })
    expect(validateVisual({ type: 'shape', shape: 'dodecahedron' })).toBeNull()
  })
  it('pattern: needs >=2 items', () => {
    expect(validateVisual({ type: 'pattern', sequence: ['🔵', '🔴', '🔵'] }).sequence).toHaveLength(3)
    expect(validateVisual({ type: 'pattern', sequence: ['🔵'] })).toBeNull()
  })
  it('rejects unknown/garbage', () => {
    expect(validateVisual({ type: 'wat' })).toBeNull()
    expect(validateVisual(null)).toBeNull()
    expect(validateVisual({})).toBeNull()
  })
})

describe('validateJuniorQuestion', () => {
  const good = {
    question: 'How many apples?',
    narration: 'How many apples can you see?',
    options: ['3', '4', '5'],
    correctAnswer: '4',
    visual: { type: 'count', n: 4, icon: '🍎' },
  }
  it('accepts a well-formed question', () => {
    const out = validateJuniorQuestion(good)
    expect(out.correctAnswer).toBe('4')
    expect(out.visual.type).toBe('count')
    expect(out.narration.length).toBeGreaterThan(0)
  })
  it('falls back narration to the question text', () => {
    const out = validateJuniorQuestion({ ...good, narration: '' })
    expect(out.narration).toBe(good.question)
  })
  it('rejects when correctAnswer is not among options', () => {
    expect(validateJuniorQuestion({ ...good, correctAnswer: '9' })).toBeNull()
  })
  it('rejects without a valid visual or with <2 options', () => {
    expect(validateJuniorQuestion({ ...good, visual: { type: 'nope' } })).toBeNull()
    expect(validateJuniorQuestion({ ...good, options: ['4'] })).toBeNull()
  })
})
