import { describe, it, expect } from 'vitest'
import {
  CHALLENGE_WIN_COINS, displayFirstName, challengeQuestionCount, gradesMatch,
  aiAccuracy, aiThinkMs, simulateAiRun, decideWinner, challengeReward, resultSummary,
} from '../../lib/challenge.js'

describe('displayFirstName', () => {
  it('returns first token only; defaults to Hero', () => {
    expect(displayFirstName('Alex Smith')).toBe('Alex')
    expect(displayFirstName('  Jordan  ')).toBe('Jordan')
    expect(displayFirstName('')).toBe('Hero')
    expect(displayFirstName(undefined)).toBe('Hero')
  })
})

describe('challengeQuestionCount', () => {
  it('Prep–Y3 = 10, Y4+ = 15', () => {
    expect(challengeQuestionCount(0)).toBe(10)
    expect(challengeQuestionCount(3)).toBe(10)
    expect(challengeQuestionCount(4)).toBe(15)
    expect(challengeQuestionCount(6)).toBe(15)
  })
})

describe('gradesMatch', () => {
  it('within one year matches', () => {
    expect(gradesMatch(3, 3)).toBe(true)
    expect(gradesMatch(3, 4)).toBe(true)
    expect(gradesMatch(3, 5)).toBe(false)
  })
})

describe('AI opponent', () => {
  it('accuracy rises with grade and is capped at 0.8', () => {
    expect(aiAccuracy(0)).toBeCloseTo(0.62, 5)
    expect(aiAccuracy(6)).toBeLessThanOrEqual(0.8)
    expect(aiAccuracy(20)).toBe(0.8)
  })
  it('think time stays within 3–12s', () => {
    for (const r of [0, 0.5, 0.999]) {
      const ms = aiThinkMs(3, () => r)
      expect(ms).toBeGreaterThanOrEqual(3000)
      expect(ms).toBeLessThanOrEqual(12000)
    }
  })
  it('simulateAiRun returns the requested length', () => {
    const run = simulateAiRun(3, 10, () => 0) // always < acc → all correct
    expect(run).toHaveLength(10)
    expect(run.every(r => r.correct)).toBe(true)
    const miss = simulateAiRun(3, 5, () => 0.99) // always > acc → all wrong
    expect(miss.every(r => !r.correct)).toBe(true)
  })
})

describe('decideWinner / reward', () => {
  it('more correct wins', () => {
    expect(decideWinner({ correct: 8 }, { correct: 6 })).toBe('player')
    expect(decideWinner({ correct: 5 }, { correct: 9 })).toBe('opponent')
  })
  it('ties broken by faster time', () => {
    expect(decideWinner({ correct: 7, timeMs: 40000 }, { correct: 7, timeMs: 50000 })).toBe('player')
    expect(decideWinner({ correct: 7, timeMs: 60000 }, { correct: 7, timeMs: 50000 })).toBe('opponent')
    expect(decideWinner({ correct: 7, timeMs: 50000 }, { correct: 7, timeMs: 50000 })).toBe('tie')
  })
  it('win pays 20 coins, else 0', () => {
    expect(challengeReward('player')).toBe(CHALLENGE_WIN_COINS)
    expect(challengeReward('opponent')).toBe(0)
    expect(challengeReward('tie')).toBe(0)
  })
})

describe('resultSummary', () => {
  it('formats correct + accuracy', () => {
    expect(resultSummary(12, 15)).toBe('You solved 12 questions with 80% accuracy.')
    expect(resultSummary(1, 10)).toBe('You solved 1 question with 10% accuracy.')
  })
})
