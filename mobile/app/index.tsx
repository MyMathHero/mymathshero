import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { MobileAnalytics } from '../lib/analytics'

export default function Index() {
  const router = useRouter()

  // The splash overlay in _layout.tsx is what the user sees first; this screen
  // just decides where to send them once auth is checked.
  useEffect(() => {
    MobileAnalytics.appOpened()
    // Small delay to ensure the router has fully mounted on iPad before
    // we issue a replace() — guards against the "navigate before root layout
    // mounted" error in production iOS builds.
    const timer = setTimeout(() => { checkAuth() }, 200)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkAuth() {
    try {
      const token = await SecureStore.getItemAsync('auth_token')
      const role = await SecureStore.getItemAsync('user_role')

      if (!token) {
        router.replace('/login')
        return
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
