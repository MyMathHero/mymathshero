import { describe, it, expect } from 'vitest'
import { updateSmartScore, getScoreStatus } from '../../lib/smartscore.js'

describe('updateSmartScore', () => {
  it('increases score on a correct answer', () => {
    const { newScore, delta, mastered } = updateSmartScore(40, true, 0.5, 'slow_correct')
    expect(newScore).toBeGreaterThan(40)
    expect(delta).toBeGreaterThan(0)
    expect(mastered).toBe(false)
  })

  it('decreases score on a wrong answer', () => {
    const { newScore, delta } = updateSmartScore(60, false, 0.5, 'conceptual_gap')
    expect(newScore).toBeLessThan(60)
    expect(delta).toBeLessThan(0)
  })

  it('rewards confident_correct more than hint_correct', () => {
    const confident = updateSmartScore(40, true, 0.5, 'confident_correct').delta
    const hinted = updateSmartScore(40, true, 0.5, 'hint_correct').delta
    expect(confident).toBeGreaterThan(hinted)
  })

  it('penalises "confused" more than "careless_error"', () => {
    const confused = updateSmartScore(60, false, 0.5, 'confused').delta
    const careless = updateSmartScore(60, false, 0.5, 'careless_error').delta
    // both negative; confused should be more negative
    expect(confused).toBeLessThan(careless)
  })

  it('gains shrink as score approaches 100 (asymmetric)', () => {
    const low = updateSmartScore(10, true, 0.5, 'slow_correct').delta
    const high = updateSmartScore(90, true, 0.5, 'slow_correct').delta
    expect(low).toBeGreaterThan(high)
  })

  it('clamps within 0..100', () => {
    expect(updateSmartScore(99, true, 0.9, 'confident_correct').newScore).toBeLessThanOrEqual(100)
    expect(updateSmartScore(1, false, 0.9, 'confused').newScore).toBeGreaterThanOrEqual(0)
  })

  it('marks mastered at >= 80', () => {
    expect(updateSmartScore(79, true, 0.9, 'confident_correct').mastered).toBe(true)
  })
})

describe('getScoreStatus', () => {
  it('maps score ranges to labels', () => {
    expect(getScoreStatus(85)).toBe('mastered')
    expect(getScoreStatus(65)).toBe('almost_there')
    expect(getScoreStatus(40)).toBe('in_progress')
    expect(getScoreStatus(10)).toBe('needs_work')
  })
})
