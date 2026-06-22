import { describe, it, expect } from 'vitest'
import { classifyBehaviour, getBehaviourInsight, getSessionSummary } from '../../lib/behaviour.js'

describe('classifyBehaviour', () => {
  it('fast + correct + no hint + first try = confident_correct', () => {
    expect(classifyBehaviour({ correct: true, timeTakenMs: 5000, hintUsed: false, attemptNumber: 1 }))
      .toBe('confident_correct')
  })

  it('correct with a hint = hint_correct', () => {
    expect(classifyBehaviour({ correct: true, timeTakenMs: 5000, hintUsed: true, attemptNumber: 1 }))
      .toBe('hint_correct')
  })

  it('slow + correct = slow_correct', () => {
    expect(classifyBehaviour({ correct: true, timeTakenMs: 40000, hintUsed: false, attemptNumber: 1 }))
      .toBe('slow_correct')
  })

  it('fast + wrong + first try = careless_error', () => {
    expect(classifyBehaviour({ correct: false, timeTakenMs: 4000, hintUsed: false, attemptNumber: 1 }))
      .toBe('careless_error')
  })

  it('slow or repeated wrong = conceptual_gap', () => {
    expect(classifyBehaviour({ correct: false, timeTakenMs: 40000, hintUsed: false, attemptNumber: 1 }))
      .toBe('conceptual_gap')
  })

  it('always returns a known label', () => {
    const valid = new Set(['confident_correct', 'slow_correct', 'hint_correct', 'careless_error', 'conceptual_gap', 'confused'])
    const out = classifyBehaviour({ correct: false, timeTakenMs: 15000, hintUsed: true, attemptNumber: 2 })
    expect(valid.has(out)).toBe(true)
  })
})

describe('getBehaviourInsight', () => {
  it('returns a non-empty string for each behaviour', () => {
    for (const b of ['confident_correct', 'slow_correct', 'hint_correct', 'careless_error', 'conceptual_gap', 'confused']) {
      const s = getBehaviourInsight(b, 'Addition')
      expect(typeof s).toBe('string')
      expect(s.length).toBeGreaterThan(0)
    }
  })
})

describe('getSessionSummary', () => {
  it('computes accuracy from events', () => {
    const events = [
      { correct: true, timeTakenMs: 5000, behaviour: 'confident_correct' },
      { correct: false, timeTakenMs: 9000, behaviour: 'careless_error' },
      { correct: true, timeTakenMs: 7000, behaviour: 'slow_correct' },
      { correct: true, timeTakenMs: 6000, behaviour: 'confident_correct' },
    ]
    const summary = getSessionSummary(events)
    expect(summary.accuracy).toBe(75) // 3/4
  })

  it('handles an empty session without throwing', () => {
    expect(() => getSessionSummary([])).not.toThrow()
  })
})
