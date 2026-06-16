// First-month-free offer helpers.
//
// The product runs a launch promo: a parent's first month is free Premium, then
// they are charged from the next month. We grant this WITHOUT a Stripe charge
// during the free month by stamping the parent record:
//   - plan: 'premium'
//   - freeTrialUntil: <Date 1 month out>
//   - freeTrialGranted: true
//   - accessBlocked: false
//
// When the month elapses, `resolveEffectivePlan` downgrades them to 'free' until
// they actually subscribe via Stripe (which sets plan through the webhook and
// clears freeTrialUntil). This keeps Stripe as the source of truth for *paid*
// state while letting the app grant a no-charge intro month.

export const FREE_TRIAL_DAYS = 30

// Is this parent currently inside an active app-granted free month?
export function isFreeTrialActive(parent, now = Date.now()) {
  if (!parent?.freeTrialUntil) return false
  const until = new Date(parent.freeTrialUntil).getTime()
  return Number.isFinite(until) && until > now
}

// Has an app-granted free month been set but already elapsed (and the parent
// has not since become a paying subscriber)?
export function isFreeTrialExpired(parent, now = Date.now()) {
  if (!parent?.freeTrialUntil) return false
  if (parent.subscribed === true) return false // a real subscription took over
  return new Date(parent.freeTrialUntil).getTime() <= now
}

// The plan the parent should be treated as RIGHT NOW. Stripe-paid plans win.
// An app-granted free month grants 'premium' until it expires; once expired
// (with no paid subscription) the parent falls back to 'free'.
export function resolveEffectivePlan(parent, now = Date.now()) {
  if (!parent) return 'free'
  // A live paid/trialing Stripe subscription is always authoritative.
  if (parent.subscribed === true && parent.plan && parent.plan !== 'free') {
    return parent.plan
  }
  // App-granted free month.
  if (parent.freeTrialUntil) {
    return isFreeTrialActive(parent, now) ? (parent.plan || 'premium') : 'free'
  }
  return parent.plan || 'free'
}

// Build the Mongo $set patch that grants a fresh free month from `from`.
export function buildFreeTrialGrant(from = new Date()) {
  const until = new Date(from)
  until.setDate(until.getDate() + FREE_TRIAL_DAYS)
  return {
    plan: 'premium',
    freeTrialUntil: until,
    freeTrialGranted: true,
    freeTrialGrantedAt: from,
    accessBlocked: false,
  }
}
