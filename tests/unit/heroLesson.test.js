import { describe, it, expect } from 'vitest'
import {
  extractLessonJson, validateLesson, parseLesson, fallbackLesson,
} from '../../lib/heroLesson.js'

describe('extractLessonJson', () => {
  it('parses plain JSON', () => {
    expect(extractLessonJson('{"steps":[]}')).toEqual({ steps: [] })
  })
  it('strips ```json code fences', () => {
    expect(extractLessonJson('```json\n{"steps":[{"say":"hi"}]}\n```')).toEqual({ steps: [{ say: 'hi' }] })
  })
  it('recovers the first object literal from surrounding prose', () => {
    expect(extractLessonJson('Sure! {"steps":[{"say":"x"}]} done')).toEqual({ steps: [{ say: 'x' }] })
  })
  it('returns null on garbage', () => {
    expect(extractLessonJson('not json at all')).toBeNull()
    expect(extractLessonJson('')).toBeNull()
    expect(extractLessonJson(null)).toBeNull()
  })
})

describe('validateLesson', () => {
  it('keeps valid steps and resolves manipulative', () => {
    const out = validateLesson({
      steps: [
        { say: 'First, multiply.', write: '5 × 9' },
        { say: 'That gives us.', write: '45', emphasis: 'result' },
      ],
      manipulative: 'pizza',
    })
    expect(out.steps).toHaveLength(2)
    expect(out.steps[1].emphasis).toBe('result')
    expect(out.manipulative).toBe('pizza')
  })

  it('drops empty steps and clamps to 6', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ say: `s${i}`, write: `${i}` }))
    const out = validateLesson({ steps: [...many, { say: '', write: '' }] })
    expect(out.steps).toHaveLength(6)
  })

  it('rejects a lesson with no usable steps', () => {
    expect(validateLesson({ steps: [{ say: '', write: '' }] })).toBeNull()
    expect(validateLesson({ steps: [] })).toBeNull()
    expect(validateLesson({})).toBeNull()
    expect(validateLesson(null)).toBeNull()
  })

  it('ignores an invalid emphasis value', () => {
    const out = validateLesson({ steps: [{ say: 'hi', write: '1', emphasis: 'wat' }] })
    expect(out.steps[0].emphasis).toBeUndefined()
  })
})

describe('parseLesson (end to end)', () => {
  it('parses fenced model output into a clean lesson', () => {
    const raw = '```json\n{"steps":[{"say":"Add them.","write":"2+3=5","emphasis":"result"}],"manipulative":"numberline"}\n```'
    const out = parseLesson(raw)
    expect(out.steps[0].write).toBe('2+3=5')
    expect(out.manipulative).toBe('numberline')
  })
  it('returns null when nothing parses', () => {
    expect(parseLesson('totally broken')).toBeNull()
  })
})

describe('fallbackLesson', () => {
  it('builds a lesson from hint + explanation', () => {
    const out = fallbackLesson({ questionText: 'What is 5 × 9?', hint: 'Think 9 fives.', explanation: '5 × 9 = 45.' })
    expect(out.source).toBe('fallback')
    expect(out.steps.length).toBeGreaterThanOrEqual(2)
    expect(out.steps[0].write).toBe('What is 5 × 9?')
  })
  it('always returns at least one step even with no inputs', () => {
    const out = fallbackLesson({})
    expect(out.steps).toHaveLength(1)
    expect(out.steps[0].say.length).toBeGreaterThan(0)
  })
})
