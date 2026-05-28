// Feature flags — controlled from admin console
// When false → feature is completely hidden from users

export const FEATURE_FLAGS = {
  teachersEnabled: false,      // Hide all teacher features
  englishEnabled: false,       // Hide English subject
  scienceEnabled: false,       // Hide Science subject
  forSchoolsPage: false,       // Hide For Schools nav link
  teacherDemo: false,          // Hide Teacher Demo nav link
}

// Helper
export function isEnabled(flag) {
  return FEATURE_FLAGS[flag] === true
}
