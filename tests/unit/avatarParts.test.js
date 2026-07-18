import { describe, it, expect } from 'vitest'
import {
  normaliseConfig, buildAvatar, findPart, presetToConfig, colorsFrom,
  DEFAULT_CONFIG, CATEGORIES, PRESETS, HAIR, TOPS,
} from '../../lib/avatarParts.js'

describe('normaliseConfig', () => {
  it('fills a complete config from nothing', () => {
    const c = normaliseConfig(null)
    expect(c).toEqual(DEFAULT_CONFIG)
  })
  it('keeps valid choices and colours', () => {
    const c = normaliseConfig({ hair: 'curly', topColor: '#16A34A' })
    expect(c.hair).toBe('curly')
    expect(c.topColor).toBe('#16A34A')
  })
  it('falls back for unknown/retired item ids (never breaks an avatar)', () => {
    const c = normaliseConfig({ hair: 'retired-mullet', top: 'nope' })
    expect(c.hair).toBe('short')  // category default
    expect(c.top).toBe('tee')
  })
  it('rejects invalid colours', () => {
    const c = normaliseConfig({ skinTone: 'red', hairColor: '#GGG' })
    expect(c.skinTone).toBe(DEFAULT_CONFIG.skinTone)
    expect(c.hairColor).toBe(DEFAULT_CONFIG.hairColor)
  })
})

describe('findPart', () => {
  it('finds by id, defaults when missing', () => {
    expect(findPart('hair', 'curly').id).toBe('curly')
    expect(findPart('hair', 'does-not-exist').id).toBe('short')
    expect(findPart('nonsense', 'x')).toBeNull()
  })
})

describe('buildAvatar', () => {
  it('returns an ordered shape list + background', () => {
    const { shapes, background } = buildAvatar(DEFAULT_CONFIG)
    expect(Array.isArray(shapes)).toBe(true)
    expect(shapes.length).toBeGreaterThan(3)
    expect(background.id).toBe('sky')
  })
  it('always draws the head and neck (structural)', () => {
    const { shapes } = buildAvatar({})
    const head = shapes.find(s => s.type === 'circle' && s.cx === 50 && s.cy === 46 && s.r === 22)
    expect(head).toBeTruthy()
    expect(head.fill).toBe(DEFAULT_CONFIG.skinTone)
  })
  it('applies the chosen colours to parts', () => {
    const { shapes } = buildAvatar({ top: 'tee', topColor: '#DC2626' })
    expect(shapes.some(s => s.fill === '#DC2626')).toBe(true)
  })
  it('draws a cape BEHIND the head, other accessories in front', () => {
    // Head circle (cx50 cy46 r22) is a stable landmark across the body layers.
    const headIdx = (av) => av.shapes.findIndex(s => s.type === 'circle' && s.cx === 50 && s.cy === 46 && s.r === 22)

    const cape = buildAvatar({ accessory: 'cape', top: 'tee' })
    const capeIdx = cape.shapes.findIndex(s => s.d && s.d.startsWith('M22 100'))
    expect(capeIdx).toBeGreaterThanOrEqual(0)
    expect(capeIdx).toBeLessThan(headIdx(cape)) // cape drawn first (behind)

    const medal = buildAvatar({ accessory: 'medal', top: 'tee' })
    const mAcc = medal.shapes.findIndex(s => s.type === 'circle' && s.fill === '#FBBF24')
    expect(mAcc).toBeGreaterThan(headIdx(medal)) // medal drawn last (in front)
  })
  it('hair "none" draws no hair shapes', () => {
    const bald = buildAvatar({ hair: 'none', hat: 'none', glasses: 'none', accessory: 'none' })
    // only structural + eyes/brows/mouth/top remain
    expect(bald.shapes.length).toBeLessThan(buildAvatar({ hair: 'curly' }).shapes.length)
  })
  it('normalises bad input rather than throwing', () => {
    expect(() => buildAvatar({ hair: 42, top: null, skinTone: 'x' })).not.toThrow()
  })
})

describe('presets', () => {
  it('every preset yields a valid, complete config', () => {
    for (const p of PRESETS) {
      const c = presetToConfig(p.id)
      expect(c).toMatchObject({ hair: expect.any(String), top: expect.any(String) })
      expect(() => buildAvatar(c)).not.toThrow()
    }
  })
  it('unknown/legacy emoji avatar falls back to the default look', () => {
    expect(presetToConfig('🦊')).toEqual(DEFAULT_CONFIG)
    expect(presetToConfig(undefined)).toEqual(DEFAULT_CONFIG)
  })
})

describe('registry integrity', () => {
  it('every pickable category has options and exactly one default', () => {
    for (const cat of CATEGORIES) {
      expect(cat.options.length).toBeGreaterThan(0)
      if (cat.type === 'part') {
        const defaults = cat.options.filter(o => o.default)
        expect(defaults.length).toBe(1)
      }
    }
  })
  it('every part shapes() returns plain data (no JSX) and never throws', () => {
    const colors = colorsFrom(DEFAULT_CONFIG)
    for (const list of [HAIR, TOPS]) {
      for (const part of list) {
        const shapes = part.shapes(colors)
        expect(Array.isArray(shapes)).toBe(true)
        for (const s of shapes) expect(typeof s.type).toBe('string')
      }
    }
  })
  it('no duplicate ids within a category', () => {
    for (const cat of CATEGORIES) {
      const ids = cat.options.map(o => o.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
