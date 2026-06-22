import { describe, it, expect } from 'vitest'
import { getEffectiveCeiling, getRecommendations, getSkillGraph } from '../../lib/recommender.js'

// Build a skillScores map that masters a fraction of a grade's skills.
function masterGrade(grade, fraction) {
  const skills = getSkillGraph().filter(s => s.grade === grade)
  const n = Math.ceil(skills.length * fraction)
  const scores = {}
  skills.slice(0, n).forEach(s => { scores[s.id] = 90 })
  return scores
}

describe('getEffectiveCeiling', () => {
  it('returns the same grade when little is mastered', () => {
    expect(getEffectiveCeiling(3, masterGrade(3, 0))).toBe(3)
    expect(getEffectiveCeiling(3, masterGrade(3, 0.3))).toBe(3)
  })

  it('bumps to grade+1 once enough of the grade is mastered', () => {
    expect(getEffectiveCeiling(3, masterGrade(3, 1))).toBe(4)
  })

  it('never exceeds Year 6', () => {
    expect(getEffectiveCeiling(6, masterGrade(6, 1))).toBe(6)
  })

  it('does not bump on an empty score map', () => {
    expect(getEffectiveCeiling(2, {})).toBe(2)
  })
})

describe('getRecommendations', () => {
  it('returns maths-only skills', () => {
    const recs = getRecommendations(3, {}, 5)
    expect(recs.length).toBeGreaterThan(0)
    recs.forEach(r => expect(r.id.startsWith('m_')).toBe(true))
  })

  it('skips already-mastered skills', () => {
    const all = getSkillGraph().filter(s => s.grade <= 3)
    const scores = {}
    all.forEach(s => { scores[s.id] = 95 }) // master everything up to grade 3
    const recs = getRecommendations(3, scores, 5)
    recs.forEach(r => expect(scores[r.id] ?? 0).toBeLessThan(80))
  })

  it('respects maxResults', () => {
    expect(getRecommendations(6, {}, 3).length).toBeLessThanOrEqual(3)
  })
})

describe('getSkillGraph', () => {
  it('is maths-only by default', () => {
    getSkillGraph().forEach(s => expect(s.subject).toMatch(/Math/))
  })
})
