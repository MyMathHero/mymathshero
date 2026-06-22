import { describe, it, expect } from 'vitest'
import {
  isFreeTrialActive, isFreeTrialExpired, resolveEffectivePlan, buildFreeTrialGrant, FREE_TRIAL_DAYS,
} from '../../lib/freeTrial.js'

const now = Date.now()
const future = new Date(now + 10 * 86400000)
const past = new Date(now - 1 * 86400000)

describe('isFreeTrialActive / isFreeTrialExpired', () => {
  it('active when freeTrialUntil is in the future', () => {
    expect(isFreeTrialActive({ freeTrialUntil: future })).toBe(true)
    expect(isFreeTrialExpired({ freeTrialUntil: future })).toBe(false)
  })
  it('expired when in the past and not subscribed', () => {
    expect(isFreeTrialActive({ freeTrialUntil: past })).toBe(false)
    expect(isFreeTrialExpired({ freeTrialUntil: past })).toBe(true)
  })
  it('not expired if a real subscription took over', () => {
    expect(isFreeTrialExpired({ freeTrialUntil: past, subscribed: true })).toBe(false)
  })
  it('false for parents with no trial field', () => {
    expect(isFreeTrialActive({})).toBe(false)
    expect(isFreeTrialExpired({})).toBe(false)
  })
})

describe('resolveEffectivePlan', () => {
  it('free for a fresh parent', () => {
    expect(resolveEffectivePlan({})).toBe('free')
  })
  it('premium during an active app-granted month', () => {
    expect(resolveEffectivePlan({ plan: 'premium', freeTrialUntil: future })).toBe('premium')
  })
  it('downgrades to free once the granted month expired (no sub)', () => {
    expect(resolveEffectivePlan({ plan: 'premium', freeTrialUntil: past })).toBe('free')
  })
  it('a paying subscriber stays premium even with a lingering expired trial', () => {
    expect(resolveEffectivePlan({ plan: 'premium', subscribed: true, freeTrialUntil: past })).toBe('premium')
  })
  it('respects a paid standard plan', () => {
    expect(resolveEffectivePlan({ plan: 'standard', subscribed: true })).toBe('standard')
  })
  it('cancelled (not subscribed) is free', () => {
    expect(resolveEffectivePlan({ plan: 'free', subscribed: false })).toBe('free')
  })
  it('null parent is free', () => {
    expect(resolveEffectivePlan(null)).toBe('free')
  })
})

describe('buildFreeTrialGrant', () => {
  it('grants premium for ~FREE_TRIAL_DAYS days', () => {
    const g = buildFreeTrialGrant()
    expect(g.plan).toBe('premium')
    expect(g.freeTrialGranted).toBe(true)
    expect(g.accessBlocked).toBe(false)
    const days = Math.round((new Date(g.freeTrialUntil).getTime() - Date.now()) / 86400000)
    expect(days).toBe(FREE_TRIAL_DAYS)
  })
})
