// Mobile analytics — sends events to GA4 via the Measurement Protocol.
//
// To enable in production:
//   1. GA4 → Admin → Data Streams → choose your stream
//   2. Measurement Protocol API secrets → Create
//   3. Paste the secret into GA_API_SECRET below (or wire it through env).
//
// Until GA_API_SECRET is set, this module is a no-op in production builds.

const GA_MEASUREMENT_ID = 'G-0G8YVNL7E4'
const GA_API_SECRET = '' // ← paste secret here, or load via Expo config

// One client_id per device per app launch. Good enough for cohort/funnel
// reports; not stable across launches. If you need a persistent install id,
// move this to expo-secure-store and read/cache on first use.
function makeClientId(): string {
  return `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}
let clientId = makeClientId()

type EventParams = Record<string, string | number | boolean | null | undefined>

export async function trackMobileEvent(
  eventName: string,
  params: EventParams = {}
): Promise<void> {
  // Dev: log instead of sending. Saves quota and keeps GA debug view clean.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[Analytics] ${eventName}`, params)
    return
  }
  if (!GA_API_SECRET) return

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          events: [{
            name: eventName,
            params: {
              ...params,
              platform: 'mobile',
              // GA4 requires this for events from the Measurement Protocol to
              // count toward engagement metrics.
              engagement_time_msec: '100',
            },
          }],
        }),
      }
    )
  } catch {
    // Analytics must never break the app.
  }
}

export const MobileAnalytics = {
  appOpened:    ()                        => trackMobileEvent('app_opened'),
  login:        (role: string)            => trackMobileEvent('login', { method: role }),
  questionAnswered: (correct: boolean, skillId: string) =>
    trackMobileEvent('question_answered', {
      correct: correct ? 'yes' : 'no',
      skill_id: skillId,
    }),
  arcadeEntered: ()                       => trackMobileEvent('arcade_entered'),
  gamePlayed:   (gameId: string, minutes: number) =>
    trackMobileEvent('game_played', { game_id: gameId, duration_minutes: minutes }),
  askHeroOpened: (skillId: string)        => trackMobileEvent('ask_hero_opened', { skill_id: skillId }),
}
