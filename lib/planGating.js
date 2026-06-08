// Plan gating helpers for MyMathsHero
// Standard vs Premium feature access

export const PLAN_FEATURES = {
  standard: {
    askHero: false,
    voiceExplanations: false,
    skillExam: false,
    arcadeGameLimit: 3, // first 3 games only
    arcadeEnabled: true,
  },
  premium: {
    askHero: true,
    voiceExplanations: true,
    skillExam: true,
    arcadeGameLimit: null, // unlimited
    arcadeEnabled: true,
  },
  free: {
    askHero: false,
    voiceExplanations: false,
    skillExam: false,
    arcadeGameLimit: 0,
    arcadeEnabled: false,
  },
}

export function canUseFeature(plan, feature) {
  const features = PLAN_FEATURES[plan] ||
    PLAN_FEATURES.free
  return features[feature] === true ||
    (typeof features[feature] === 'number' &&
     features[feature] > 0)
}

export function getPlanFeatures(plan) {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.free
}

// Returns a user-friendly upgrade message
export function getUpgradeMessage(feature) {
  const messages = {
    askHero: 'Ask Hero AI Tutor is a Premium feature. Upgrade to get personalised hints and explanations!',
    voiceExplanations: 'Voice explanations are a Premium feature. Upgrade to hear Hero explain answers!',
    skillExam: 'Skill Mastery Exams are a Premium feature. Upgrade to earn mastery badges!',
    arcade: 'Upgrade to Premium to unlock all Arcade games!',
  }
  return messages[feature] ||
    'Upgrade to Premium to unlock this feature!'
}
