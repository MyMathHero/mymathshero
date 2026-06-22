import { describe, it, expect } from 'vitest'
import {
  MANIPULATIVES, normaliseManipulative, isValidManipulative, toolForSkill,
} from '../../lib/manipulatives.js'

describe('normaliseManipulative', () => {
  it('maps fraction synonyms to pizza', () => {
    for (const v of ['fractions', 'fraction', 'pizza', 'pie', 'Fractions', 'PIE']) {
      expect(normaliseManipulative(v)).toBe(MANIPULATIVES.PIZZA)
    }
  })
  it('maps number-line synonyms', () => {
    for (const v of ['numberline', 'number line', 'number-line', 'kangaroo']) {
      expect(normaliseManipulative(v)).toBe(MANIPULATIVES.NUMBER_LINE)
    }
  })
  it('maps ten-frame synonyms', () => {
    for (const v of ['tenframe', 'ten frame', 'ten-frame', 'counting', 'count']) {
      expect(normaliseManipulative(v)).toBe(MANIPULATIVES.TEN_FRAME)
    }
  })
  it('returns null for junk / empty / non-strings', () => {
    expect(normaliseManipulative('banana')).toBeNull()
    expect(normaliseManipulative('')).toBeNull()
    expect(normaliseManipulative(null)).toBeNull()
    expect(normaliseManipulative(42)).toBeNull()
  })
})

describe('isValidManipulative', () => {
  it('accepts the three canonical keys only', () => {
    expect(isValidManipulative('pizza')).toBe(true)
    expect(isValidManipulative('numberline')).toBe(true)
    expect(isValidManipulative('tenframe')).toBe(true)
    expect(isValidManipulative('xyz')).toBe(false)
  })
})

describe('toolForSkill', () => {
  it('prefers a specific skill mapping (counting → tenframe)', () => {
    expect(toolForSkill({ skillId: 'm_prep_count10', strand: 'Number' })).toBe(MANIPULATIVES.TEN_FRAME)
  })
  it('falls back to strand mapping', () => {
    expect(toolForSkill({ strand: 'Fractions' })).toBe(MANIPULATIVES.PIZZA)
    expect(toolForSkill({ strand: 'Division' })).toBe(MANIPULATIVES.NUMBER_LINE)
  })
  it('returns null for unknown skill + strand, or no args', () => {
    expect(toolForSkill({ skillId: 'm_9_unknown', strand: 'Geometry' })).toBeNull()
    expect(toolForSkill()).toBeNull()
  })
})
