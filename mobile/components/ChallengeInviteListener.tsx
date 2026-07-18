import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Modal, Image } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { studentAPI } from '../lib/api'
import { useTheme } from '../lib/themeContext'
import CharacterAvatar from './CharacterAvatar'

// App-wide challenge presence + incoming-request popup (mobile). Mounted on the
// student dashboard so a student is invitable + can Accept/Decline a Hero Speed
// Challenge without being on the Challenge screen. Accepting routes to the
// Challenge tab, which resumes the active match.
const isEmoji = (v: any) => typeof v === 'string' && !/^[a-z0-9_]+$/i.test(v.trim())
const gradeLbl = (g: any) => (g == null ? '' : g === 0 ? 'Prep' : `Grade ${g}`)

function Face({ from, size = 64 }: { from: any; size?: number }) {
  if (from?.photo) return <Image source={{ uri: from.photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  if (from?.avatarConfig || (from?.avatar && !isEmoji(from.avatar))) {
    return <CharacterAvatar id={from.avatar} config={from.avatarConfig} size={size} />
  }
  return <CharacterAvatar id={null} size={size} />
}

export default function ChallengeInviteListener({ enabled = true }: { enabled?: boolean }) {
  const { colors } = useTheme()
  const router = useRouter()
  const [studentId, setStudentId] = useState('')
  const [incoming, setIncoming] = useState<any>(null)
  const beatRef = useRef<any>(null)
  const inboxRef = useRef<any>(null)

  useEffect(() => {
    (async () => setStudentId((await SecureStore.getItemAsync('user_id')) || ''))()
  }, [])

  // App-wide availability heartbeat.
  useEffect(() => {
    if (!studentId || !enabled) return
    const beat = () => studentAPI.presence(studentId, true).catch(() => {})
    beat()
    beatRef.current = setInterval(beat, 30000)
    return () => clearInterval(beatRef.current)
  }, [studentId, enabled])

  // Poll for incoming invites.
  useEffect(() => {
    if (!studentId || !enabled) return
    const tick = async () => {
      const d = await studentAPI.challenge(studentId, 'inbox', {}).then((r: any) => r.data).catch(() => null)
      setIncoming(d?.invite || null)
    }
    tick()
    inboxRef.current = setInterval(tick, 3000)
    return () => clearInterval(inboxRef.current)
  }, [studentId, enabled])

  async function accept() {
    const inv = incoming
    if (!inv) return
    setIncoming(null)
    const data = await studentAPI.challenge(studentId, 'accept', { inviteId: inv.inviteId }).then((r: any) => r.data).catch(() => null)
    if (data?.match) router.push('/student/league')
  }
  async function decline() {
    const inv = incoming
    setIncoming(null)
    if (inv) await studentAPI.challenge(studentId, 'decline', { inviteId: inv.inviteId }).catch(() => {})
  }

  return (
    <Modal visible={!!incoming?.from} transparent animationType="fade" onRequestClose={decline}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center', borderWidth: 2, borderColor: colors.accentGold }}>
          <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: 12 }}>CHALLENGE REQUEST</Text>
          <Face from={incoming?.from} size={64} />
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 18, marginTop: 8 }}>{incoming?.from?.firstName}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{gradeLbl(incoming?.from?.grade)}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 16, textAlign: 'center' }}>invited you to a Hero Speed Challenge!</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={decline} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={accept} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.accentGold, alignItems: 'center' }}>
              <Text style={{ color: '#1B2B4B', fontWeight: '800' }}>Accept →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
