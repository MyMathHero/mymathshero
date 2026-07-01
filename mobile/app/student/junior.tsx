import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenBackground } from '../../lib/ui'
import HeroRobot from '../../components/HeroRobot'
import { JUNIOR_WORLDS } from '../../lib/juniorMode'
import { speak, stopSpeaking } from '../../lib/heroVoice'

// Mobile Junior Home (Prep–3) — Hero-first, reading-light. Mirrors web JuniorHome.

const NAVY = '#1B2B4B', GOLD = '#C49A1A'

export default function JuniorHome() {
  const router = useRouter()
  const [name, setName] = useState('friend')
  const [started, setStarted] = useState(false)
  const spoken = useRef(false)

  useEffect(() => {
    (async () => {
      const n = (await SecureStore.getItemAsync('user_name')) || 'friend'
      setName(String(n).split(' ')[0])
    })()
    return () => { void stopSpeaking() }
  }, [])

  function start() {
    setStarted(true)
    if (!spoken.current) {
      spoken.current = true
      void speak(`Hi ${name}! Let's play some maths games. Pick a world, or tap surprise me and I'll choose one for you!`)
    }
  }
  function openWorld(worldId: string) {
    void stopSpeaking()
    router.push({ pathname: '/student/junior-play', params: { world: worldId } })
  }
  function surprise() {
    void stopSpeaking()
    router.push('/student/junior-play')
  }
  // Junior mode never shows the tab bar / profile, so logout must live here.
  function logout() {
    void stopSpeaking()
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          await Promise.all([
            SecureStore.deleteItemAsync('auth_token'),
            SecureStore.deleteItemAsync('user_role'),
            SecureStore.deleteItemAsync('user_id'),
            SecureStore.deleteItemAsync('user_name'),
            SecureStore.deleteItemAsync('user_grade'),
          ])
          router.replace('/login')
        },
      },
    ])
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={s.container} edges={['top']}>
        {/* Top bar with a discreet log-out (kids can't reach the profile tab here). */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={logout} style={s.logoutBtn} hitSlop={10}>
            <Text style={s.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll}>
          <HeroRobot mood="waving" size={150} containerStyle="card" />
          {!started ? (
            <>
              <Text style={s.hi}>Hi {name}! 👋</Text>
              <Text style={s.sub}>Ready to play some maths games?</Text>
              <TouchableOpacity style={s.goBtn} onPress={start}>
                <Text style={s.goBtnText}>▶ Let’s go!</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.pick}>Pick a world, {name}!</Text>
              <TouchableOpacity style={s.surprise} onPress={surprise}>
                <Text style={s.surpriseText}>🎲  Surprise me!</Text>
              </TouchableOpacity>
              <View style={s.grid}>
                {JUNIOR_WORLDS.map(w => (
                  <TouchableOpacity key={w.id} style={s.tile} onPress={() => openWorld(w.id)} activeOpacity={0.85}>
                    <Text style={s.tileEmoji}>{w.emoji}</Text>
                    <Text style={s.tileName}>{w.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(27,43,75,0.06)', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14 },
  logoutText: { color: NAVY, fontWeight: '700', fontSize: 13 },
  scroll: { alignItems: 'center', padding: 20, paddingBottom: 48 },
  hi: { fontSize: 30, fontWeight: '900', color: NAVY, marginTop: 8 },
  sub: { fontSize: 17, color: '#475569', marginTop: 4, marginBottom: 24 },
  goBtn: { backgroundColor: GOLD, borderRadius: 24, paddingVertical: 18, paddingHorizontal: 52 },
  goBtnText: { color: 'white', fontSize: 24, fontWeight: '900' },
  pick: { fontSize: 24, fontWeight: '900', color: NAVY, marginTop: 8, marginBottom: 14 },
  surprise: { backgroundColor: NAVY, borderColor: GOLD, borderWidth: 3, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 36, marginBottom: 20 },
  surpriseText: { color: 'white', fontSize: 20, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  tile: { width: 150, backgroundColor: 'white', borderColor: '#E2E8F0', borderWidth: 3, borderRadius: 22, paddingVertical: 20, alignItems: 'center' },
  tileEmoji: { fontSize: 46, marginBottom: 6 },
  tileName: { color: NAVY, fontWeight: '800', fontSize: 15, textAlign: 'center' },
})
