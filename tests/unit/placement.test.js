import { describe, it, expect } from 'vitest'
import {
  summariseDiagnostic, fallbackEstimate, estimateLevel, nudgeSkillScore,
  shouldClimb, MAX_DIAGNOSTIC_GRADE,
} from '../../lib/placement.js'

const fastCorrectAbove = (skillId) => ({ skillId, correct: true, timeTakenMs: 2000, level: 'above' })
const slowWrongAbove = (skillId) => ({ skillId, correct: false, timeTakenMs: 30000, level: 'above' })
const atCorrect = (skillId, ms = 4000) => ({ skillId, correct: true, timeTakenMs: ms, level: 'at' })

describe('summariseDiagnostic', () => {
  it('computes per-level accuracy, median time, and fast-correct rate', () => {
    const s = summariseDiagnostic([
      atCorrect('m_4_add', 3000),
      atCorrect('m_4_sub', 3000),
      fastCorrectAbove('m_5_fractions'),
      slowWrongAbove('m_5_decimals'),
    ])
    expect(s.total).toBe(4)
    expect(s.atAccuracy).toBe(1)        // 2/2
    expect(s.aboveAccuracy).toBe(0.5)   // 1/2
    expect(s.sawAbove).toBe(true)
    expect(s.medianTimeMs).toBe(3000)   // median of 3000,3000,2000,30000
    // 3 correct (3000,3000,2000) all <5s → fastCorrectRate 1.0
    expect(s.fastCorrectRate).toBe(1)
  })

  it('handles empty / malformed input without throwing', () => {
    const s = summariseDiagnostic([])
    expect(s.total).toBe(0)
    expect(s.atAccuracy).toBe(0)
    expect(s.fastCorrectRate).toBe(0)
    expect(summariseDiagnostic(null).total).toBe(0)
    expect(summariseDiagnostic([{ correct: true }]).total).toBe(0) // no skillId → ignored
  })

  it('defaults unknown level to at-grade', () => {
    const s = summariseDiagnostic([{ skillId: 'm_3_x', correct: true, timeTakenMs: 1000 }])
    expect(s.atAccuracy).toBe(1)
  })
})

describe('fallbackEstimate', () => {
  const summaryStrong = { aboveAccuracy: 0.9, atAccuracy: 1, sawAbove: true, fastCorrectRate: 0.8 }

  it('bumps a grade on fast+accurate above-grade evidence', () => {
    const r = fallbackEstimate({ enteredGrade: 4, summary: summaryStrong, parentInsight: { perceivedLevel: 'at', confidence: 'medium' } })
    expect(r.estimatedGrade).toBe(5)
    expect(r.confidence).toBe('medium')
    expect(r.source).toBe('fallback')
  })

  it('keeps the entered grade when evidence is weak', () => {
    const r = fallbackEstimate({
      enteredGrade: 4,
      summary: { aboveAccuracy: 0.2, atAccuracy: 0.5, sawAbove: true, fastCorrectRate: 0.1 },
      parentInsight: { perceivedLevel: 'at', confidence: 'medium' },
    })
    expect(r.estimatedGrade).toBe(4)
  })

  it('respects a confident parent "above" insight when at-grade was easy', () => {
    const r = fallbackEstimate({
      enteredGrade: 3,
      summary: { aboveAccuracy: 0, atAccuracy: 0.9, sawAbove: false, fastCorrectRate: 0.2 },
      parentInsight: { perceivedLevel: 'above', confidence: 'high' },
    })
    expect(r.estimatedGrade).toBe(4)
  })

  it('never throws on missing inputs', () => {
    expect(() => fallbackEstimate({})).not.toThrow()
    expect(fallbackEstimate({}).estimatedGrade).toBe(3) // default grade
  })
})

describe('estimateLevel (no API key → deterministic fallback)', () => {
  it('returns the fallback estimate and never throws without OPENROUTER_API_KEY', async () => {
    const prev = process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_API_KEY
    try {
      const r = await estimateLevel({
        enteredGrade: 4,
        summary: { aboveAccuracy: 0.9, atAccuracy: 1, sawAbove: true, fastCorrectRate: 0.8 },
        parentInsight: { perceivedLevel: 'above', confidence: 'high' },
      })
      expect(r.source).toBe('fallback')
      expect(r.estimatedGrade).toBe(5)
    } finally {
      if (prev !== undefined) process.env.OPENROUTER_API_KEY = prev
    }
  })
})

describe('shouldClimb (adaptive diagnostic)', () => {
  const ok = { correct: true }, no = { correct: false }
  it('climbs when the student aces a stage (≥2 correct, ≥70%)', () => {
    expect(shouldClimb([ok, ok, ok], 6)).toBe(true)   // 3/3
    expect(shouldClimb([ok, ok], 6)).toBe(true)       // 2/2
  })
  it('70% threshold is enforced', () => {
    expect(shouldClimb([ok, ok, no], 6)).toBe(false)     // 2/3 ≈ 0.67 < 0.7
    expect(shouldClimb([ok, ok, ok, no], 6)).toBe(true)  // 3/4 = 0.75
  })
  it('requires at least 2 correct', () => {
    expect(shouldClimb([ok], 6)).toBe(false)        // only 1 correct
    expect(shouldClimb([ok, no, no], 6)).toBe(false)
  })
  it('stops at the max grade', () => {
    expect(shouldClimb([ok, ok, ok], MAX_DIAGNOSTIC_GRADE)).toBe(false)
  })
  it('does not climb on an empty stage', () => {
    expect(shouldClimb([], 6)).toBe(false)
  })
})

describe('nudgeSkillScore', () => {
  const placeUp = { enteredGrade: 4, estimatedGrade: 5, confidence: 'medium' }

  it('raises at/above-grade seeds when the estimate is above the entered grade', () => {
    expect(nudgeSkillScore(55, placeUp, 4)).toBe(63) // +8 for medium
    expect(nudgeSkillScore(70, placeUp, 5)).toBe(78)
  })

  it('never lowers a score and caps at 85', () => {
    expect(nudgeSkillScore(82, placeUp, 5)).toBe(85) // 82+8=90 → clamped to 85
    expect(nudgeSkillScore(40, { ...placeUp, confidence: 'low' }, 4)).toBe(44) // +4
  })

  it('does not nudge below-grade skills or when estimate == entered grade', () => {
    expect(nudgeSkillScore(55, placeUp, 3)).toBe(55) // below entered grade
    expect(nudgeSkillScore(55, { enteredGrade: 4, estimatedGrade: 4, confidence: 'high' }, 4)).toBe(55)
  })
})
