/**
 * Shared question/answer verifier — the single source of truth used by:
 *   1. the serving filter (verifierFlagged questions are withheld),
 *   2. the AI re-check & correct loop (/api/admin/recheck-questions),
 *   3. generation-time auto-verify (new questions verified before serving).
 *
 * It asks a strong model (Opus via OpenRouter) to solve a question BLIND — given
 * only the question + options, never the stored answer — then compares. A
 * disagreement means the stored answer is suspect.
 *
 * Pure-ish: the only side effect is the OpenRouter fetch. Never throws on bad
 * model output; returns a structured result the caller decides what to do with.
 */

const VERIFIER_MODEL = 'anthropic/claude-opus-4-8'
// Cheap screening model for the "screen then arbitrate" path (verifyQuestionCheap).
const SCREEN_MODEL = 'anthropic/claude-haiku-4-5'
// At/above this grade, ALWAYS use the full Opus verifier (no cheap screening).
// This is where the hard, error-prone maths lives (negative fractions, multi-step)
// and where we saw the real error rate — correctness matters more than cost.
const CHEAP_MAX_GRADE = 6

// Normalise an answer for comparison: strip leading letter prefixes ("A) ",
// "B.") — including accidental double prefixes — collapse whitespace, lowercase.
export function normaliseAnswer(s) {
  return String(s ?? '')
    .trim()
    .replace(/^([A-Da-d][).:\s]+)+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// Evaluate a single answer STRING to a real number, or null if it isn't cleanly
// numeric. Handles: integers/decimals, negatives, a leading unary minus, a
// single fraction "a/b", a mixed number "1 3/4" or "1 and 3/4", percentages
// ("50%" → 0.5), and $/unit noise around a number. Deliberately does NOT try to
// evaluate multi-operator expressions — an ANSWER is a value, not a sum.
export function evalNumericAnswer(s) {
  let t = normaliseAnswer(s)
  if (!t) return null
  // Strip currency, commas-as-thousands, and trailing units/words after the value.
  t = t.replace(/[$£€]/g, '').replace(/,/g, '').trim()
  // Percentage → fraction of 1.
  let pct = false
  if (/%$/.test(t)) { pct = true; t = t.replace(/%$/, '').trim() }

  const toNum = (str) => {
    const x = String(str).trim()
    if (x === '') return null
    // Mixed number: "1 3/4", "1 and 3/4", "-2 1/2". Require a real separator
    // (space or "and") between the whole part and the fraction, otherwise
    // "15/16" would be misread as the mixed number 1 + 5/16.
    const mixed = x.match(/^(-?\d+)\s+(?:and\s+)?(\d+)\/(\d+)$/)
    if (mixed) {
      const whole = parseInt(mixed[1], 10)
      const num = parseInt(mixed[2], 10)
      const den = parseInt(mixed[3], 10)
      if (den === 0) return null
      const sign = whole < 0 || /^-/.test(mixed[1]) ? -1 : 1
      return whole + sign * (num / den)
    }
    // Simple fraction: "a/b", "-a/b", "a/-b"
    const frac = x.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/)
    if (frac) {
      const den = parseFloat(frac[2])
      if (den === 0) return null
      return parseFloat(frac[1]) / den
    }
    // Plain number (may have leading unit words stripped already).
    const m = x.match(/^-?\d+(?:\.\d+)?$/)
    if (m) return parseFloat(x)
    // Number embedded with a unit: take the first signed number if the rest is
    // just a unit word (e.g. "5 km", "-3 apples").
    const emb = x.match(/^(-?\d+(?:\.\d+)?)\s*[a-z°]*$/)
    if (emb) return parseFloat(emb[1])
    return null
  }

  const n = toNum(t)
  if (n == null || !Number.isFinite(n)) return null
  return pct ? n / 100 : n
}

// True if two answers are the same NUMBER (fractions/decimals/mixed/percent all
// reconciled), within a small tolerance for floating-point.
export function numericallyEqual(a, b) {
  const na = evalNumericAnswer(a)
  const nb = evalNumericAnswer(b)
  if (na == null || nb == null) return false
  const diff = Math.abs(na - nb)
  // Relative tolerance for large values, absolute for small ones.
  return diff <= 1e-6 || diff <= 1e-6 * Math.max(Math.abs(na), Math.abs(nb))
}

// Do two answers mean the same thing? Compares by real numeric value first
// (so "-7/4", "-1.75" and "-1 3/4" all agree), then falls back to exact text and
// bare-option-letter matching for non-numeric answers.
export function answersAgree(modelAns, storedAns, options) {
  const a = normaliseAnswer(modelAns)
  const b = normaliseAnswer(storedAns)
  if (!a || !b) return false
  if (a === b) return true
  // Real numeric equality — the important fix for fraction/decimal mismatches.
  if (numericallyEqual(a, b)) return true
  // Model answered with just the option letter → map to that option's text.
  const letter = a.match(/^[a-d]$/)
  if (letter && Array.isArray(options)) {
    const idx = letter[0].charCodeAt(0) - 97
    const opt = options[idx]
    if (opt != null && (normaliseAnswer(opt) === b || numericallyEqual(opt, b))) return true
  }
  return false
}

// Visual questions can't be solved from text alone (the model can't see the
// picture/graph), so they must NEVER be auto-verified or flagged.
export function isVisualQuestion(q) {
  if (!q) return false
  // Only skip questions that ACTUALLY render a picture (junior visual bank).
  // Standard text questions that merely mention a shape/shading are NOT skipped —
  // the solver's needsImage check decides if they're genuinely image-dependent
  // (broken) or self-contained (answerable from the text).
  return q.mode === 'junior' || q.visual != null
}

// One blind solve via OpenRouter. Returns { answer, confident, needsImage } or
// throws on a transport/HTTP error (caller may retry).
//
// IMPORTANT: the model is REQUIRED to show its working first, then emit the JSON
// verdict last. Forcing a no-working answer made multi-step maths (e.g. chained
// negative-fraction arithmetic) unreliable — the exact case that let wrong
// answers pass. We parse the LAST JSON object in the reply as the verdict.
export async function solveBlind(q, { model = VERIFIER_MODEL } = {}) {
  const opts = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n')
  const prompt = [
    `You are a careful maths examiner. The student sees ONLY this text — NO image, diagram, shape, or graph is shown.`,
    `Step 1: Decide if this REQUIRES seeing a picture that isn't provided (e.g. "how many parts are shaded?" with no data given). If so, it needs an image.`,
    `Step 2: If it is answerable from the text, WORK IT OUT STEP BY STEP. Show every calculation. Do not skip steps. For fractions, compute exact values and keep track of signs carefully.`,
    `Step 3: Choose the option that exactly matches your computed result. If NONE of the options equals your result, still report your computed value as the answer and set confident to what you believe.`,
    ``,
    `Question: ${q.question}`,
    `Options:`,
    opts,
    ``,
    `Show your working, THEN on the final line output ONLY this JSON (nothing after it):`,
    `{"answer":"<the exact option text you chose, or your computed value if none match>","confident":true|false,"needsImage":true|false}`,
  ].join('\n')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'MMH Q-Verifier',
    },
    // More tokens now that we ask for working; temp 0 for determinism.
    body: JSON.stringify({ model, max_tokens: 900, temperature: 0, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
  const data = await res.json()
  const raw = (data.choices?.[0]?.message?.content || '').trim()
  const parsed = parseVerdict(raw)
  return { answer: parsed?.answer ?? '', confident: parsed?.confident !== false, needsImage: parsed?.needsImage === true }
}

// Pull the verdict JSON out of a reply that now contains working text first.
// We take the LAST {...} block (the verdict is emitted last) that parses.
function parseVerdict(raw) {
  const cleaned = String(raw || '').replace(/```(?:json)?/g, '')
  const matches = cleaned.match(/\{[^{}]*\}/g)
  if (matches) {
    for (let i = matches.length - 1; i >= 0; i--) {
      try { return JSON.parse(matches[i]) } catch { /* keep looking */ }
    }
  }
  // Fallback: a greedy single object anywhere.
  const m = cleaned.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch { /* ignore */ } }
  return null
}

// Group solve results into consensus buckets by numeric/text agreement and
// return the largest bucket + its representative answer. Lets us require a
// MAJORITY of independent solves rather than trusting a single pass.
function consensus(solves, options) {
  const buckets = [] // { answer, count }
  for (const s of solves) {
    const ans = s?.answer
    if (ans == null || ans === '') continue
    const hit = buckets.find(b => answersAgree(ans, b.answer, options))
    if (hit) hit.count++
    else buckets.push({ answer: ans, count: 1 })
  }
  buckets.sort((a, b) => b.count - a.count)
  return buckets[0] || { answer: '', count: 0 }
}

/**
 * Verify a question. Returns:
 *   { status: 'skipped' }                                   visual — not verifiable
 *   { status: 'ok' }                                        verifier agrees with stored
 *   { status: 'suspect', verifierAnswer, inOptions }        verifier disagrees
 *   { status: 'error', error }                              all attempts failed
 *
 * The verifier now solves the question MULTIPLE times (with working shown) and
 * requires a MAJORITY consensus, then compares that consensus to the stored
 * answer. `double:true` → up to 3 solves need 2-of-3 to agree (default, robust).
 * `double:false` → 2 solves, both must agree with each other (fast path used at
 * generation time). `inOptions` says whether the consensus answer matches one of
 * the options (→ auto-correctable) or not (→ broken question).
 */
export async function verifyQuestion(q, { model = VERIFIER_MODEL, double = true } = {}) {
  if (isVisualQuestion(q)) return { status: 'skipped', reason: 'visual' }
  if (!q?.question || !Array.isArray(q.options) || !q.correctAnswer) {
    return { status: 'suspect', verifierAnswer: '', inOptions: false, reason: 'malformed' }
  }

  const maxSolves = double ? 3 : 2
  const needed = double ? 2 : 2 // majority required to trust a verdict
  const solves = []
  let lastErr = null
  for (let i = 0; i < maxSolves; i++) {
    try { solves.push(await solveBlind(q, { model })) }
    catch (e) { lastErr = e }
  }
  if (solves.length === 0) return { status: 'error', error: lastErr?.message || 'no solves' }

  // Image-dependent if a majority say so (broken question — inOptions:false).
  const needsImageVotes = solves.filter(s => s.needsImage).length
  if (needsImageVotes >= needed || (solves.length < needed && needsImageVotes > 0)) {
    return { status: 'suspect', verifierAnswer: '', inOptions: false, reason: 'requires-unshown-visual' }
  }

  const top = consensus(solves, q.options)

  // Not enough agreement between independent solves → don't trust EITHER the
  // model or the stored answer blindly; only clear it if the stored answer is in
  // the winning bucket, otherwise flag as suspect (conservative).
  const majorityReached = top.count >= needed

  if (majorityReached && answersAgree(top.answer, q.correctAnswer, q.options)) {
    return { status: 'ok' }
  }
  // Even without a full majority, if every non-empty solve agreed with the stored
  // answer, accept it (covers cases where a solve errored/blank).
  const nonEmpty = solves.filter(s => s.answer)
  if (nonEmpty.length > 0 && nonEmpty.every(s => answersAgree(s.answer, q.correctAnswer, q.options))) {
    return { status: 'ok' }
  }

  const verifierAnswer = top.answer || (nonEmpty[0]?.answer ?? '')
  const inOptions = (q.options || []).some(o => answersAgree(verifierAnswer, o, q.options))
  return {
    status: 'suspect',
    verifierAnswer,
    confident: majorityReached,
    inOptions,
    reason: majorityReached ? 'consensus-disagrees' : 'no-consensus',
  }
}

/**
 * COST-AWARE verifier — "screen with a cheap model, arbitrate with Opus".
 *
 *   • Hard grades (grade > CHEAP_MAX_GRADE): go STRAIGHT to the full Opus
 *     verifyQuestion — no compromise where the maths is hard and errors are
 *     subtle (this is where the real error rate lives).
 *   • Young grades (≤ CHEAP_MAX_GRADE): run ONE cheap (Haiku) solve.
 *       – If it AGREES with the stored answer → accept as 'ok' (the cheap path;
 *         a wrong answer is a DISAGREEMENT, so an agreement is strong evidence
 *         the stored answer is right for simple maths).
 *       – If it DISAGREES → we trust NEITHER the cheap model nor the stored
 *         answer; escalate to the full Opus verifyQuestion to make the real
 *         call. So every question the cheap path clears was confirmed; every
 *         disputed one still gets full-strength checking.
 *
 * Same return shape as verifyQuestion, plus `via: 'cheap' | 'opus' | 'escalated'`
 * so a caller/audit can see which path was taken.
 */
export async function verifyQuestionCheap(q, { maxCheapGrade = CHEAP_MAX_GRADE } = {}) {
  if (isVisualQuestion(q)) return { status: 'skipped', reason: 'visual', via: 'skip' }
  if (!q?.question || !Array.isArray(q.options) || !q.correctAnswer) {
    return { status: 'suspect', verifierAnswer: '', inOptions: false, reason: 'malformed', via: 'skip' }
  }

  const grade = Number(q.grade)
  // Hard grade (or unknown grade → treat as hard, be safe) → full Opus.
  if (!Number.isFinite(grade) || grade > maxCheapGrade) {
    return { ...(await verifyQuestion(q)), via: 'opus' }
  }

  // Young grade → one cheap screen.
  let screen
  try { screen = await solveBlind(q, { model: SCREEN_MODEL }) }
  catch {
    // Cheap model failed → fall back to full Opus rather than skip.
    return { ...(await verifyQuestion(q)), via: 'opus' }
  }

  // Image-dependent per the cheap model → let Opus confirm (broken vs answerable
  // is a high-stakes call we don't want the cheap model deciding alone).
  if (screen.needsImage) {
    return { ...(await verifyQuestion(q)), via: 'escalated' }
  }

  if (answersAgree(screen.answer, q.correctAnswer, q.options)) {
    return { status: 'ok', via: 'cheap' }
  }

  // Disagreement → full-strength arbitration.
  return { ...(await verifyQuestion(q)), via: 'escalated' }
}

export { VERIFIER_MODEL, SCREEN_MODEL, CHEAP_MAX_GRADE }
