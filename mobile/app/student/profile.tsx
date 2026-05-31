import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'
import { studentAPI } from '../../lib/api'

export default function Profile() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinSaving, setPinSaving] = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const id = (await SecureStore.getItemAsync('user_id')) || ''
      if (!id) return
      const res = await studentAPI.progress(id)
      setStudent(res?.data?.student || null)
      setStats(res?.data?.stats || null)
    } catch (err) {
      console.error('Profile load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
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

  function closePinModal() {
    setShowPinModal(false)
    setNewPin('')
    setConfirmPin('')
    setPinSaving(false)
  }

  async function handleChangePin() {
    if (!/^\d{4}$/.test(newPin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 numbers')
      return
    }
    if (newPin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match')
      return
    }
    setPinSaving(true)
    try {
      const studentId = await SecureStore.getItemAsync('user_id')
      if (!studentId) {
        Alert.alert('Not signed in', 'Please log out and log back in.')
        return
      }
      const res = await studentAPI.changePin(studentId, newPin)
      if (res?.data?.success) {
        Alert.alert('Success', 'PIN updated successfully!')
        closePinModal()
      } else {
        Alert.alert('Error', res?.data?.error || 'Could not update PIN.')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error
      Alert.alert('Error', msg || 'Could not update PIN. Please try again.')
    } finally {
      setPinSaving(false)
    }
  }

  const xp = student?.xp || 0
  const xpProgress = xp % 100

  return (
    <SafeAreaView style={p.safe}>
      <View style={p.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={p.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={p.title}>My Profile</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Hero Identity Card */}
        <View style={p.heroCard}>
          <View style={p.avatarCircle}>
            <Text style={p.avatarEmoji}>{student?.avatar || '🦸'}</Text>
          </View>
          <Text style={p.heroName}>{student?.name || 'Hero'}</Text>
          <Text style={p.heroGrade}>
            Year {student?.grade ?? '—'} Maths Hero
          </Text>
          <Text style={p.heroLevel}>Level {student?.level || 1}</Text>

          {/* XP progress bar */}
          <View style={p.xpBarBg}>
            <View style={[p.xpBarFill, { width: `${Math.min(100, xpProgress)}%` as any }]} />
          </View>
          <Text style={p.xpLabel}>{xp} Hero Points</Text>
        </View>

        {/* Stats Grid (loaded from real API) */}
        {!loading && student && (
          <View style={p.statsGrid}>
            {[
              { label: 'Streak',    value: `${student?.streak || 0} days`, emoji: '🔥' },
              { label: 'Coins',     value: student?.coins || 0,            emoji: '🪙' },
              { label: 'Mastered',  value: stats?.mastered || 0,           emoji: '🏆' },
              { label: 'Accuracy',  value: `${stats?.accuracy || 0}%`,     emoji: '🎯' },
              { label: 'This Week', value: stats?.totalQuestionsThisWeek || 0, emoji: '📝' },
              { label: 'Sessions',  value: student?.sessions_completed || 0,  emoji: '📚' },
            ].map((s, i) => (
              <View key={i} style={p.statCard}>
                <Text style={p.statEmoji}>{s.emoji}</Text>
                <Text style={p.statValue}>{s.value}</Text>
                <Text style={p.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {loading && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color="#C49A1A" />
          </View>
        )}

        {/* Account section */}
        <View style={p.section}>
          <Text style={p.sectionTitle}>⚙️ Account</Text>

          <TouchableOpacity style={p.actionBtn} onPress={() => setShowPinModal(true)}>
            <Text style={p.actionBtnText}>🔐 Change PIN</Text>
            <Text style={p.actionBtnArrow}>›</Text>
          </TouchableOpacity>

          <View style={p.infoRow}>
            <Text style={p.infoLabel}>Username</Text>
            <Text style={p.infoValue}>{student?.username || '—'}</Text>
          </View>
          <View style={p.infoRow}>
            <Text style={p.infoLabel}>Year Level</Text>
            <Text style={p.infoValue}>
              {student?.grade != null ? `Year ${student.grade}` : '—'}
            </Text>
          </View>
          <View style={[p.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={p.infoLabel}>App Version</Text>
            <Text style={p.infoValue}>1.0.1</Text>
          </View>
        </View>

        <TouchableOpacity style={p.logoutBtn} onPress={handleLogout}>
          <Text style={p.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Change PIN Modal — real API call */}
      <Modal visible={showPinModal} transparent animationType="slide" onRequestClose={closePinModal}>
        <View style={p.modalOverlay}>
          <View style={p.modalCard}>
            <Text style={p.modalTitle}>Change PIN 🔐</Text>
            <Text style={p.modalSub}>
              Pick a new 4-digit PIN. You&apos;ll use this to log in next time.
            </Text>

            <TextInput
              style={p.modalInput}
              placeholder="New 4-digit PIN"
              value={newPin}
              onChangeText={t => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={p.modalInput}
              placeholder="Confirm new PIN"
              value={confirmPin}
              onChangeText={t => setConfirmPin(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[p.modalBtn, pinSaving && { opacity: 0.6 }]}
              onPress={handleChangePin}
              disabled={pinSaving}
            >
              {pinSaving
                ? <ActivityIndicator color="white" />
                : <Text style={p.modalBtnText}>Update PIN</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={closePinModal}
              style={{ marginTop: 12, alignItems: 'center' }}
              disabled={pinSaving}
            >
              <Text style={{ color: '#64748B', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const p = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16, backgroundColor: '#1B2B4B' },
  back: { color: '#C49A1A', fontWeight: '700', fontSize: 15 },
  title: { color: 'white', fontWeight: '800', fontSize: 18 },

  heroCard: { backgroundColor: '#1B2B4B', margin: 16,
    borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 2, borderColor: '#C49A1A' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(196,154,26,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#C49A1A', marginBottom: 12 },
  avatarEmoji: { fontSize: 44 },
  heroName: { color: 'white', fontWeight: '800', fontSize: 22, marginBottom: 4 },
  heroGrade: { color: '#C49A1A', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  heroLevel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 14 },
  xpBarBg: { width: '80%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  xpBarFill: { height: '100%', backgroundColor: '#C49A1A', borderRadius: 4 },
  xpLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, marginBottom: 16 },
  statCard: { backgroundColor: 'white', borderRadius: 14,
    padding: 14, alignItems: 'center', width: '31%',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: '800', color: '#1B2B4B' },
  statLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2, textAlign: 'center' },

  section: { backgroundColor: 'white', borderRadius: 16,
    padding: 18, marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1B2B4B', marginBottom: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#F0F4F8' },
  actionBtnText: { fontSize: 15, color: '#1B2B4B', fontWeight: '600' },
  actionBtnArrow: { fontSize: 20, color: '#94A3B8' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F0F4F8' },
  infoLabel: { color: '#64748B', fontSize: 14 },
  infoValue: { color: '#1B2B4B', fontWeight: '700', fontSize: 14 },

  logoutBtn: { marginHorizontal: 16, backgroundColor: '#FEE2E2',
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#EF4444' },
  logoutText: { color: '#EF4444', fontWeight: '800', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 28 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1B2B4B',
    marginBottom: 6, textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 18 },
  modalInput: { borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 14, fontSize: 16,
    color: '#1B2B4B', marginBottom: 12 },
  modalBtn: { backgroundColor: '#1B2B4B', borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: '#C49A1A', marginTop: 4 },
  modalBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
})
