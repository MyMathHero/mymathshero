/**
 * Monthly Review Exam scheduling — pure helpers (unit-tested, no DB).
 *
 * Hero issues a review exam on a per-student ~monthly cycle, anchored to the
 * student's JOIN date (not a shared calendar month):
 *   • First exam becomes due ~30 days after they join.
 *   • Each subsequent exam is due ~30 days after the previous one completed.
 *   • If they MISS it (don't complete on time), it stays DUE — the moment they
 *     come back, the exam is waiting and blocks everything until finished.
 *
 * So "due" is sticky: once the cycle rolls over, `isExamDue` stays true until an
 * exam is completed, no matter how late.
 */

export const EXAM_CYCLE_MS = 30 * 24 * 60 * 60 * 1000 // ~1 month

// When is the student's NEXT exam due?
//   • Never taken one → 30 days after join (createdAt).
//   • Taken before → 30 days after the last completion.
// Missing dates default to "now" so a brand-new/legacy account isn't nagged
// instantly (it schedules the first exam 30 days out).
export function nextExamDueAt(createdAt, lastExamAt, now = Date.now()) {
  const base = lastExamAt
    ? toMs(lastExamAt)
    : (createdAt != null ? toMs(createdAt) : now)
  const anchor = Number.isFinite(base) ? base : now
  return anchor + EXAM_CYCLE_MS
}

// Is a review exam due right now? (Sticky — stays true once overdue until done.)
export function isExamDue(createdAt, lastExamAt, now = Date.now()) {
  return now >= nextExamDueAt(createdAt, lastExamAt, now)
}

// Days until the next exam (0 if due/overdue). For display.
export function daysUntilExam(createdAt, lastExamAt, now = Date.now()) {
  const due = nextExamDueAt(createdAt, lastExamAt, now)
  return Math.max(0, Math.ceil((due - now) / (24 * 60 * 60 * 1000)))
}

function toMs(d) {
  if (d instanceof Date) return d.getTime()
  const t = new Date(d).getTime()
  return Number.isNaN(t) ? NaN : t
}
