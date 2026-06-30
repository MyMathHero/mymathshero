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

// Normalise an answer for comparison: strip leading letter prefixes ("A) ",
// "B.") — including accidental double prefixes — collapse whitespace, lowercase.
export function normaliseAnswer(s) {
  return String(s ?? '')
    .trim()
    .replace(/^([A-Da-d][).:\s]+)+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// Do two answers mean the same thing? Tolerates letter prefixes, $/unit noise,
// and answers given as a bare option letter.
export function answersAgree(modelAns, storedAns, options) {
  const a = normaliseAnswer(modelAns)
  const b = normaliseAnswer(storedAns)
  if (!a || !b) return false
  if (a === b) return true
  // Numeric core match (e.g. "$5.50" vs "5.50", "5 km" vs "5").
  const numA = (a.match(/-?\d+(?:\.\d+)?/g) || []).join(',')
  const numB = (b.match(/-?\d+(?:\.\d+)?/g) || []).join(',')
  if (numA && numA === numB) return true
  // Model answered with just the option letter → map to that option's text.
  const letter = a.match(/^[a-d]$/)
  if (letter && Array.isArray(options)) {
    const idx = letter[0].charCodeAt(0) - 97
    if (options[idx] != null && normaliseAnswer(options[idx]) === b) return true
  }
  return false
}

// Visual questions can't be solved from text alone (the model can't see the
// picture/graph), so they must NEVER be auto-verified or flagged.
export function isVisualQuestion(q) {
  if (!q) return false
  if (q.mode === 'junior' || q.visual != null) return true
  return /how many do you see|comes next|which.*(more|fewer|bigger|smaller)|count the|this shape|the (graph|diagram|figure|picture|chart|clock|model) shows|shaded|which shape/i
    .test(q.question || '')
}

// One blind solve via OpenRouter. Returns { answer, confident } or throws on a
// transport/HTTP error (caller may retry).
export async function solveBlind(q, { model = VERIFIER_MODEL } = {}) {
  const opts = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n')
  const prompt = [
    `You are a careful maths examiner. Solve this multiple-choice question and choose the single correct option.`,
    `Show NO working. Respond with ONLY compact JSON: {"answer":"<exact option text>","confident":true|false}`,
    ``,
    `Question: ${q.question}`,
    `Options:`,
    opts,
  ].join('\n')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'MMH Q-Verifier',
    },
    body: JSON.stringify({ model, max_tokens: 200, temperature: 0, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
  const data = await res.json()
  const raw = (data.choices?.[0]?.message?.content || '').trim()
    .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  let parsed
  try { parsed = JSON.parse(raw) } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    parsed = m ? (() => { try { return JSON.parse(m[0]) } catch { return null } })() : null
  }
  return { answer: parsed?.answer ?? '', confident: parsed?.confident !== false }
}

/**
 * Verify a question. Returns:
 *   { status: 'skipped' }                                   visual — not verifiable
 *   { status: 'ok' }                                        verifier agrees with stored
 *   { status: 'suspect', verifierAnswer, inOptions }        verifier disagrees
 *   { status: 'error', error }                              all attempts failed
 *
 * `double` runs a second pass on a disagreement and only stays "suspect" if both
 * passes disagree (cuts false positives). `inOptions` says whether the verifier's
 * answer matches one of the options (→ auto-correctable) or not (→ broken question).
 */
export async function verifyQuestion(q, { model = VERIFIER_MODEL, double = true } = {}) {
  if (isVisualQuestion(q)) return { status: 'skipped', reason: 'visual' }
  if (!q?.question || !Array.isArray(q.options) || !q.correctAnswer) {
    return { status: 'suspect', verifierAnswer: '', inOptions: false, reason: 'malformed' }
  }

  let v
  try { v = await solveBlind(q, { model }) }
  catch (e) {
    // one retry
    try { v = await solveBlind(q, { model }) }
    catch (e2) { return { status: 'error', error: e2.message } }
  }

  if (answersAgree(v.answer, q.correctAnswer, q.options)) return { status: 'ok' }

  if (double) {
    let v2
    try { v2 = await solveBlind(q, { model }) } catch { v2 = null }
    if (v2 && answersAgree(v2.answer, q.correctAnswer, q.options)) return { status: 'ok' }
    if (v2) v = v2 // trust the second pass's answer for reporting
  }

  const inOptions = (q.options || []).some(o => answersAgree(v.answer, o, q.options))
  return { status: 'suspect', verifierAnswer: v.answer, confident: v.confident, inOptions }
}

export { VERIFIER_MODEL }
