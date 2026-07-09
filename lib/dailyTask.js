/**
 * HERO Daily Task — pure helpers (unit-tested, no DB).
 *
 * On login HERO assigns a task based on the student's strengths/weaknesses.
 * Until it's done, the student is blocked from other categories + the arcade
 * ("Complete today's HERO task to unlock freestyle practice and rewards").
 *
 * The number of questions scales by grade AND by how long the account has
 * existed (a gentle ramp for the first 3 weeks), per the 1 Jul 2026 note:
 *
 *                First 3 weeks   After 3 weeks
 *   Prep–Year 2      10              15
 *   Year 3–Year 4    15              20
 *   Year 5–Year 6    20              25
 *
 * Grade 0 = Prep. The completion bonus lives in lib/coinRules.js (dailyTaskBonus).
 */

import { gradeBand } from './coinRules.js'

export const FIRST_WEEKS_MS = 21 * 24 * 60 * 60 * 1000 // 3 weeks

// True while the account is in its first 3 weeks (gentler question counts).
// `createdAt` may be a Date, an ISO string, or missing (treat as brand new).
export function isFirstWeeks(createdAt, now = Date.now()) {
  if (!createdAt) return true
  const created = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime()
  if (Number.isNaN(created)) return true
  return (now - created) < FIRST_WEEKS_MS
}

// Question count for today's task: grade band × account age.
export function dailyTaskQuestionCount(grade, createdAt, now = Date.now()) {
  const first = isFirstWeeks(createdAt, now)
  switch (gradeBand(grade)) {
    case 'prep-2': return first ? 10 : 15
    case '3-4': return first ? 15 : 20
    default: return first ? 20 : 25
  }
}

// AEST calendar date string (yyyy-mm-dd in Sydney) — the daily task resets on
// this boundary, matching the arcade's AEST reset.
export function todayKeyAEST(now = new Date()) {
  // en-CA gives yyyy-mm-dd; timeZone pins it to Sydney.
  return now.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
}

// Is the stored dailyTask state for TODAY and complete?
export function isTaskDoneToday(dailyTask, now = new Date()) {
  if (!dailyTask) return false
  return dailyTask.date === todayKeyAEST(now) && dailyTask.done === true
}

// Does a fresh task need to be generated (no task, or it's from a previous day)?
export function needsNewTask(dailyTask, now = new Date()) {
  if (!dailyTask) return true
  return dailyTask.date !== todayKeyAEST(now)
}
