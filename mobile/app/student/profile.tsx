import { useState, useEffect, useMemo} from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenBackground } from '../../lib/ui'
import { studentAPI } from '../../lib/api'
import ThemeToggle from '../../components/ThemeToggle'
import SupportSheet from '../../components/SupportSheet'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import CharacterAvatar, { CharacterSVG } from '../../components/CharacterAvatar'
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../../lib/characterAvatars'

export default function Profile() {
  const router = useRouter()
  const { colors } = useTheme()
  const p = useMemo(() => makeStyles(colors), [colors])
  const [student, setStudent] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinSaving, setPinSaving] = useState(false)

  // Avatar picker state
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [showSupport, setShowSupport] = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function chooseAvatar(id: string) {
    if (avatarSaving) return
    const prev = student?.avatar
    setStudent((s: any) => ({ ...s, avatar: id }))  // optimistic
    setAvatarSaving(true)
    try {
      const sid = (await SecureStore.getItemAsync('user_id')) || ''
      await studentAPI.setCharacter(sid, id)
      setShowAvatarModal(false)
    } catch {
      setStudent((s: any) => ({ ...s, avatar: prev }))
      Alert.alert('Oops', 'Could not save your hero. Please try again.')
    } finally {
      setAvatarSaving(false)
    }
  }

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
    <ScreenBackground>
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
          <TouchableOpacity
            style={{ marginBottom: 10 }}
            onPress={() => setShowAvatarModal(true)}
            activeOpacity={0.85}
          >
            <CharacterAvatar id={student?.avatar} size={96} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAvatarModal(true)} activeOpacity={0.7}>
            <Text style={p.changeHero}>✨ Change Hero</Text>
          </TouchableOpacity>
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

        {/* Stats Grid (loaded from real API) — modern cards with icon chips */}
        {!loading && student && (
          <View style={p.statsGrid}>
            {[
              { label: 'Streak',    value: `${student?.streak || 0} days`, emoji: '🔥', grad: ['#FB923C', '#EA580C'] },
              { label: 'Coins',     value: student?.coins || 0,            emoji: '🪙', grad: ['#FCD34D', '#D97706'] },
              { label: 'Mastered',  value: stats?.mastered || 0,           emoji: '🏆', grad: ['#34D399', '#059669'] },
              { label: 'Accuracy',  value: `${stats?.accuracy || 0}%`,     emoji: '🎯', grad: ['#F87171', '#DC2626'] },
              { label: 'This Week', value: stats?.totalQuestionsThisWeek || 0, emoji: '📝', grad: ['#A78BFA', '#7C3AED'] },
              { label: 'Sessions',  value: student?.sessions_completed || 0,  emoji: '📚', grad: ['#60A5FA', '#2563EB'] },
            ].map((s, i) => (
              <View key={i} style={p.statCard}>
                <View style={[p.statChip, { backgroundColor: s.grad[1] }]}>
                  <Text style={p.statEmoji}>{s.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={p.statValue}>{s.value}</Text>
                  <Text style={p.statLabel}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {loading && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color="#C49A1A" />
          </View>
        )}

        {/* Rewards */}
        <TouchableOpacity
          style={p.voucherCard}
          onPress={() => router.push('/student/vouchers')}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 28 }}>🎟️</Text>
            <View>
              <Text style={p.voucherTitle}>Hero Vouchers</Text>
              <Text style={p.voucherSub}>Redeem points for Hero Arcade Credits</Text>
            </View>
          </View>
          <Text style={p.voucherArrow}>›</Text>
        </TouchableOpacity>

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

        {/* Display Theme */}
        <View style={[p.section, {
          backgroundColor: colors.bgCard,
          borderColor: colors.borderColor,
        }]}>
          <Text style={[p.sectionTitle, { color: colors.textPrimary }]}>
            🎨 Display Theme
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
            Choose how the app looks for you
          </Text>
          <ThemeToggle compact={false} />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 8 }}>
            👁️ Colour-Safe mode helps colourblind students
          </Text>
        </View>

        <TouchableOpacity style={p.supportBtn} onPress={() => setShowSupport(true)}>
          <Text style={p.supportText}>🎫 Help & Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={p.logoutBtn} onPress={handleLogout}>
          <Text style={p.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <SupportSheet visible={showSupport} onClose={() => setShowSupport(false)} />

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

      {/* Avatar picker modal */}
      <Modal visible={showAvatarModal} transparent animationType="slide" onRequestClose={() => setShowAvatarModal(false)}>
        <View style={p.modalOverlay}>
          <View style={p.avatarSheet}>
            <View style={p.avatarSheetHeader}>
              <Text style={p.modalTitle}>Choose Your Hero</Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)} hitSlop={10}>
                <Text style={{ color: colors.textMuted, fontSize: 20, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={p.avatarGrid}>
              {CHARACTER_AVATARS.map(char => {
                const isSel = (student?.avatar || DEFAULT_AVATAR_ID) === char.id
                return (
                  <TouchableOpacity
                    key={char.id}
                    style={[p.avatarOption, isSel && p.avatarOptionSel]}
                    onPress={() => chooseAvatar(char.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', marginBottom: 6 }}>
                      <CharacterSVG char={char} size={64} />
                    </View>
                    <Text style={p.avatarName} numberOfLines={1}>{char.name}</Text>
                    {isSel && <View style={p.avatarOnBadge}><Text style={p.avatarOnText}>ON</Text></View>}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16, backgroundColor: 'transparent' },
  back: { color: c.accentGold, fontWeight: '700', fontSize: 15 },
  title: { color: c.textPrimary, fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },

  heroCard: { backgroundColor: c.bgCard, margin: 16,
    borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 2, borderColor: c.accentGold,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  heroName: { color: c.textPrimary, fontWeight: '800', fontSize: 22, marginBottom: 4 },
  heroGrade: { color: c.accentGold, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  heroLevel: { color: c.textMuted, fontSize: 13, marginBottom: 14 },
  xpBarBg: { width: '80%', height: 8, backgroundColor: c.borderColor,
    borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  xpBarFill: { height: '100%', backgroundColor: c.accentGold, borderRadius: 4 },
  xpLabel: { color: c.textSecondary, fontSize: 12 },

  changeHero: { color: c.accentGold, fontSize: 13, fontWeight: '700', marginBottom: 10 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, marginBottom: 16 },
  statCard: { backgroundColor: c.bgCard, borderRadius: 16,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, width: '47%',
    borderWidth: 1, borderColor: c.borderColor,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statChip: { width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center' },
  statEmoji: { fontSize: 19 },
  statValue: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
  statLabel: { fontSize: 11, color: c.textMuted, marginTop: 1 },

  avatarSheet: { backgroundColor: c.bgCard, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 32, maxHeight: '78%' },
  avatarSheetHeader: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 16, justifyContent: 'center' },
  avatarOption: { backgroundColor: c.bgPrimary, borderRadius: 16,
    padding: 10, alignItems: 'center', width: '29%',
    borderWidth: 2, borderColor: c.borderColor },
  avatarOptionSel: { borderColor: '#C49A1A' },
  avatarName: { fontSize: 10, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
  avatarOnBadge: { position: 'absolute', top: 4, right: 4,
    backgroundColor: '#C49A1A', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  avatarOnText: { color: 'white', fontSize: 8, fontWeight: '800' },

  section: { backgroundColor: c.bgCard, borderRadius: 16,
    padding: 18, marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary, marginBottom: 14 },
  voucherCard: {
    backgroundColor: c.bgHeader, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: '#C49A1A',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  voucherTitle: { color: c.accentGold, fontWeight: '800', fontSize: 15 },
  voucherSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  voucherArrow: { color: c.accentGold, fontSize: 22, fontWeight: '700' },

  actionBtn: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#F0F4F8' },
  actionBtnText: { fontSize: 15, color: c.textPrimary, fontWeight: '600' },
  actionBtnArrow: { fontSize: 20, color: c.textMuted },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F0F4F8' },
  infoLabel: { color: c.textSecondary, fontSize: 14 },
  infoValue: { color: c.textPrimary, fontWeight: '700', fontSize: 14 },

  supportBtn: { marginHorizontal: 16, marginBottom: 12, backgroundColor: c.bgCard,
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: c.accentGold },
  supportText: { color: c.textPrimary, fontWeight: '800', fontSize: 16 },

  logoutBtn: { marginHorizontal: 16, backgroundColor: c.errorBg,
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#EF4444' },
  logoutText: { color: c.error, fontWeight: '800', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' },
  modalCard: { backgroundColor: c.bgCard, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 28 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary,
    marginBottom: 6, textAlign: 'center' },
  modalSub: { fontSize: 13, color: c.textSecondary, textAlign: 'center', marginBottom: 18 },
  modalInput: { borderWidth: 1.5, borderColor: c.borderColor,
    borderRadius: 12, padding: 14, fontSize: 16,
    color: c.textPrimary, marginBottom: 12 },
  modalBtn: { backgroundColor: c.bgHeader, borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: '#C49A1A', marginTop: 4 },
  modalBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
})
