/**
 * MyMathsHero coin economy — single source of truth (pure, unit-tested).
 *
 * Per the 1 July 2026 update the coin rules are:
 *   • Correct answer                → 10 coins
 *   • Correct WITH AI help          →  5 coins   (student used Ask Hero or Teach Me
 *                                                  on that question)
 *   • Wrong answer                  →  0 coins
 *   • End-of-session accuracy bonus → 85% → 10, 90% → 20, 100% → 30
 *   • Daily-task completion bonus   → Prep–Y2 → 20, Y3–Y4 → 30, Y5–Y6 → 50
 *   • Monthly-exam bonus            → 85% → 50, 90% → 80, 95% → 100
 *
 * XP (leaderboard ranking) is intentionally kept separate from coins and is not
 * changed by this file — see answer/route.js for XP. Everything here returns
 * plain numbers so it can be unit-tested with no DB.
 */

// ── Per-answer reward ────────────────────────────────────────────────────────
// `aiHelpUsed` is true when the student opened Ask Hero or the Teach Me tutor on
// this question before answering. A correct answer with help still rewards, but
// at half rate, so leaning on Hero is fine but earns less than solving solo.
export function coinsForAnswer({ correct, aiHelpUsed = false } = {}) {
  if (!correct) return 0
  return aiHelpUsed ? 5 : 10
}

// ── End-of-session accuracy bonus ────────────────────────────────────────────
// `accuracy` is a percentage 0–100 (correctCount / questionCount * 100).
// Tiers are inclusive of their lower bound; below 85% earns no bonus.
export function accuracyBonus(accuracy) {
  const a = Number(accuracy)
  if (!Number.isFinite(a)) return 0
  if (a >= 100) return 30
  if (a >= 90) return 20
  if (a >= 85) return 10
  return 0
}

// ── Grade banding for grade-scaled rewards ───────────────────────────────────
// Grade 0 = Prep. Bands: Prep–Y2 (0–2), Y3–Y4 (3–4), Y5–Y6 (5–6). Grades above
// 6 fall into the top band (launch caps enrolment at Y6, but stay safe).
export function gradeBand(grade) {
  const g = Number(grade)
  if (!Number.isFinite(g) || g <= 2) return 'prep-2'
  if (g <= 4) return '3-4'
  return '5-6'
}

// ── Daily-task completion bonus (Phase 3) ────────────────────────────────────
export function dailyTaskBonus(grade) {
  switch (gradeBand(grade)) {
    case 'prep-2': return 20
    case '3-4': return 30
    default: return 50
  }
}

// ── Avatar change cost ───────────────────────────────────────────────────────
// Flat coin cost to CHANGE the equipped avatar — the character itself or any
// cosmetic slot (cap, cape, background…). Charged only when the selection
// actually changes (re-selecting the same thing is free). 5–10 range; 5 for now.
export const AVATAR_CHANGE_COST = 5

// ── Monthly review-exam bonus (Phase 3) ──────────────────────────────────────
// `accuracy` is a percentage 0–100. Below 85% earns no bonus.
export function monthlyExamBonus(accuracy) {
  const a = Number(accuracy)
  if (!Number.isFinite(a)) return 0
  if (a >= 95) return 100
  if (a >= 90) return 80
  if (a >= 85) return 50
  return 0
}
