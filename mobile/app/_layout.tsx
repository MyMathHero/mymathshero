import { useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { LogBox } from 'react-native'
import SplashAnimation from '../components/SplashAnimation'

// Suppress known non-critical warnings that can spam the console in prod.
LogBox.ignoreLogs([
  'Warning: useInsertionEffect',
  'Possible Unhandled Promise',
  'Non-serializable values',
])

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      {!splashDone && (
        <SplashAnimation onFinish={() => setSplashDone(true)} />
      )}
    </SafeAreaProvider>
  )
}
