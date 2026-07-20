// ── Founding-Family invite: shared helpers ───────────────────────────────────
// The waitlist → founding-family flow. Each invited waitlister gets a unique,
// unguessable token; only that token unlocks the founding offer at /join. This
// file is the single source of truth for the token + the human-readable offer
// terms (so the email, the landing page, and checkout never drift apart).

import crypto from 'crypto'

// A per-person invite token (unguessable, URL-safe). Stored on the waitlist
// record; the invite link is /join?invite=<token>.
export function makeInviteToken() {
  return crypto.randomBytes(24).toString('base64url')
}

// Human-readable offer terms — shown in the email + on /join. Keep in sync with
// STRIPE_CONFIG.founding (trialDays: 30, foundingMonthly $19.99, then premium
// $24.99 after year 1).
export const FOUNDING_OFFER = {
  freeMonths: 1,
  introMonthly: '$19.99',
  standardMonthly: '$24.99',
  introTermMonths: 12, // $19.99 holds for the first year, then $24.99
  headline: 'One month free, then founding-family pricing',
  bullets: [
    'Your first month is completely free',
    'Then just $19.99/month for your first year (normally $24.99)',
    'Full access to Hero — your child’s personal AI maths tutor',
    'Locked-in founding-family rate for as long as you stay',
  ],
}

// Absolute join URL for a token.
export function joinUrl(token, base) {
  const b = base || process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au'
  return `${b}/join?invite=${encodeURIComponent(token)}`
}
