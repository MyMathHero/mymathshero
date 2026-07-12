import { describe, it, expect } from 'vitest'
import {
  normaliseAnswer, evalNumericAnswer, numericallyEqual, answersAgree, isVisualQuestion,
} from '../../lib/verifyQuestion.js'

describe('evalNumericAnswer', () => {
  it('parses integers, decimals, negatives', () => {
    expect(evalNumericAnswer('45')).toBe(45)
    expect(evalNumericAnswer('-1.75')).toBeCloseTo(-1.75)
    expect(evalNumericAnswer('0')).toBe(0)
  })
  it('parses simple fractions incl. negatives', () => {
    expect(evalNumericAnswer('-7/4')).toBeCloseTo(-1.75)
    expect(evalNumericAnswer('3/2')).toBeCloseTo(1.5)
    expect(evalNumericAnswer('15/16')).toBeCloseTo(0.9375)
  })
  it('parses mixed numbers', () => {
    expect(evalNumericAnswer('1 3/4')).toBeCloseTo(1.75)
    expect(evalNumericAnswer('-1 3/4')).toBeCloseTo(-1.75)
    expect(evalNumericAnswer('2 and 1/2')).toBeCloseTo(2.5)
  })
  it('parses percentages and currency/units', () => {
    expect(evalNumericAnswer('50%')).toBeCloseTo(0.5)
    expect(evalNumericAnswer('$5.50')).toBeCloseTo(5.5)
    expect(evalNumericAnswer('5 km')).toBe(5)
  })
  it('returns null for non-numeric / division by zero', () => {
    expect(evalNumericAnswer('Pentagon')).toBeNull()
    expect(evalNumericAnswer('1/0')).toBeNull()
    expect(evalNumericAnswer('')).toBeNull()
  })
})

describe('numericallyEqual', () => {
  it('reconciles fraction, decimal and mixed forms', () => {
    expect(numericallyEqual('-7/4', '-1.75')).toBe(true)
    expect(numericallyEqual('-1 3/4', '-7/4')).toBe(true)
    expect(numericallyEqual('3/2', '1.5')).toBe(true)
  })
  it('distinguishes different values', () => {
    expect(numericallyEqual('-7/4', '-1')).toBe(false)   // the exact bug from the screenshots
    expect(numericallyEqual('15/16', '0')).toBe(false)
    expect(numericallyEqual('3/2', '-3/2')).toBe(false)  // sign matters
  })
  it('is false when either side is non-numeric', () => {
    expect(numericallyEqual('Pentagon', 'Pentagon')).toBe(false)
  })
})

describe('answersAgree', () => {
  it('matches exact text (non-numeric answers)', () => {
    expect(answersAgree('Pentagon', 'pentagon')).toBe(true)
    expect(answersAgree('A) Pentagon', 'Pentagon')).toBe(true)
  })
  it('matches by real numeric value across forms', () => {
    expect(answersAgree('-1.75', '-7/4')).toBe(true)
    expect(answersAgree('1 3/4', '7/4')).toBe(true)
  })
  it('rejects the screenshot bug: -1 is NOT -7/4', () => {
    expect(answersAgree('-7/4', '-1')).toBe(false)
  })
  it('maps a bare option letter to the option text', () => {
    const options = ['1', '-3/2', '-1', '-1/2']
    expect(answersAgree('c', '-1', options)).toBe(true)
    expect(answersAgree('a', '-1', options)).toBe(false)
  })
})

describe('isVisualQuestion', () => {
  it('flags junior + visual-bearing questions as unverifiable', () => {
    expect(isVisualQuestion({ mode: 'junior' })).toBe(true)
    expect(isVisualQuestion({ visual: { type: 'fraction' } })).toBe(true)
    expect(isVisualQuestion({ question: 'What is 2+2?' })).toBe(false)
  })
})
