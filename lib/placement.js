/**
 * MyMathsHero placement engine.
 *
 * Fuses three signals to estimate a student's TRUE working level after the
 * diagnostic, rather than trusting the enrolled grade alone:
 *   1. Diagnostic results (per-question correct + difficulty level)
 *   2. Response speed (fast + correct = the "too easy / bored" pilot signal)
 *   3. Parent insight collected at signup (perceived level + confidence)
 *
 * `summariseDiagnostic` is pure and unit-tested. `estimateLevel` calls the
 * strongest model via OpenRouter and ALWAYS falls back to a deterministic rule
 * so placement can never fail (a 500 here would block the whole diagnostic).
 */

// Per-result weight by difficulty level relative to the student's grade.
// Mirrors levelWeight() in app/api/student/diagnostic/route.js.
function levelWeight(level) {
  if (level === 'above') return 1.5
  if (level === 'below') return 0.6
  return 1.0
}

// Threshold (ms) under which a CORRECT answer counts as "fast" — the pilot
// student answered ~60 questions in <3min, i.e. correct answers in a few seconds.
const FAST_MS = 5000

function median(nums) {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

/**
 * Reduce raw diagnostic results into the aggregate signals the estimator needs.
 * results: [{ skillId, correct, timeTakenMs, level }]
 */
export function summariseDiagnostic(results = []) {
  const valid = Array.isArray(results) ? results.filter(r => r && r.skillId) : []

  let atCorrect = 0, atTotal = 0
  let aboveCorrect = 0, aboveTotal = 0
  let belowCorrect = 0, belowTotal = 0
  let fastCorrect = 0, correctCount = 0
  const times = []
  const perSkill = {}

  for (const r of valid) {
    const lvl = r.level || 'at'
    if (lvl === 'above') { aboveTotal++; if (r.correct) aboveCorrect++ }
    else if (lvl === 'below') { belowTotal++; if (r.correct) belowCorrect++ }
    else { atTotal++; if (r.correct) atCorrect++ }

    if (typeof r.timeTakenMs === 'number' && r.timeTakenMs > 0) times.push(r.timeTakenMs)
    if (r.correct) {
      correctCount++
      if (typeof r.timeTakenMs === 'number' && r.timeTakenMs > 0 && r.timeTakenMs < FAST_MS) fastCorrect++
    }

    const s = perSkill[r.skillId] || (perSkill[r.skillId] = { wCorrect: 0, wTotal: 0 })
    const w = levelWeight(lvl)
    s.wTotal += w
    if (r.correct) s.wCorrect += w
  }

  const rate = (c, t) => (t > 0 ? c / t : 0)
  return {
    total: valid.length,
    atAccuracy: rate(atCorrect, atTotal),
    aboveAccuracy: rate(aboveCorrect, aboveTotal),
    belowAccuracy: rate(belowCorrect, belowTotal),
    sawAbove: aboveTotal > 0,
    medianTimeMs: median(times),
    // Share of CORRECT answers that were fast — the boredom/ceiling signal.
    fastCorrectRate: rate(fastCorrect, correctCount),
    perSkillWeightedAccuracy: Object.fromEntries(
      Object.entries(perSkill).map(([id, s]) => [id, s.wTotal > 0 ? s.wCorrect / s.wTotal : 0])
    ),
  }
}

const PARENT_WEIGHT = { low: 0, medium: 1, high: 2 }

/**
 * Deterministic fallback used when the AI call is unavailable or errors.
 * Conservative: bumps at most one grade above entered unless the evidence is
 * strong, and respects parent insight as a tiebreak. Never throws.
 */
export function fallbackEstimate({ enteredGrade, summary, parentInsight }) {
  const g = Number.isFinite(enteredGrade) ? enteredGrade : 3
  const { aboveAccuracy = 0, atAccuracy = 0, sawAbove = false, fastCorrectRate = 0 } = summary || {}
  const perceived = parentInsight?.perceivedLevel || 'at'
  const conf = PARENT_WEIGHT[parentInsight?.confidence] ?? 1

  let estimatedGrade = g
  let confidence = 'low'

  // Strong above-grade evidence + answering fast = genuine ceiling above grade.
  if (sawAbove && aboveAccuracy >= 0.8 && fastCorrectRate >= 0.5) {
    estimatedGrade = g + 1
    confidence = 'medium'
  } else if (sawAbove && aboveAccuracy >= 0.6) {
    estimatedGrade = g + 1
    confidence = 'low'
  }

  // Parent says "above" with confidence and at-grade was easy → nudge up.
  if (perceived === 'above' && conf >= 1 && atAccuracy >= 0.8 && estimatedGrade === g) {
    estimatedGrade = g + 1
    confidence = 'low'
  }
  // Parent says "below" with confidence and at-grade was weak → place at grade
  // (we never seed below the enrolled grade here; the per-skill scores handle gaps).
  if (perceived === 'below' && conf >= 2 && atAccuracy < 0.4) {
    confidence = 'low'
  }

  const rationale = estimatedGrade > g
    ? `Diagnostic results suggest performance above the enrolled level — strong, fast answers on harder questions. More advanced content is recommended.`
    : `Diagnostic results are consistent with the enrolled year level. Content will adapt as the student practises.`

  return { estimatedGrade, confidence, rationale, source: 'fallback' }
}

/**
 * Estimate the student's true working level. Calls the strongest model
 * (anthropic/claude-opus-4-8) via OpenRouter; falls back deterministically on
 * any failure. Returns { estimatedGrade, confidence, rationale, source }.
 */
export async function estimateLevel({ enteredGrade, studentName, summary, parentInsight }) {
  const fallback = fallbackEstimate({ enteredGrade, summary, parentInsight })
  if (!process.env.OPENROUTER_API_KEY) return fallback

  const gLabel = enteredGrade === 0 ? 'Prep/Foundation' : `Year ${enteredGrade}`
  const prompt = [
    `You are an expert Australian primary maths assessor. Estimate a student's TRUE working maths level from their diagnostic.`,
    `Student is enrolled in ${gLabel}. Name: ${studentName || 'the student'}.`,
    ``,
    `Diagnostic signals:`,
    `- At-grade accuracy: ${(summary.atAccuracy * 100).toFixed(0)}%`,
    `- Above-grade accuracy: ${summary.sawAbove ? (summary.aboveAccuracy * 100).toFixed(0) + '%' : 'not probed'}`,
    `- Below-grade accuracy: ${(summary.belowAccuracy * 100).toFixed(0)}%`,
    `- Median response time: ${(summary.medianTimeMs / 1000).toFixed(1)}s`,
    `- Share of correct answers answered quickly (<5s): ${(summary.fastCorrectRate * 100).toFixed(0)}%`,
    ``,
    `Parent insight at signup:`,
    `- Parent believes the child performs: ${parentInsight?.perceivedLevel || 'at'} grade level`,
    `- Parent confidence: ${parentInsight?.confidence || 'medium'}`,
    ``,
    `Fast + correct answers on at/above-grade questions indicate the work is too easy and the true level is higher.`,
    `Weigh parent insight by their stated confidence. Be calibrated — only place above the enrolled grade when evidence supports it.`,
    `Return ONLY JSON: {"estimatedGrade": <integer 0-12>, "confidence": "low"|"medium"|"high", "rationale": "<2-3 sentences written to the PARENT>"}`,
  ].join('\n')

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au',
        'X-Title': 'MyMathsHero Placement',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-opus-4-8',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
      }),
    })
    if (!res.ok) return fallback
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) return fallback
    const json = JSON.parse(raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim())
    const estimatedGrade = Math.max(0, Math.min(12, Math.round(Number(json.estimatedGrade))))
    if (!Number.isFinite(estimatedGrade)) return fallback
    return {
      estimatedGrade,
      confidence: ['low', 'medium', 'high'].includes(json.confidence) ? json.confidence : 'medium',
      rationale: typeof json.rationale === 'string' && json.rationale.trim() ? json.rationale.trim() : fallback.rationale,
      source: 'ai',
    }
  } catch {
    return fallback
  }
}

/**
 * Conservative per-skill seed nudge. Given the placement estimate and the
 * base starting score the diagnostic computed for a skill, returns a (possibly)
 * raised score. Only nudges UP, only for at/above-grade skills, only when the
 * estimate exceeds the entered grade — and never past a mastery seed. A wrong
 * estimate therefore can't lock a child out; Part 1 adaptive serving keeps
 * self-correcting from real answers.
 */
export function nudgeSkillScore(baseScore, { enteredGrade, estimatedGrade, confidence }, skillGrade) {
  if (!(estimatedGrade > enteredGrade)) return baseScore
  if (skillGrade < enteredGrade) return baseScore // don't lift below-grade gaps
  const bump = confidence === 'high' ? 12 : confidence === 'medium' ? 8 : 4
  return Math.min(85, Math.max(baseScore, baseScore + bump))
}
