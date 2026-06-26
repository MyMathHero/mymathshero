/**
 * Hero lesson parsing + validation for the full-screen "Teach Me" tutor.
 *
 * A lesson is an ordered list of steps the whiteboard reveals one at a time,
 * each with narration (`say`) and a line of working to draw on (`write`). The
 * lesson teaches the METHOD on a SIMILAR example — it must NOT solve the
 * student's real question (the last `write` is the answer to Hero's example,
 * not theirs). The lesson also carries a separate multiple-choice `example` the
 * student attempts afterwards before returning to their real question.
 *
 * All functions are pure and never throw, so the lesson endpoint always returns
 * a usable shape even when the model output is malformed or the API is down.
 */

import { normaliseManipulative } from './manipulatives'

const MIN_STEPS = 1
const MAX_STEPS = 6
const SAY_MAX = 240
const WRITE_MAX = 120

function clampStr(v, max) {
  return String(v ?? '').trim().slice(0, max)
}

// Pull the distinctive number/token bits out of a question so we can tell whether
// a generated example accidentally reuses the student's exact problem.
function numbersOf(text) {
  return (String(text || '').match(/\d+(?:\.\d+)?/g) || [])
}

/**
 * Validate the optional multiple-choice practice `example`. Returns a safe
 * example or null. Rejects an example that is too similar to the student's real
 * question (anti-leak: it must not reuse the same set of numbers), so the
 * student can't read their own answer off the practice problem.
 */
export function validateExample(raw, { questionText } = {}) {
  if (!raw || typeof raw !== 'object') return null
  const question = clampStr(raw.question, 180)
  const correctAnswer = clampStr(raw.correctAnswer, 80)
  if (!question || !correctAnswer) return null

  let options = Array.isArray(raw.options)
    ? raw.options.map(o => clampStr(o, 80)).filter(Boolean)
    : []
  // De-dupe, ensure the correct answer is present, cap at 4.
  options = Array.from(new Set(options))
  if (!options.includes(correctAnswer)) options.unshift(correctAnswer)
  options = options.slice(0, 4)
  if (options.length < 2 || !options.includes(correctAnswer)) return null

  // Anti-leak: reject if the example's numbers are the SAME multiset as the real
  // question's (i.e. it just restated the homework).
  if (questionText) {
    const a = numbersOf(question).sort().join(',')
    const b = numbersOf(questionText).sort().join(',')
    if (a && a === b) return null
  }

  return { question, options, correctAnswer, hint: clampStr(raw.hint, SAY_MAX) }
}

// Strip ```json ... ``` fences and pull the first {...} object out of model text.
export function extractLessonJson(raw) {
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // Last resort: grab the outermost object literal.
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (!m) return null
    try { return JSON.parse(m[0]) } catch { return null }
  }
}

// Coerce arbitrary parsed JSON into a safe lesson, or return null if unusable.
// `opts.questionText` is used for the example anti-leak check.
export function validateLesson(parsed, opts = {}) {
  if (!parsed || typeof parsed !== 'object') return null
  const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : null
  if (!rawSteps) return null

  const steps = rawSteps
    .map(s => {
      if (!s || typeof s !== 'object') return null
      const say = clampStr(s.say, SAY_MAX)
      const write = clampStr(s.write, WRITE_MAX)
      if (!say && !write) return null
      const emphasis = s.emphasis === 'result' ? 'result' : s.emphasis === 'step' ? 'step' : null
      return { say, write, ...(emphasis ? { emphasis } : {}) }
    })
    .filter(Boolean)
    .slice(0, MAX_STEPS)

  if (steps.length < MIN_STEPS) return null

  const manipulative = parsed.manipulative ? normaliseManipulative(parsed.manipulative) : null
  const example = validateExample(parsed.example, opts)
  return { steps, manipulative: manipulative || null, ...(example ? { example } : {}) }
}

// Parse raw model text into a validated lesson, or null.
export function parseLesson(raw, opts = {}) {
  return validateLesson(extractLessonJson(raw), opts)
}

/**
 * Deterministic fallback lesson built from a question's stored hint/explanation
 * when the AI is unavailable. Always returns a valid lesson.
 */
export function fallbackLesson({ questionText, hint, explanation } = {}) {
  const steps = []
  if (questionText) {
    steps.push({ say: `Let's work through this together.`, write: clampStr(questionText, WRITE_MAX), emphasis: 'step' })
  }
  if (hint) {
    steps.push({ say: clampStr(hint, SAY_MAX), write: '' })
  }
  if (explanation) {
    steps.push({ say: clampStr(explanation, SAY_MAX), write: '', emphasis: 'result' })
  }
  if (steps.length === 0) {
    steps.push({
      say: `Let's break this problem into smaller steps. What do you already know?`,
      write: '',
    })
  }
  return { steps, manipulative: null, source: 'fallback' }
}
