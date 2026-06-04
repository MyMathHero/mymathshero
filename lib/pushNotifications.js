// Server-side push send via the Expo Push API.
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/
//
// Notes:
//   - The Expo Push service is a relay to APNS / FCM. No API key required for
//     sends; for production you can add an EXPO_ACCESS_TOKEN for higher limits.
//   - Each call returns a ticket; *delivery* status requires a separate
//     /getReceipts call ~15 minutes later. We don't track receipts here yet.
//   - Sending to an invalid token returns a ticket with error
//     "DeviceNotRegistered" — caller should clean the token from Mongo. Wired
//     for the streak job below.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

function withAuthHeaders() {
  const h = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  }
  if (process.env.EXPO_ACCESS_TOKEN) {
    h.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`
  }
  return h
}

export async function sendPushNotification({
  token,
  title,
  body,
  data = {},
  sound = 'default',
  badge = 1,
}) {
  if (!token) return { success: false, error: 'No token' }
  if (typeof token !== 'string' || !token.startsWith('ExponentPushToken[')) {
    return { success: false, error: 'Invalid Expo push token' }
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: withAuthHeaders(),
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound,
        badge,
        priority: 'high',
      }),
    })
    const result = await response.json()
    const ticket = result?.data
    if (ticket?.status === 'error') {
      return { success: false, error: ticket.message || 'Expo error', ticket }
    }
    return { success: true, ticket }
  } catch (error) {
    console.error('[push] send failed:', error.message)
    return { success: false, error: error.message }
  }
}

// Batched send. Expo accepts up to 100 messages per request.
export async function sendBatchPushNotifications(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return []

  // Chunk to 100 per request per Expo limits.
  const chunks = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  const tickets = []
  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: withAuthHeaders(),
        body: JSON.stringify(chunk),
      })
      const json = await response.json()
      if (Array.isArray(json?.data)) tickets.push(...json.data)
    } catch (err) {
      console.error('[push] batch failed:', err.message)
    }
  }
  return tickets
}

// ── Pre-built sends used by the streak job and downstream features ──────────

export async function sendStreakReminderPush(student) {
  if (!student?.pushToken) return { success: false, error: 'No token' }
  const firstName = String(student.name || '').split(' ')[0] || 'Hero'
  return sendPushNotification({
    token: student.pushToken,
    title: `🔥 Don't break your streak, ${firstName}!`,
    body: `You have a ${student.streak}-day streak! Practice one Maths skill today to keep it going.`,
    data: { type: 'streak_reminder', studentId: student.id },
  })
}

export async function sendBadgeEarnedPush(parent, student, badge) {
  if (!parent?.pushToken) return { success: false, error: 'No token' }
  return sendPushNotification({
    token: parent.pushToken,
    title: `🏅 ${student.name} earned a badge!`,
    body: `${student.name} just earned the "${badge.name}" badge on MyMathsHero!`,
    data: { type: 'badge_earned', studentId: student.id },
  })
}

export async function sendArcadeUnlockPush(student, game) {
  if (!student?.pushToken) return { success: false, error: 'No token' }
  return sendPushNotification({
    token: student.pushToken,
    title: `🕹️ You can unlock ${game.title}!`,
    body: `You have enough Hero Points to unlock ${game.title} in the Arcade!`,
    data: { type: 'arcade_unlock', gameId: game.id },
  })
}
