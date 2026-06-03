// Feature flags — controlled from admin console
// When false → feature is completely hidden from users

export const FEATURE_FLAGS = {
  teachersEnabled: false,      // Hide all teacher features
  englishEnabled: false,       // Hide English subject
  scienceEnabled: false,       // Hide Science subject
  forSchoolsPage: false,       // Hide For Schools nav link
  teacherDemo: false,          // Hide Teacher Demo nav link
  studentDemo: false,          // Hide Student Demo nav link
  arcadeEnabled: false,        // Hide Hero Arcade (student entry point + page)
  // Read-only here. The real switch is the COMING_SOON_MODE env var so the
  // middleware can gate at the edge without a Mongo round-trip per request.
  // This default just makes the value present in the admin UI surface.
  comingSoonMode: false,
}

// Helper
export function isEnabled(flag) {
  return FEATURE_FLAGS[flag] === true
}
