import { describe, it, expect } from 'vitest'
import {
  isFirstWeeks, dailyTaskQuestionCount, todayKeyAEST, isTaskDoneToday, needsNewTask,
  FIRST_WEEKS_MS,
} from '../../lib/dailyTask.js'

const NOW = new Date('2026-07-04T02:00:00Z').getTime()

describe('isFirstWeeks', () => {
  it('true when account is younger than 3 weeks, missing, or invalid', () => {
    expect(isFirstWeeks(undefined, NOW)).toBe(true)
    expect(isFirstWeeks('not-a-date', NOW)).toBe(true)
    expect(isFirstWeeks(new Date(NOW - 5 * 24 * 3600 * 1000), NOW)).toBe(true)
  })
  it('false once older than 3 weeks', () => {
    expect(isFirstWeeks(new Date(NOW - FIRST_WEEKS_MS - 1000), NOW)).toBe(false)
  })
  it('boundary is exclusive at exactly 3 weeks', () => {
    expect(isFirstWeeks(new Date(NOW - FIRST_WEEKS_MS), NOW)).toBe(false)
  })
})

describe('dailyTaskQuestionCount', () => {
  const NEW = new Date(NOW - 3 * 24 * 3600 * 1000)      // first 3 weeks
  const OLD = new Date(NOW - 40 * 24 * 3600 * 1000)     // after 3 weeks
  it('first 3 weeks: Prep–Y2=10, Y3–4=15, Y5–6=20', () => {
    expect(dailyTaskQuestionCount(0, NEW, NOW)).toBe(10)
    expect(dailyTaskQuestionCount(2, NEW, NOW)).toBe(10)
    expect(dailyTaskQuestionCount(3, NEW, NOW)).toBe(15)
    expect(dailyTaskQuestionCount(4, NEW, NOW)).toBe(15)
    expect(dailyTaskQuestionCount(5, NEW, NOW)).toBe(20)
    expect(dailyTaskQuestionCount(6, NEW, NOW)).toBe(20)
  })
  it('after 3 weeks: Prep–Y2=15, Y3–4=20, Y5–6=25', () => {
    expect(dailyTaskQuestionCount(1, OLD, NOW)).toBe(15)
    expect(dailyTaskQuestionCount(3, OLD, NOW)).toBe(20)
    expect(dailyTaskQuestionCount(6, OLD, NOW)).toBe(25)
  })
})

describe('todayKeyAEST', () => {
  it('formats as yyyy-mm-dd', () => {
    expect(todayKeyAEST(new Date('2026-07-04T02:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isTaskDoneToday / needsNewTask', () => {
  const today = todayKeyAEST(new Date(NOW))
  it('done only when today AND done=true', () => {
    expect(isTaskDoneToday(null, new Date(NOW))).toBe(false)
    expect(isTaskDoneToday({ date: today, done: false }, new Date(NOW))).toBe(false)
    expect(isTaskDoneToday({ date: today, done: true }, new Date(NOW))).toBe(true)
    expect(isTaskDoneToday({ date: '2000-01-01', done: true }, new Date(NOW))).toBe(false)
  })
  it('needs a new task when missing or from a previous day', () => {
    expect(needsNewTask(null, new Date(NOW))).toBe(true)
    expect(needsNewTask({ date: '2000-01-01' }, new Date(NOW))).toBe(true)
    expect(needsNewTask({ date: today, done: false }, new Date(NOW))).toBe(false)
  })
})
