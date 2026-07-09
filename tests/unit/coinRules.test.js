import { describe, it, expect } from 'vitest'
import {
  coinsForAnswer, accuracyBonus, gradeBand, dailyTaskBonus, monthlyExamBonus,
} from '../../lib/coinRules.js'

describe('coinsForAnswer', () => {
  it('correct solo = 10, correct with AI help = 5, wrong = 0', () => {
    expect(coinsForAnswer({ correct: true })).toBe(10)
    expect(coinsForAnswer({ correct: true, aiHelpUsed: false })).toBe(10)
    expect(coinsForAnswer({ correct: true, aiHelpUsed: true })).toBe(5)
    expect(coinsForAnswer({ correct: false })).toBe(0)
    expect(coinsForAnswer({ correct: false, aiHelpUsed: true })).toBe(0)
  })
  it('handles empty/missing input safely', () => {
    expect(coinsForAnswer()).toBe(0)
    expect(coinsForAnswer({})).toBe(0)
  })
})

describe('accuracyBonus', () => {
  it('tiers: 85→10, 90→20, 100→30, below 85→0', () => {
    expect(accuracyBonus(84)).toBe(0)
    expect(accuracyBonus(85)).toBe(10)
    expect(accuracyBonus(89)).toBe(10)
    expect(accuracyBonus(90)).toBe(20)
    expect(accuracyBonus(99)).toBe(20)
    expect(accuracyBonus(100)).toBe(30)
  })
  it('non-numbers → 0', () => {
    expect(accuracyBonus(undefined)).toBe(0)
    expect(accuracyBonus(NaN)).toBe(0)
    expect(accuracyBonus('x')).toBe(0)
  })
})

describe('gradeBand', () => {
  it('Prep–Y2 (0–2), Y3–Y4 (3–4), Y5–Y6 (5–6, and above)', () => {
    expect(gradeBand(0)).toBe('prep-2')
    expect(gradeBand(2)).toBe('prep-2')
    expect(gradeBand(3)).toBe('3-4')
    expect(gradeBand(4)).toBe('3-4')
    expect(gradeBand(5)).toBe('5-6')
    expect(gradeBand(6)).toBe('5-6')
    expect(gradeBand(9)).toBe('5-6')
  })
  it('non-numbers default to prep-2', () => {
    expect(gradeBand(undefined)).toBe('prep-2')
    expect(gradeBand(NaN)).toBe('prep-2')
  })
})

describe('dailyTaskBonus', () => {
  it('Prep–Y2 = 20, Y3–Y4 = 30, Y5–Y6 = 50', () => {
    expect(dailyTaskBonus(0)).toBe(20)
    expect(dailyTaskBonus(2)).toBe(20)
    expect(dailyTaskBonus(3)).toBe(30)
    expect(dailyTaskBonus(4)).toBe(30)
    expect(dailyTaskBonus(5)).toBe(50)
    expect(dailyTaskBonus(6)).toBe(50)
  })
})

describe('monthlyExamBonus', () => {
  it('tiers: 85→50, 90→80, 95→100, below 85→0', () => {
    expect(monthlyExamBonus(84)).toBe(0)
    expect(monthlyExamBonus(85)).toBe(50)
    expect(monthlyExamBonus(89)).toBe(50)
    expect(monthlyExamBonus(90)).toBe(80)
    expect(monthlyExamBonus(94)).toBe(80)
    expect(monthlyExamBonus(95)).toBe(100)
    expect(monthlyExamBonus(100)).toBe(100)
  })
})
