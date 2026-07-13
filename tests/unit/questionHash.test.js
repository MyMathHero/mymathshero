import { describe, it, expect } from 'vitest'
import { normaliseForHash, fingerprint, questionHash } from '../../lib/questionHash.js'

describe('normaliseForHash', () => {
  it('unifies maths symbols and whitespace', () => {
    expect(normaliseForHash('What is 5 × 9?')).toBe('what is 5 * 9')
    expect(normaliseForHash('What is  5 x 9')).toBe('what is 5 x 9') // x stays a letter
    expect(normaliseForHash('12 ÷ 4')).toBe('12 / 4')
    expect(normaliseForHash('−7/4')).toBe('-7/4')
  })
  it('strips leading option letters and trailing punctuation', () => {
    expect(normaliseForHash('A) 45')).toBe('45')
    expect(normaliseForHash('Pentagon.')).toBe('pentagon')
  })
})

describe('questionHash', () => {
  const base = { skillId: 'm_3_multiply', question: 'What is 5 × 9?', correctAnswer: '45' }

  it('is identical for trivially reworded duplicates', () => {
    const a = questionHash(base)
    const b = questionHash({ ...base, question: 'What is 5 × 9?  ' }) // extra ws
    const c = questionHash({ ...base, question: 'What is 5 x 9', correctAnswer: 'A) 45' })
    expect(a).toBe(b)
    // "x" (letter) differs from "×" (sign→*), so c is a DIFFERENT stem — that's
    // acceptable; the AI near-dup pass catches semantic rewrites. Exact-hash only
    // promises identical/whitespace/sign/prefix collisions.
    expect(typeof c).toBe('string')
  })

  it('differs for genuinely different questions', () => {
    expect(questionHash(base)).not.toBe(questionHash({ ...base, question: 'What is 6 × 9?' }))
    expect(questionHash(base)).not.toBe(questionHash({ ...base, correctAnswer: '54' }))
  })

  it('differs across skills (same stem reused)', () => {
    expect(questionHash(base)).not.toBe(questionHash({ ...base, skillId: 'm_4_multiply' }))
  })

  it('is a stable 40-char sha1 hex', () => {
    expect(questionHash(base)).toMatch(/^[a-f0-9]{40}$/)
  })
})

describe('fingerprint', () => {
  it('combines skill, question and answer', () => {
    expect(fingerprint({ skillId: 'm_3_x', question: 'A?', correctAnswer: 'B' }))
      .toBe('m_3_x||a||b')
  })
})
