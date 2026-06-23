/**
 * Hero lesson parsing + validation for the full-screen "Teach Me" tutor.
 *
 * A lesson is an ordered list of steps the whiteboard reveals one at a time,
 * each with narration (`say`) and a line of working to draw on (`write`).
 * Unlike chat hints (which never give the answer), a lesson DEMONSTRATES the
 * method on the question the student is stuck on — the last step's `write` is
 * the answer.
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
export function validateLesson(parsed) {
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
  return { steps, manipulative: manipulative || null }
}

// Parse raw model text into a validated lesson, or null.
export function parseLesson(raw) {
  return validateLesson(extractLessonJson(raw))
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
