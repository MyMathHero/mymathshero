import { describe, it, expect } from 'vitest'
import {
  bandForDifficulty, bandForScore, adjacentBands, BAND_ORDER, BAND_RANGE,
  shiftBand, biasForFeedback,
} from '../../lib/difficulty.js'

describe('bandForDifficulty', () => {
  it('maps the numeric range into thirds', () => {
    expect(bandForDifficulty(0.1)).toBe('easy')
    expect(bandForDifficulty(0.39)).toBe('easy')
    expect(bandForDifficulty(0.4)).toBe('medium')
    expect(bandForDifficulty(0.69)).toBe('medium')
    expect(bandForDifficulty(0.7)).toBe('hard')
    expect(bandForDifficulty(0.9)).toBe('hard')
  })
  it('defaults non-numbers to medium (0.5)', () => {
    expect(bandForDifficulty(undefined)).toBe('medium')
    expect(bandForDifficulty(null)).toBe('medium')
    expect(bandForDifficulty(NaN)).toBe('medium')
    expect(bandForDifficulty('hard')).toBe('medium')
  })
})

describe('bandForScore', () => {
  it('beginner scores get easy, mid get medium, near-mastered get hard', () => {
    expect(bandForScore(0)).toBe('easy')
    expect(bandForScore(39)).toBe('easy')
    expect(bandForScore(40)).toBe('medium')
    expect(bandForScore(74)).toBe('medium')
    expect(bandForScore(75)).toBe('hard')
    expect(bandForScore(100)).toBe('hard')
  })
  it('defaults missing score to easy (0)', () => {
    expect(bandForScore(undefined)).toBe('easy')
    expect(bandForScore(null)).toBe('easy')
    expect(bandForScore(NaN)).toBe('easy')
  })
})

describe('adjacentBands', () => {
  it('includes the target plus immediate neighbours, in order', () => {
    expect(adjacentBands('easy')).toEqual(['easy', 'medium'])
    expect(adjacentBands('medium')).toEqual(['easy', 'medium', 'hard'])
    expect(adjacentBands('hard')).toEqual(['medium', 'hard'])
  })
  it('returns all bands for an unknown band', () => {
    expect(adjacentBands('???')).toEqual(BAND_ORDER)
  })
})

describe('BAND_RANGE / bandForDifficulty consistency', () => {
  it('every band range maps back to its own band at the endpoints', () => {
    for (const band of BAND_ORDER) {
      const [lo, hi] = BAND_RANGE[band]
      expect(bandForDifficulty(lo)).toBe(band)
      expect(bandForDifficulty(hi)).toBe(band)
    }
  })
})

describe('biasForFeedback', () => {
  it('maps too easy → +1 (serve harder), too hard → -1 (serve easier)', () => {
    expect(biasForFeedback('too_easy')).toBe(1)
    expect(biasForFeedback('too_hard')).toBe(-1)
  })
  it('just right / unknown → 0', () => {
    expect(biasForFeedback('just_right')).toBe(0)
    expect(biasForFeedback('whatever')).toBe(0)
    expect(biasForFeedback(undefined)).toBe(0)
  })
})

describe('shiftBand', () => {
  it('shifts within range', () => {
    expect(shiftBand('easy', 1)).toBe('medium')
    expect(shiftBand('medium', 1)).toBe('hard')
    expect(shiftBand('medium', -1)).toBe('easy')
  })
  it('clamps at the ends', () => {
    expect(shiftBand('hard', 1)).toBe('hard')
    expect(shiftBand('easy', -1)).toBe('easy')
  })
  it('no-op for delta 0 / missing / unknown band', () => {
    expect(shiftBand('medium', 0)).toBe('medium')
    expect(shiftBand('medium')).toBe('medium')
    expect(shiftBand('bogus', 1)).toBe('bogus')
  })
  it('composes with biasForFeedback (too easy lifts the served band)', () => {
    expect(shiftBand('medium', biasForFeedback('too_easy'))).toBe('hard')
    expect(shiftBand('medium', biasForFeedback('too_hard'))).toBe('easy')
  })
})
