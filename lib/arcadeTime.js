// Shared arcade time helpers.
//
// Daily arcade limits reset at midnight Australian Eastern time (AEST/AEDT),
// not UTC. This returns the most recent AEST midnight as a UTC Date so it can
// be used directly in MongoDB `startedAt` range queries. `Australia/Sydney`
// carries the correct DST offset (+10 or +11) automatically.
export function getAESTMidnightUTC() {
  const now = new Date()
  // Get today's calendar date *in Sydney*.
  const aestString = now.toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  // en-AU formats as DD/MM/YYYY.
  const [day, month, year] = aestString.split('/')
  // Construct midnight at the Sydney offset. Using a fixed +10:00 here would be
  // wrong during DST, so derive the real offset for that calendar day instead.
  const offsetMinutes = getSydneyOffsetMinutes(
    new Date(`${year}-${month}-${day}T00:00:00Z`)
  )
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return new Date(`${year}-${month}-${day}T00:00:00${sign}${hh}:${mm}`)
}

// Returns Sydney's UTC offset in minutes for a given instant (handles DST).
function getSydneyOffsetMinutes(date) {
  // Compare the same instant rendered as Sydney vs UTC wall-clock.
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const syd = new Date(date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }))
  return Math.round((syd.getTime() - utc.getTime()) / 60000)
}

// ── Arcade time packs (1 Jul 2026) ───────────────────────────────────────────
// Students buy PLAY TIME with coins instead of unlocking individual games. Each
// pack credits `minutes` of arcade time for `coins`. Keyed by minute count so
// the client sends `pack: '5'` / `pack: '10'`.
export const TIME_PACKS = {
  '5': { minutes: 5, coins: 100 },
  '10': { minutes: 10, coins: 200 },
}

export function timePackCost(pack) {
  return TIME_PACKS[String(pack)]?.coins ?? null
}

export function timePackMinutes(pack) {
  return TIME_PACKS[String(pack)]?.minutes ?? null
}
