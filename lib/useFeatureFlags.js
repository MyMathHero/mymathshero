'use client'
import { useState, useEffect } from 'react'
import { FEATURE_FLAGS } from './featureFlags'

// Client hook — reads live flags from the admin-controlled API, falling back to
// the hardcoded defaults until the fetch resolves. `loaded` lets callers avoid a
// flash of flag-gated UI before the real values arrive.
export function useFeatureFlags() {
  const [flags, setFlags] = useState(FEATURE_FLAGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/feature-flags')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data || data.error) return
        setFlags({ ...FEATURE_FLAGS, ...data })
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  return { flags, loaded }
}
