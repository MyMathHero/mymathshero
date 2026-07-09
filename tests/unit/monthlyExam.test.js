import { describe, it, expect } from 'vitest'
import {
  EXAM_CYCLE_MS, nextExamDueAt, isExamDue, daysUntilExam,
} from '../../lib/monthlyExam.js'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-07-08T00:00:00Z').getTime()

describe('nextExamDueAt', () => {
  it('first exam is due 30 days after join', () => {
    const joined = NOW - 10 * DAY
    expect(nextExamDueAt(joined, null, NOW)).toBe(joined + EXAM_CYCLE_MS)
  })
  it('after taking one, due 30 days after the last completion', () => {
    const joined = NOW - 60 * DAY
    const lastExam = NOW - 5 * DAY
    expect(nextExamDueAt(joined, lastExam, NOW)).toBe(lastExam + EXAM_CYCLE_MS)
  })
})

describe('isExamDue', () => {
  it('not due within the first 30 days', () => {
    expect(isExamDue(NOW - 10 * DAY, null, NOW)).toBe(false)
  })
  it('due once 30 days have passed since join', () => {
    expect(isExamDue(NOW - 31 * DAY, null, NOW)).toBe(true)
  })
  it('stays due (sticky) long after the deadline if never completed', () => {
    expect(isExamDue(NOW - 200 * DAY, null, NOW)).toBe(true)
  })
  it('not due right after completing one', () => {
    expect(isExamDue(NOW - 90 * DAY, NOW - 2 * DAY, NOW)).toBe(false)
  })
  it('due again 30 days after the last completion', () => {
    expect(isExamDue(NOW - 200 * DAY, NOW - 31 * DAY, NOW)).toBe(true)
  })
})

describe('daysUntilExam', () => {
  it('counts down, floors at 0 when due', () => {
    expect(daysUntilExam(NOW - 10 * DAY, null, NOW)).toBe(20)
    expect(daysUntilExam(NOW - 40 * DAY, null, NOW)).toBe(0)
  })
})
