/**
 * Feature visibility for student-facing features we can hide without deleting
 * code. Visibility is now ADMIN-CONTROLLED via the shared feature-flags API
 * (mirror of web lib/featureFlags.js), so the mymathsheroadmin console can flip
 * a feature on/off for everyone without an app update.
 */
import { useEffect, useState } from 'react'
import { featureFlagsAPI } from './api'

// Default OFF until the live flag loads (avoids a flash of hidden features).
export const VOUCHERS_ENABLED = false

// Live voucher-visibility flag. Returns { enabled, loaded }.
export function useVouchersEnabled() {
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    featureFlagsAPI.get()
      .then((r: any) => { if (!cancelled) setEnabled(r?.data?.vouchersEnabled === true) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])
  return { enabled, loaded }
}
