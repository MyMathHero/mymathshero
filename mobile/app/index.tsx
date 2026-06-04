import { useEffect, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as Notifications from 'expo-notifications'
import type { EventSubscription } from 'expo-modules-core'
import { MobileAnalytics } from '../lib/analytics'
import { registerForPushNotifications } from '../lib/notifications'

export default function Index() {
  const router = useRouter()
  const receivedSub = useRef<EventSubscription | null>(null)
  const responseSub = useRef<EventSubscription | null>(null)

  // The splash overlay in _layout.tsx is what the user sees first; this screen
  // just decides where to send them once auth is checked.
  useEffect(() => {
    MobileAnalytics.appOpened()

    // Foreground notification observer — keep it so we can react in-app later
    // (e.g. refresh a card when a streak ping arrives). Currently just logs.
    receivedSub.current = Notifications.addNotificationReceivedListener(n => {
      console.log('[notifications] received:', n.request.identifier)
    })

    // User tapped a notification — route based on payload type.
    responseSub.current = Notifications.addNotificationResponseReceivedListener(r => {
      const data = r.notification.request.content.data as any
      handleNotificationTap(data)
    })

    // Small delay to ensure the router has fully mounted on iPad before
    // we issue a replace() — guards against the "navigate before root layout
    // mounted" error in production iOS builds.
    const timer = setTimeout(() => { checkAuth() }, 200)
    return () => {
      clearTimeout(timer)
      receivedSub.current?.remove()
      responseSub.current?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleNotificationTap(data: any) {
    switch (data?.type) {
      case 'streak_reminder':
      case 'badge_earned':
      case 'skill_mastered':
        router.replace('/student/dashboard')
        break
      case 'hero_report':
        router.replace('/parent/dashboard')
        break
      default:
        break
    }
  }

  async function checkAuth() {
    try {
      const token = await SecureStore.getItemAsync('auth_token')
      const role = await SecureStore.getItemAsync('user_role')
      const userId = await SecureStore.getItemAsync('user_id')

      if (!token) {
        router.replace('/login')
        return
      }

      // Best-effort push registration for students. Permissions prompt iOS
      // users on first launch; failures are logged and swallowed inside
      // registerForPushNotifications so we never block navigation.
      if (role === 'student' && userId) {
        registerForPushNotifications(userId).catch(() => {})
      }

      if (role === 'student') {
        router.replace('/student/dashboard')
      } else if (role === 'parent') {
        router.replace('/parent/dashboard')
      } else {
        router.replace('/login')
      }
    } catch {
      try { router.replace('/login') } catch {}
    }
  }

  // Empty navy view — the splash is on top covering this anyway.
  return <View style={styles.container} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B2B4B',
  },
})
