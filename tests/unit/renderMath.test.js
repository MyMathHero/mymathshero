import { describe, it, expect } from 'vitest'
import { asciiToLatex, splitMath, hasMath } from '../../lib/renderMath.js'

describe('asciiToLatex', () => {
  it('converts exponents with parens', () => {
    expect(asciiToLatex('2^(1/2)')).toContain('^{')
    expect(asciiToLatex('2^(1/2)')).toContain('\\frac{1}{2}')
  })
  it('converts sqrt and √', () => {
    expect(asciiToLatex('sqrt(2)')).toBe('\\sqrt{2}')
    expect(asciiToLatex('√9')).toBe('\\sqrt{9}')
  })
  it('converts simple fractions and × ÷', () => {
    expect(asciiToLatex('3/4')).toBe('\\frac{3}{4}')
    expect(asciiToLatex('3*4')).toContain('\\times')
    expect(asciiToLatex('8÷2')).toContain('\\div')
  })
})

describe('hasMath', () => {
  it('detects mathy strings', () => {
    expect(hasMath('What does 2^(1/2) equal?')).toBe(true)
    expect(hasMath('Simplify 3/4 + 1/2')).toBe(true)
    expect(hasMath('√16 = ?')).toBe(true)
  })
  it('ignores plain English with a stray number', () => {
    expect(hasMath('I have 3 cats and a dog')).toBe(false)
    expect(hasMath('What is a triangle?')).toBe(false)
  })
})

describe('splitMath', () => {
  it('splits text around a math token', () => {
    const parts = splitMath('What does 2^(1/2) equal?')
    expect(parts.some(p => p.type === 'math')).toBe(true)
    expect(parts.some(p => p.type === 'text' && /What does/.test(p.value))).toBe(true)
    const math = parts.find(p => p.type === 'math')
    expect(math.value).toContain('\\frac{1}{2}')
  })
  it('returns a single text part for plain strings (no mangling)', () => {
    const parts = splitMath('Which shape has four equal sides?')
    expect(parts).toHaveLength(1)
    expect(parts[0]).toEqual({ type: 'text', value: 'Which shape has four equal sides?' })
  })
  it('handles empty/nullish', () => {
    expect(splitMath('')).toEqual([{ type: 'text', value: '' }])
    expect(splitMath(null)).toEqual([{ type: 'text', value: '' }])
  })
})
