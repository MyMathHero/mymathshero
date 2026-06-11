// Google Analytics 4 event helpers.
// Usage: import { Analytics } from '@/lib/analytics'

// Low-level: fire a single GA4 event. Safely no-ops on the server, in tests,
// and before gtag.js has finished loading.
export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  try {
    window.gtag('event', eventName, params)
  } catch {
    // Analytics must never break the app.
  }
}

// Curated set of named events for MyMathsHero. Add new ones here so the call
// sites stay self-documenting and we don't sprinkle string literals everywhere.
export const Analytics = {
  // Auth
  login:      (role) => trackEvent('login',  { method: role }),
  register:   (plan) => trackEvent('sign_up', { method: plan }),
  logout:     ()     => trackEvent('logout'),

  // Student practice
  questionAnswered: (correct, skillId, grade) => trackEvent('question_answered', {
    correct: correct ? 'yes' : 'no',
    skill_id: skillId,
    grade,
  }),
  skillStarted: (skillId, skillName) => trackEvent('skill_started', {
    skill_id: skillId,
    skill_name: skillName,
  }),
  skillMastered: (skillId, skillName, grade) => trackEvent('skill_mastered', {
    skill_id: skillId,
    skill_name: skillName,
    grade,
  }),
  examStarted: (skillId) => trackEvent('exam_started', {
    skill_id: skillId,
  }),
  examPassed: (skillId, score) => trackEvent('exam_passed', {
    skill_id: skillId,
    score,
  }),
  examFailed: (skillId, score) => trackEvent('exam_failed', {
    skill_id: skillId,
    score,
  }),
  askHeroOpened: (skillId) => trackEvent('ask_hero_opened', {
    skill_id: skillId,
  }),
  streakAchieved: (days) => trackEvent('streak_achieved', {
    streak_days: days,
  }),
  badgeEarned: (badgeName) => trackEvent('badge_earned', {
    badge_name: badgeName,
  }),

  // Arcade
  arcadeEntered: () => trackEvent('arcade_entered'),
  gameUnlocked: (gameId, gameName, coinsSpent) => trackEvent('game_unlocked', {
    game_id: gameId,
    game_name: gameName,
    coins_spent: coinsSpent,
  }),
  gamePlayed: (gameId, gameName, durationMinutes) => trackEvent('game_played', {
    game_id: gameId,
    game_name: gameName,
    duration_minutes: durationMinutes,
  }),

  // Parent
  parentDashboardViewed: () => trackEvent('parent_dashboard_viewed'),
  arcadeSettingsChanged: (setting, value) => trackEvent('arcade_settings_changed', {
    setting,
    value,
  }),

  // Waitlist
  waitlistJoined: (grade) => trackEvent('waitlist_joined', {
    child_grade: grade,
  }),

  // Onboarding
  onboardingStarted: () => trackEvent('onboarding_started'),
  onboardingCompleted: (plan) => trackEvent('onboarding_completed', {
    plan,
  }),
  diagnosticCompleted: (grade, score) => trackEvent('diagnostic_completed', {
    grade,
    score,
  }),

  // Manual page-view (GA4 auto-tracks too — use only for SPA route changes).
  pageView: (pageName) => trackEvent('page_view', {
    page_title: pageName,
  }),
}
