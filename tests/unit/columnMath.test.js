import { describe, it, expect } from 'vitest'
import { parseColumnMath, columnMathAllowed, columnMathFor } from '../../lib/columnMath.js'

describe('parseColumnMath', () => {
  it('parses symbolic sums for all four operations', () => {
    expect(parseColumnMath('28 + 45')).toEqual({ a: 28, b: 45, op: '+' })
    expect(parseColumnMath('What is 84 − 12?')).toEqual({ a: 84, b: 12, op: '-' })
    expect(parseColumnMath('6 x 3')).toEqual({ a: 6, b: 3, op: '×' })
    expect(parseColumnMath('24 ÷ 6 = ?')).toEqual({ a: 24, b: 6, op: '÷' })
    expect(parseColumnMath('12 * 3')).toEqual({ a: 12, b: 3, op: '×' })
    expect(parseColumnMath('20 divided by 4')).toEqual({ a: 20, b: 4, op: '÷' })
  })
  it('treats a bare slash as a fraction, not division (so 3/4 gets no ÷ column)', () => {
    expect(parseColumnMath('20 / 4')).toBeNull()
    expect(parseColumnMath('What is 3/4 of the shape?')).toBeNull()
  })
  it('parses word forms', () => {
    expect(parseColumnMath('28 plus 45')).toEqual({ a: 28, b: 45, op: '+' })
    expect(parseColumnMath('12 times 3')).toEqual({ a: 12, b: 3, op: '×' })
    expect(parseColumnMath('Add 28 and 45')).toEqual({ a: 28, b: 45, op: '+' })
  })
  it('handles "subtract X from Y" order flip', () => {
    expect(parseColumnMath('Subtract 12 from 84')).toEqual({ a: 84, b: 12, op: '-' })
    expect(parseColumnMath('Take 5 away from 20')).toEqual({ a: 20, b: 5, op: '-' })
  })
  it('returns null for non-two-number text (word problems, one number, fractions)', () => {
    expect(parseColumnMath('What number is one more than 6?')).toBeNull()
    expect(parseColumnMath('Sam has 3 apples and 4 oranges and 2 pears. How many?')).toBeNull()
    expect(parseColumnMath('Count the stars')).toBeNull()
    expect(parseColumnMath('What is 3/4 of the shape shaded?')).toBeNull()
    expect(parseColumnMath('')).toBeNull()
    expect(parseColumnMath(null)).toBeNull()
  })
})

describe('columnMathAllowed', () => {
  it('allows +/- for Prep–3, blocks grade 4+', () => {
    expect(columnMathAllowed(0, '+')).toBe(true)
    expect(columnMathAllowed(3, '-')).toBe(true)
    expect(columnMathAllowed(4, '+')).toBe(false)
  })
  it('restricts × and ÷ to grade ≥ 2', () => {
    expect(columnMathAllowed(0, '×')).toBe(false)
    expect(columnMathAllowed(1, '÷')).toBe(false)
    expect(columnMathAllowed(2, '×')).toBe(true)
    expect(columnMathAllowed(3, '÷')).toBe(true)
    expect(columnMathAllowed(4, '×')).toBe(false)
  })
})

describe('columnMathFor (parse + gate)', () => {
  it('returns spec when allowed, null when gated out', () => {
    expect(columnMathFor('28 + 45', 1)).toEqual({ a: 28, b: 45, op: '+' })
    expect(columnMathFor('6 × 3', 1)).toBeNull()       // × blocked at grade 1
    expect(columnMathFor('6 × 3', 2)).toEqual({ a: 6, b: 3, op: '×' })
    expect(columnMathFor('28 + 45', 5)).toBeNull()     // grade > 3
    expect(columnMathFor('Count the dogs', 1)).toBeNull()
  })
})
