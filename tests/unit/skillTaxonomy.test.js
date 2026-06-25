import { describe, it, expect } from 'vitest'
import { SKILL_ID_MAP, SKILL_CATEGORIES, getSkillInfo } from '../../lib/skillNames.js'

const ids = Object.keys(SKILL_ID_MAP)
const gradeOf = (id) => parseInt(id.match(/^m_(\d+)_/)?.[1] ?? '-1', 10)

describe('SKILL_ID_MAP taxonomy', () => {
  it('every id is a well-formed maths skill id (m_<grade>_<name>)', () => {
    for (const id of ids) {
      expect(id, id).toMatch(/^m_\d+_[a-z0-9_]+$/)
    }
  })

  it('every skill references a real category', () => {
    for (const [id, info] of Object.entries(SKILL_ID_MAP)) {
      expect(SKILL_CATEGORIES[info.category], `${id} -> ${info.category}`).toBeDefined()
      expect(typeof info.name).toBe('string')
      expect(info.name.length).toBeGreaterThan(0)
    }
  })

  // Prep (grade 0) now has m_0_* skills in SKILL_ID_MAP for Junior Mode.
  it('covers every grade from Prep (0) through Year 12', () => {
    for (let g = 0; g <= 12; g++) {
      const count = ids.filter(id => gradeOf(id) === g).length
      expect(count, `grade ${g} should have skills`).toBeGreaterThan(0)
    }
  })

  it('Years 7–12 each have a meaningful number of skills', () => {
    for (let g = 7; g <= 12; g++) {
      const count = ids.filter(id => gradeOf(id) === g).length
      expect(count, `grade ${g} skill count`).toBeGreaterThanOrEqual(8)
    }
  })

  it('skill ids are unique', () => {
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getSkillInfo resolves a name and category for every skill', () => {
    for (const id of ids) {
      const info = getSkillInfo(id)
      expect(info, id).not.toBeNull()
      expect(info.name.length).toBeGreaterThan(0)
      expect(info.categoryLabel.length).toBeGreaterThan(0)
    }
  })
})
