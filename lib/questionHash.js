import { createHash } from 'crypto'

// Content fingerprint for a question, used to prevent duplicates entering the
// bank (the generator/verifier previously had NO dedup, so regeneration could
// spawn twins — the "questions repeat" problem). Two questions with the same
// fingerprint are treated as identical.
//
// The fingerprint is built from the QUESTION TEXT + the CORRECT ANSWER, both
// aggressively normalised so trivial rewordings (whitespace, punctuation, "×"
// vs "x", "5 times 9" spacing, letter-prefixed options) collide, while genuinely
// different questions do not. Options are intentionally NOT part of the hash:
// the same question with shuffled/rephrased distractors is still the same
// question, and we keep whichever copy is best (see the dedup sweep).

// Normalise a maths string for fingerprinting.
export function normaliseForHash(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/^([a-d][).:\s]+)+/, '')      // strip leading option letters "A) "
    .replace(/[×✕✖]/g, '*')                // unify multiplication signs
    .replace(/[÷]/g, '/')                  // unify division signs
    .replace(/[−–—]/g, '-')                // unify minus/dashes
    .replace(/\s+/g, ' ')                  // collapse whitespace
    .replace(/[.,!?;:"'`]+$/g, '')         // drop trailing punctuation
    .replace(/[^\w\s*/+\-=<>%.$()]/g, '')  // drop other symbols/emoji, keep maths
    .trim()
}

// Stable fingerprint string (pre-hash) for a question doc/shape. Exposed for
// tests + debugging; questionHash() is the hashed form stored on the doc.
export function fingerprint(q) {
  const question = normaliseForHash(q?.question)
  const answer = normaliseForHash(q?.correctAnswer)
  const skill = String(q?.skillId ?? '').trim().toLowerCase()
  // Skill is included so an identical stem legitimately reused across skills
  // (rare) isn't collapsed, but the same stem+answer within a skill is.
  return `${skill}||${question}||${answer}`
}

// SHA-1 hex of the fingerprint — short, stable, index-friendly.
export function questionHash(q) {
  return createHash('sha1').update(fingerprint(q)).digest('hex')
}
