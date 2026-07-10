// Hero Arcade Card number — a unique, stable 16-digit membership number per
// student. Generated once and stored on the child (children.arcadeCardNumber),
// so it never changes and can be used to track / reference a student later.
//
// Format: 4 groups of 4 digits, e.g. "2500 7250 1025 8888". The first group is
// a fixed brand prefix (2500 = "HERO") so all cards look like a family; the rest
// is random. Callers must ensure uniqueness against the DB (see generateUnique).

export const CARD_PREFIX = '2500' // brand prefix for every Hero Arcade Card

// Format 16 raw digits into "#### #### #### ####".
export function formatCardNumber(raw16) {
  const d = String(raw16 || '').replace(/\D/g, '').padStart(16, '0').slice(0, 16)
  return d.replace(/(.{4})(.{4})(.{4})(.{4})/, '$1 $2 $3 $4')
}

// One random candidate (prefix + 12 random digits), formatted.
export function randomCardNumber() {
  let rest = ''
  for (let i = 0; i < 12; i++) rest += Math.floor(Math.random() * 10)
  return formatCardNumber(CARD_PREFIX + rest)
}

// Generate a card number that isn't already taken. `exists(num)` returns a
// promise<boolean>. Tries a handful of times, then falls back to a time-seeded
// value (collision-vanishingly-unlikely) so it never hangs.
export async function generateUniqueCardNumber(exists) {
  for (let i = 0; i < 8; i++) {
    const candidate = randomCardNumber()
    // eslint-disable-next-line no-await-in-loop
    if (!(await exists(candidate))) return candidate
  }
  const seeded = CARD_PREFIX + String(Date.now()).slice(-12).padStart(12, '0')
  return formatCardNumber(seeded)
}

// "MEMBER SINCE" label from a join date. e.g. "JUL 2026".
export function memberSince(createdAt) {
  if (!createdAt) return null
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }).toUpperCase()
}
