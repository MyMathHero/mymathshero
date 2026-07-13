import { describe, it, expect } from 'vitest'
import { getCurriculumRef, buildCurriculumBlock } from '../../lib/curriculumRef.js'

describe('getCurriculumRef', () => {
  it('gives grade-bounded number scope for the Number family', () => {
    const g3 = getCurriculumRef('fractions', 3)
    expect(g3.strand).toBe('Number')
    expect(g3.range).toMatch(/unit fractions/i)      // Y3 = unit fractions
    const g6 = getCurriculumRef('fractions', 6)
    expect(g6.range).toMatch(/integers|negative|order of operations/i)
  })

  it('scopes measurement, space and statistics by grade', () => {
    expect(getCurriculumRef('measurement', 3).strand).toBe('Measurement')
    expect(getCurriculumRef('geometry', 3).strand).toBe('Space')
    expect(getCurriculumRef('statistics', 3).strand).toBe('Statistics and Probability')
  })

  it('handles senior topics (trig/calculus) at the right grades', () => {
    expect(getCurriculumRef('trigonometry', 9).scope).toMatch(/sine|cosine|tangent/i)
    expect(getCurriculumRef('calculus', 11).strand).toBe('Calculus')
  })

  it('returns null for unknown grade, and a strand-only hint when no grade entry', () => {
    expect(getCurriculumRef('fractions', 99)).toBeNull()
    expect(getCurriculumRef('nonsense_category', 3)).toBeNull()
  })

  it('is additive: money maps to Number with change scope', () => {
    const m = getCurriculumRef('money', 3)
    expect(m.strand).toBe('Number')
    expect(m.scope).toMatch(/change/i)
  })
})

describe('buildCurriculumBlock', () => {
  it('produces an in-level prompt block', () => {
    const block = buildCurriculumBlock('fractions', 3)
    expect(block).toMatch(/ACARA/)
    expect(block).toMatch(/Stay within/)
  })
  it('returns empty string (unchanged prompt) when there is no usable ref', () => {
    expect(buildCurriculumBlock('fractions', 99)).toBe('')
    expect(buildCurriculumBlock('nonsense', 3)).toBe('')
  })
})
