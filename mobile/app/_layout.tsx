import { useState, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { LogBox } from 'react-native'
import SplashAnimation from '../components/SplashAnimation'
import { ThemeProvider } from '../lib/themeContext'

// Suppress known non-critical warnings that can spam the console in prod.
LogBox.ignoreLogs([
  'Warning: useInsertionEffect',
  'Possible Unhandled Promise',
  'Non-serializable values',
  'VirtualizedLists should never be nested',
])

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false)

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true)
  }, [])

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="light" />

        {/* Navigator always mounted (so navigation state is preserved) but
            hidden under the splash until the animation finishes. opacity:0
            while splash is up means the user only sees navy. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { opacity: splashDone ? 1 : 0 },
          ]}
          // pointerEvents: 'none' while splash is up so taps fall through to nothing
          // (the splash overlay below handles all touches).
          pointerEvents={splashDone ? 'auto' : 'none'}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
            }}
          />
        </View>

        {/* Splash overlays everything until onFinish fires. absoluteFill + a high
            zIndex guarantees it sits on top of the Stack regardless of mount order. */}
        {!splashDone && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
            <SplashAnimation onFinish={handleSplashFinish} />
          </View>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
