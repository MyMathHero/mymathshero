/**
 * Simple on/off switches for whole student-facing features that we want to hide
 * from the UI WITHOUT deleting their code — so they can be brought back later by
 * flipping one boolean. (Distinct from `useFeatureFlags`, which is remote/plan-
 * driven; these are hard build-time toggles.)
 */

// Vouchers ("Hero Vouchers" — redeem coins/points for arcade credits) are hidden
// from students for now per the 1 Jul 2026 update: "Take Voucher system away. Keep
// it hidden so later I can bring it back." Set to true to restore all entry points.
export const VOUCHERS_ENABLED = false
