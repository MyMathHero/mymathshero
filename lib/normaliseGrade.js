// Convert any incoming grade value to an integer 0–6 (0 = Prep, 6 = Year 6).
//
// Accepts: numbers (3, 3.5), numeric strings ('3'), labels ('Year 3', 'Grade 4',
// 'Prep'). Anything else falls back to the safe default of 3.
//
// Defence in depth: every API route that accepts a `grade` from a client should
// pass it through this before doing anything with it. The DB has historical
// rows where `grade` is the string 'Year 4' — those break Number queries.
export function normaliseGrade(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(6, Math.trunc(raw)))
  }
  if (typeof raw === 'string') {
    if (raw.trim().toLowerCase() === 'prep') return 0
    const digits = raw.replace(/\D/g, '')
    if (digits) {
      const n = parseInt(digits, 10)
      if (Number.isFinite(n)) return Math.max(0, Math.min(6, n))
    }
  }
  return 3
}
