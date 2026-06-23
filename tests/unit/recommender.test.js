import { describe, it, expect } from 'vitest'
import { getEffectiveCeiling, getRecommendations, getSkillGraph } from '../../lib/recommender.js'
import { SKILL_ID_MAP } from '../../lib/skillNames.js'

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

  it('does not bump on an empty score map', () => {
    expect(getEffectiveCeiling(2, {})).toBe(2)
  })

  it('accepts the legacy numeric 3rd arg (readyFraction)', () => {
    expect(getEffectiveCeiling(3, masterGrade(3, 1), 0.7)).toBe(4)
  })

  // ── Reach: placement floor + climbing past Year 6 ──────────────────────────
  it('jumps straight to the AI placement floor', () => {
    // Enrolled Y5, estimated Y8 → engine works at Y8 even with no mastery.
    expect(getEffectiveCeiling(5, {}, { placementFloor: 8 })).toBe(8)
  })

  it('ignores a placement floor at or below the enrolled grade', () => {
    expect(getEffectiveCeiling(5, {}, { placementFloor: 4 })).toBe(5)
    expect(getEffectiveCeiling(5, {}, { placementFloor: 0 })).toBe(5)
  })

  it('clamps the placement floor to Year 12', () => {
    expect(getEffectiveCeiling(5, {}, { placementFloor: 20 })).toBe(12)
  })

  it('mastery progression can now climb past Year 6', () => {
    // Master all of Year 6 (curated) → unlock Year 7.
    expect(getEffectiveCeiling(6, masterGrade(6, 1))).toBe(7)
  })

  it('takes the higher of mastery progression and placement floor', () => {
    // Placement says 8, but they have not mastered anything → floor wins.
    expect(getEffectiveCeiling(5, {}, { placementFloor: 8 })).toBe(8)
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

  it('surfaces Years 7–12 skills at a high effective grade', () => {
    // At working grade 8, the top recommendation should be a Year 8 skill, and
    // such skills (from SKILL_ID_MAP) must be reachable at all.
    const recs = getRecommendations(8, {}, 8)
    expect(recs.length).toBeGreaterThan(0)
    expect(recs.some(r => r.grade === 8)).toBe(true)
    // The highest-scored rec should be at the working grade (ZPD prioritises it).
    expect(recs[0].grade).toBe(8)
    // All recs are real skills in the taxonomy.
    recs.forEach(r => expect(SKILL_ID_MAP[r.id] || r.id.startsWith('m_')).toBeTruthy())
  })

  it('keeps lower-grade skills available below the working grade (gap-fill)', () => {
    const recs = getRecommendations(8, {}, 50)
    expect(recs.some(r => r.grade < 8)).toBe(true)
  })

  it('Prep–6 recommendations are unaffected (still curated graph)', () => {
    const recs = getRecommendations(3, {}, 5)
    recs.forEach(r => expect(r.grade).toBeLessThanOrEqual(4)) // grade ≤ studentGrade+1 in curated set
  })
})

describe('getSkillGraph', () => {
  it('is maths-only by default', () => {
    getSkillGraph().forEach(s => expect(s.subject).toMatch(/Math/))
  })
})
