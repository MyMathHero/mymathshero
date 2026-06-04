// Push & local notifications. Targets Expo SDK 56.
//
// Notes on the SDK 56 API:
//   - Trigger inputs are tagged unions: { type: SchedulableTriggerInputTypes.X, ... }.
//     We use DAILY for the 6pm streak reminder (clean repeating semantics),
//     and a null trigger for immediate local fires (badge / mastery).
//   - `shouldShowAlert` on NotificationBehavior is deprecated in favour of
//     `shouldShowBanner` + `shouldShowList`. We set both for forward compat
//     and keep `shouldShowAlert` for older clients.
//   - Subscriptions returned by addNotificationXListener expose `.remove()`.
//   - expo-notifications does NOT run in Expo Go on SDK 53+. It works in dev
//     builds and production builds only.

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import api from './api'

const STREAK_REMINDER_ID = 'streak-reminder'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(
  studentId: string
): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[notifications] simulator/web — skipping push registration')
    return null
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') {
    console.log('[notifications] permission denied')
    return null
  }

  // Android channels — must be created before the first notification fires.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'MyMathsHero',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C49A1A',
      sound: 'default',
    })
    await Notifications.setNotificationChannelAsync('streaks', {
      name: 'Streak Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    })
    await Notifications.setNotificationChannelAsync('badges', {
      name: 'Badge Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    })
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId
  if (!projectId) {
    console.log('[notifications] no EAS project id — cannot get push token')
    return null
  }

  let token: string | null = null
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    token = tokenData.data
  } catch (err: any) {
    console.log('[notifications] getExpoPushTokenAsync failed:', err?.message)
    return null
  }

  if (token && studentId) {
    try {
      await api.post('/api/student/push-token', {
        studentId,
        token,
        platform: Platform.OS,
      })
      console.log('[notifications] token registered')
    } catch (err: any) {
      console.log('[notifications] failed to save token:', err?.message)
    }
  }

  return token
}

// Schedule a local notification. trigger=null fires immediately.
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {},
  triggerSeconds: number = 0
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: triggerSeconds > 0
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: triggerSeconds,
          repeats: false,
        }
      : null,
  })
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// Daily streak reminder at 6pm local time. Uses the DAILY trigger so the OS
// re-fires it every day automatically — no manual rescheduling needed.
//
// We cancel and rebuild on every dashboard load so the streak count in the
// body text stays current (it's baked in at schedule time).
export async function scheduleStreakReminder(
  studentName: string,
  currentStreak: number
): Promise<void> {
  await cancelStreakReminder()

  const body = currentStreak > 0
    ? `You have a ${currentStreak}-day streak to protect! Practice one Maths skill today.`
    : 'Start a new streak today! Practice one Maths skill.'

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: {
        title: `🔥 Don't break your streak, ${studentName}!`,
        body,
        data: { type: 'streak_reminder' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    })
  } catch (err: any) {
    // Don't crash the dashboard if scheduling fails (e.g. simulator).
    console.log('[notifications] streak schedule failed:', err?.message)
  }
}

export async function cancelStreakReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID)
  } catch {
    // No-op if not scheduled.
  }
}

// Fire immediately — used for badge / skill mastery moments.
export async function showAchievementNotification(
  title: string,
  body: string,
  type: string
): Promise<void> {
  await scheduleLocalNotification(title, body, { type }, 0)
}
