// Single source of truth for the launch date.
// Change LAUNCH_DATE_STRING below to update the countdown everywhere
// (coming-soon page, math countdown bar, any future widget).

// Launch month is public-facing now (no fixed day) — partner wants "September"
// without committing to an exact date, so we DON'T show a ticking countdown.
// LAUNCH_DATE is kept as an internal anchor (~1 Sep) for any date math.
export const LAUNCH_DATE_STRING = '2026-09-01T00:00:00+10:00'
export const LAUNCH_DATE = new Date(LAUNCH_DATE_STRING)
export const LAUNCH_DATE_DISPLAY = 'September 2026'

// Pure helper so consumers don't reimplement the diff math.
export function getTimeUntilLaunch(now = Date.now()) {
  const diff = LAUNCH_DATE.getTime() - now
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  }
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000)  / 60_000),
    seconds: Math.floor((diff % 60_000)     / 1000),
    done: false,
  }
}
