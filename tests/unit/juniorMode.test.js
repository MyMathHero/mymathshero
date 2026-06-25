import { describe, it, expect } from 'vitest'
import {
  isJuniorGrade, usesJuniorDiagnostic, shouldAutoNarrate,
  JUNIOR_WORLDS, worldForCategory, categoriesForWorld,
  JUNIOR_DIAGNOSTIC_LENGTH,
} from '../../lib/juniorMode.js'
import { SKILL_CATEGORIES } from '../../lib/skillNames.js'

describe('isJuniorGrade (Prep–3)', () => {
  it('Prep–3 are junior, 4+ are standard', () => {
    [0, 1, 2, 3].forEach(g => expect(isJuniorGrade(g)).toBe(true))
    ;[4, 5, 6, 9, 12].forEach(g => expect(isJuniorGrade(g)).toBe(false))
  })
  it('accepts string/label grades', () => {
    expect(isJuniorGrade('Prep')).toBe(true)
    expect(isJuniorGrade('Year 2')).toBe(true)
    expect(isJuniorGrade('Year 4')).toBe(false)
    expect(isJuniorGrade('3')).toBe(true)
  })
  it('defaults unknown to standard', () => {
    expect(isJuniorGrade(undefined)).toBe(false)
    expect(isJuniorGrade('???')).toBe(false)
  })
})

describe('usesJuniorDiagnostic (Prep–2)', () => {
  it('Prep–2 use the short visual diagnostic; Grade 3 uses the big one', () => {
    [0, 1, 2].forEach(g => expect(usesJuniorDiagnostic(g)).toBe(true))
    expect(usesJuniorDiagnostic(3)).toBe(false)
    expect(usesJuniorDiagnostic(4)).toBe(false)
  })
  it('junior diagnostic is 10 questions', () => {
    expect(JUNIOR_DIAGNOSTIC_LENGTH).toBe(10)
  })
})

describe('shouldAutoNarrate', () => {
  it('matches junior mode boundary', () => {
    expect(shouldAutoNarrate(0)).toBe(true)
    expect(shouldAutoNarrate(3)).toBe(true)
    expect(shouldAutoNarrate(4)).toBe(false)
  })
})

describe('worlds', () => {
  it('every world maps to real SKILL_CATEGORIES keys', () => {
    for (const w of JUNIOR_WORLDS) {
      expect(w.categories.length).toBeGreaterThan(0)
      for (const c of w.categories) {
        expect(SKILL_CATEGORIES[c], `${w.id} -> ${c}`).toBeDefined()
      }
    }
  })
  it('worldForCategory resolves a known category and null for unknown', () => {
    expect(worldForCategory('number_sense')).not.toBeNull()
    expect(worldForCategory('geometry')?.id).toBe('shape_adventure')
    expect(worldForCategory('not_a_category')).toBeNull()
  })
  it('categoriesForWorld round-trips', () => {
    expect(categoriesForWorld('counting_jungle')).toContain('number_sense')
    expect(categoriesForWorld('nope')).toEqual([])
  })
  it('world ids are unique', () => {
    const ids = JUNIOR_WORLDS.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
