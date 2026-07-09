/**
 * Hero Speed Challenge — pure helpers (unit-tested, no DB).
 *
 * A 1v1 timed maths race. Students match a random ONLINE peer of a similar
 * level; if nobody is online an AI opponent plays instead. Strictly no chat —
 * only first name + avatar are ever shared with the other player. Winning pays
 * 20 coins (see CHALLENGE_WIN_COINS).
 *
 * Grade 0 = Prep. Younger students get a shorter race (10 Q); older get 15.
 */

export const CHALLENGE_WIN_COINS = 20

// First name only — never a full name or the (self-only) uploaded photo.
export function displayFirstName(name) {
  return String(name || 'Hero').trim().split(/\s+/)[0] || 'Hero'
}

// Questions per race by grade band (Prep–Y3 = 10, Y4+ = 15).
export function challengeQuestionCount(grade) {
  const g = Number(grade)
  return Number.isFinite(g) && g >= 4 ? 15 : 10
}

// Two students are "matchable" if their grades are within one year (ability
// proxy). Keeps races fair without needing a full rating system.
export function gradesMatch(a, b, tolerance = 1) {
  const ga = Number(a), gb = Number(b)
  if (!Number.isFinite(ga) || !Number.isFinite(gb)) return true
  return Math.abs(ga - gb) <= tolerance
}

// ── AI opponent ──────────────────────────────────────────────────────────────
// The AI opponent simulates a plausible human: it answers each question with a
// per-question accuracy and a think-time. Difficulty scales gently with grade so
// higher grades face a tougher bot. Deterministic when given a `rand` fn (for
// tests); defaults to Math.random.
export function aiAccuracy(grade) {
  const g = Number(grade) || 0
  // ~0.62 at Prep rising toward ~0.8 by Year 6, capped.
  return Math.min(0.8, 0.62 + g * 0.03)
}

// Milliseconds the AI "spends" on a question — a spread around a grade-based
// mean so it doesn't feel robotic. 3–12s range.
export function aiThinkMs(grade, rand = Math.random) {
  const base = 4500 - (Number(grade) || 0) * 150 // faster as grade rises
  const jitter = (rand() - 0.5) * 4000
  return Math.max(3000, Math.min(12000, Math.round(base + jitter)))
}

// Simulate the AI's whole run: an array of { correct } of length `count`.
export function simulateAiRun(grade, count, rand = Math.random) {
  const acc = aiAccuracy(grade)
  const out = []
  for (let i = 0; i < count; i++) out.push({ correct: rand() < acc })
  return out
}

// ── Result / winner ──────────────────────────────────────────────────────────
// Higher correct count wins; ties broken by faster total time. Returns
// 'player' | 'opponent' | 'tie'. Times in ms; missing time = Infinity (slowest).
export function decideWinner(player, opponent) {
  const pc = player?.correct ?? 0, oc = opponent?.correct ?? 0
  if (pc !== oc) return pc > oc ? 'player' : 'opponent'
  const pt = player?.timeMs ?? Infinity, ot = opponent?.timeMs ?? Infinity
  if (pt !== ot) return pt < ot ? 'player' : 'opponent'
  return 'tie'
}

// Coins a player earns from a result. Win = 20, tie/loss = 0 (participation is
// its own reward; per-question coins already accrue through the answer route).
export function challengeReward(outcome) {
  return outcome === 'player' ? CHALLENGE_WIN_COINS : 0
}

// Friendly result line, e.g. "You solved 12 questions with 90% accuracy."
export function resultSummary(correct, total) {
  const t = Math.max(1, Number(total) || 0)
  const pct = Math.round((Number(correct) || 0) / t * 100)
  return `You solved ${correct} question${correct === 1 ? '' : 's'} with ${pct}% accuracy.`
}
