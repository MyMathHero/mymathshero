import { useState, useEffect, useMemo} from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenBackground } from '../../lib/ui'
import ParentTabBar from '../../components/ParentTabBar'
import api from '../../lib/api'
import CharacterAvatar from '../../components/CharacterAvatar'
import SupportSheet from '../../components/SupportSheet'
import { isCharacterId } from '../../lib/characterAvatars'

export default function ParentAccountScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [parentData, setParentData] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [subStatus, setSubStatus] = useState<any>(null)
  const [parentId, setParentId] = useState('')
  const [showSupport, setShowSupport] = useState(false)

  // Inline name + email editing (matches the web Account Settings page).
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Change password
  const [showChangePw, setShowChangePw] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  // Add child
  const [showAddChild, setShowAddChild] = useState(false)
  const [childName, setChildName] = useState('')
  const [childGrade, setChildGrade] = useState('3')
  const [childPin, setChildPin] = useState('')
  const [addChildLoading, setAddChildLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const pId = (await SecureStore.getItemAsync('user_id')) || ''
      setParentId(pId)

      const [profileRes, childrenRes, subRes] =
        await Promise.all([
          // /me only carries name from the JWT; this gated route returns the
          // canonical name + email from the parents collection so the Profile
          // section can show real values and the inline edit can do a diff.
          api.get(`/api/parent/update-profile`),
          api.get(`/api/parent/children?parentId=${pId}`),
          api.get(`/api/payments/status?parentId=${pId}`),
        ])

      const profile = profileRes.data?.profile || {}
      setParentData(profile)
      setNameInput(profile?.name || '')
      setEmailInput(profile?.email || '')
      setChildren(childrenRes.data?.children || [])
      setSubStatus(subRes.data || {})
    } catch (err) {
      console.log('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function saveName() {
    const cleaned = nameInput.trim()
    if (!cleaned) {
      Alert.alert('Error', 'Name cannot be empty')
      return
    }
    if (cleaned === parentData?.name) {
      setEditingName(false)
      return
    }
    setSavingProfile(true)
    try {
      const res = await api.post('/api/parent/update-profile', { name: cleaned })
      if (res.data?.success) {
        setParentData((prev: any) => ({ ...(prev || {}), name: cleaned }))
        setEditingName(false)
        Alert.alert('✅ Updated', 'Your name has been updated.')
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to update name')
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Connection error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveEmail() {
    const cleaned = emailInput.trim().toLowerCase()
    if (!cleaned.includes('@') || cleaned.length < 5) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.')
      return
    }
    if (cleaned === parentData?.email) {
      setEditingEmail(false)
      return
    }
    setSavingProfile(true)
    try {
      const res = await api.post('/api/parent/update-profile', { email: cleaned })
      if (res.data?.success) {
        setParentData((prev: any) => ({ ...(prev || {}), email: cleaned }))
        setEditingEmail(false)
        Alert.alert('✅ Updated', 'Your email has been updated.')
      } else {
        Alert.alert('Error', res.data?.error || 'That email is already in use.')
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Connection error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    if (newPw !== confirmPw) {
      Alert.alert('Error', 'New passwords do not match')
      return
    }
    if (newPw.length < 8) {
      Alert.alert('Error',
        'Password must be at least 8 characters')
      return
    }
    setPwLoading(true)
    try {
      const res = await api.post('/api/auth/change-password', {
        currentPassword: currentPw,
        newPassword: newPw,
      })
      if (res.data.success) {
        Alert.alert('✅ Success', 'Password changed!')
        setShowChangePw(false)
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
      } else {
        Alert.alert('Error', res.data.error ||
          'Failed to change password')
      }
    } catch {
      Alert.alert('Error', 'Connection error')
    } finally {
      setPwLoading(false)
    }
  }

  function handleResetChildPin(child: any) {
    // Alert.prompt is iOS-only; on Android we fall back to the web account page.
    if (Alert.prompt) {
      Alert.prompt(
        `Reset PIN for ${child.name}`,
        'Enter new 4-digit PIN',
        async (newPin?: string) => {
          if (!newPin || !/^\d{4}$/.test(newPin)) {
            Alert.alert('Error', 'PIN must be 4 digits')
            return
          }
          try {
            const res = await api.post(
              '/api/parent/reset-child-pin',
              { parentId, studentId: child.id, newPin }
            )
            if (res.data.success) {
              Alert.alert('✅ Done',
                `PIN reset for ${child.name}`)
            } else {
              Alert.alert('Error', res.data.error ||
                'Failed to reset PIN')
            }
          } catch {
            Alert.alert('Error', 'Connection error')
          }
        },
        'plain-text',
        '',
        'number-pad'
      )
    } else {
      Alert.alert(
        'Reset PIN',
        `To reset ${child.name}'s PIN, open your account on mymathshero.com.au.`,
      )
    }
  }

  async function handleAddChild() {
    if (!childName.trim()) {
      Alert.alert('Error', 'Enter child name')
      return
    }
    if (!/^\d{4}$/.test(childPin)) {
      Alert.alert('Error', 'PIN must be 4 digits')
      return
    }

    // Check if sibling add-on needed
    if (children.length >= 1) {
      Alert.alert(
        'Sibling Add-on Required',
        'Adding another child costs $10/month. This will open the payment page.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              router.push('/parent/subscribe')
            },
          },
        ]
      )
      return
    }

    setAddChildLoading(true)
    try {
      const res = await api.post('/api/parent/add-child', {
        parentId,
        name: childName.trim(),
        grade: parseInt(childGrade),
        pin: childPin,
      })
      if (res.data.success) {
        Alert.alert('✅ Done',
          `${childName} added successfully!`)
        setShowAddChild(false)
        setChildName('')
        setChildGrade('3')
        setChildPin('')
        loadData()
      } else {
        Alert.alert('Error', res.data.error ||
          'Failed to add child')
      }
    } catch {
      Alert.alert('Error', 'Connection error')
    } finally {
      setAddChildLoading(false)
    }
  }

  async function handleLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('auth_token')
            await SecureStore.deleteItemAsync('user_id')
            await SecureStore.deleteItemAsync('user_role')
            await SecureStore.deleteItemAsync('user_name')
            router.replace('/login')
          },
        },
      ]
    )
  }

  function openBillingPortal() {
    router.push('/parent/manage-subscription')
  }

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#C49A1A" size="large" />
      </View>
    )
  }

  const isActive = subStatus?.status === 'active' ||
    subStatus?.status === 'trialing' ||
    subStatus?.subscriptionStatus === 'active' ||
    subStatus?.subscriptionStatus === 'trialing'

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#C49A1A',
              fontWeight: '700', fontSize: 15 }}>
              ← Back
            </Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Account</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* PROFILE SECTION */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>PROFILE</Text>
          <View style={s.card}>
            {/* Name row — tap Edit to inline-edit, save POSTs /update-profile */}
            {!editingName ? (
              <View style={[s.row, { flexDirection: 'row',
                alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.label}>Name</Text>
                  <Text style={s.value}>{parentData?.name || '—'}</Text>
                </View>
                <TouchableOpacity onPress={() => {
                  setNameInput(parentData?.name || '')
                  setEditingName(true)
                }}>
                  <Text style={{ color: colors.accentGold, fontWeight: '700', fontSize: 14 }}>Edit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.row}>
                <Text style={s.label}>Name</Text>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  editable={!savingProfile}
                  style={{
                    borderWidth: 1.5, borderColor: colors.borderColor,
                    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                    fontSize: 15, color: colors.textPrimary, marginTop: 6,
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => setEditingName(false)}
                    disabled={savingProfile}
                    style={{ flex: 1, padding: 10, borderRadius: 10,
                      backgroundColor: colors.bgCard, borderWidth: 1,
                      borderColor: colors.borderColor, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveName}
                    disabled={savingProfile}
                    style={{ flex: 2, padding: 10, borderRadius: 10,
                      backgroundColor: colors.bgHeader, borderWidth: 2,
                      borderColor: colors.accentGold, alignItems: 'center' }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700' }}>
                      {savingProfile ? 'Saving…' : 'Save Name'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Email row — same pattern */}
            {!editingEmail ? (
              <View style={[s.row, { borderTopWidth: 1,
                borderTopColor: colors.borderLight,
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between' }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.label}>Email</Text>
                  <Text style={[s.value, { fontSize: 13 }]}>{parentData?.email || '—'}</Text>
                </View>
                <TouchableOpacity onPress={() => {
                  setEmailInput(parentData?.email || '')
                  setEditingEmail(true)
                }}>
                  <Text style={{ color: colors.accentGold, fontWeight: '700', fontSize: 14 }}>Edit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[s.row, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                <Text style={s.label}>Email</Text>
                <TextInput
                  value={emailInput}
                  onChangeText={setEmailInput}
                  autoFocus
                  editable={!savingProfile}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={{
                    borderWidth: 1.5, borderColor: colors.borderColor,
                    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                    fontSize: 15, color: colors.textPrimary, marginTop: 6,
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => setEditingEmail(false)}
                    disabled={savingProfile}
                    style={{ flex: 1, padding: 10, borderRadius: 10,
                      backgroundColor: colors.bgCard, borderWidth: 1,
                      borderColor: colors.borderColor, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveEmail}
                    disabled={savingProfile}
                    style={{ flex: 2, padding: 10, borderRadius: 10,
                      backgroundColor: colors.bgHeader, borderWidth: 2,
                      borderColor: colors.accentGold, alignItems: 'center' }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700' }}>
                      {savingProfile ? 'Saving…' : 'Save Email'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={s.actionRow}
              onPress={() => setShowChangePw(!showChangePw)}
            >
              <Text style={s.actionText}>
                🔑 Change Password
              </Text>
              <Text style={{ color: '#94A3B8' }}>
                {showChangePw ? '▲' : '▶'}
              </Text>
            </TouchableOpacity>

            {showChangePw && (
              <View style={{ padding: 16,
                backgroundColor: '#F8FAFC',
                borderRadius: 12, margin: 12 }}>
                {[
                  { placeholder: 'Current password',
                    value: currentPw,
                    set: setCurrentPw },
                  { placeholder: 'New password',
                    value: newPw,
                    set: setNewPw },
                  { placeholder: 'Confirm new password',
                    value: confirmPw,
                    set: setConfirmPw },
                ].map((f, i) => (
                  <TextInput
                    key={i}
                    placeholder={f.placeholder}
                    value={f.value}
                    onChangeText={f.set}
                    secureTextEntry
                    style={s.input}
                    placeholderTextColor="#94A3B8"
                  />
                ))}
                <TouchableOpacity
                  style={s.primaryBtn}
                  onPress={handleChangePassword}
                  disabled={pwLoading}
                >
                  {pwLoading
                    ? <ActivityIndicator color="white" />
                    : <Text style={s.primaryBtnText}>
                        Save New Password
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* SUBSCRIPTION SECTION */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>SUBSCRIPTION</Text>
          <View style={[s.card, {
            borderLeftWidth: 4,
            borderLeftColor: isActive
              ? '#22C55E' : '#EF4444',
          }]}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8 }}>
                <Text style={{ fontWeight: '800',
                  color: '#1B2B4B', fontSize: 16 }}>
                  {subStatus?.plan === 'premium'
                    ? '⭐ Premium Plan'
                    : subStatus?.plan === 'standard'
                    ? '📚 Standard Plan'
                    : '🔓 No Plan'}
                </Text>
                <View style={{
                  backgroundColor: isActive
                    ? '#DCFCE7' : '#FEE2E2',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}>
                  <Text style={{ fontSize: 12,
                    fontWeight: '700',
                    color: isActive
                      ? '#166534' : '#991B1B' }}>
                    {subStatus?.subscriptionStatus === 'trialing'
                      ? '🎉 Trial'
                      : isActive ? '✅ Active'
                      : '❌ Inactive'}
                  </Text>
                </View>
              </View>

              {subStatus?.foundingFamily && (
                <Text style={{ color: '#C49A1A',
                  fontSize: 12, fontWeight: '700',
                  marginBottom: 6 }}>
                  🏅 Founding Family Member
                </Text>
              )}

              {subStatus?.trialEndsAt && (
                <Text style={{ color: '#64748B',
                  fontSize: 13, marginBottom: 4 }}>
                  Trial ends:{' '}
                  {new Date(subStatus.trialEndsAt)
                    .toLocaleDateString('en-AU')}
                </Text>
              )}

              {subStatus?.currentPeriodEnd && isActive && (
                <Text style={{ color: '#64748B',
                  fontSize: 13 }}>
                  Renews:{' '}
                  {new Date(subStatus.currentPeriodEnd)
                    .toLocaleDateString('en-AU')}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[s.actionRow, { borderTopWidth: 1,
                borderTopColor: '#F0F4F8' }]}
              onPress={openBillingPortal}
            >
              <Text style={s.actionText}>
                💳 Manage Billing & Cancel
              </Text>
              <Text style={{ color: '#94A3B8' }}>▶</Text>
            </TouchableOpacity>

            {!isActive && (
              <TouchableOpacity
                style={[s.actionRow, {
                  backgroundColor: '#C49A1A',
                  margin: 12, borderRadius: 12,
                }]}
                onPress={() =>
                  router.push('/parent/subscribe')}
              >
                <Text style={{ color: 'white',
                  fontWeight: '800', fontSize: 14 }}>
                  🚀 Resubscribe Now
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* CHILDREN SECTION */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>MY CHILDREN</Text>
          <View style={s.card}>
            {children.map((child, i) => (
              <View key={i} style={[s.row,
                i > 0 && { borderTopWidth: 1,
                  borderTopColor: '#F0F4F8' },
                { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                {isCharacterId(child.avatar) && (
                  <CharacterAvatar id={child.avatar} size={36} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700',
                    color: '#1B2B4B', fontSize: 15 }}>
                    {isCharacterId(child.avatar) ? '' : (child.avatar || '🧒') + ' '}{child.name}
                  </Text>
                  <Text style={{ color: '#64748B',
                    fontSize: 12 }}>
                    Year {child.grade} ·{' '}
                    ⚡ {child.xp || 0} pts ·{' '}
                    🔥 {child.streak || 0} day streak
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.smallBtn}
                  onPress={() => handleResetChildPin(child)}
                >
                  <Text style={s.smallBtnText}>
                    🔢 PIN
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Add child button */}
            <TouchableOpacity
              style={[s.actionRow, { borderTopWidth: 1,
                borderTopColor: '#F0F4F8' }]}
              onPress={() => setShowAddChild(!showAddChild)}
            >
              <Text style={s.actionText}>
                ➕ Add Child{children.length >= 1
                  ? ' — $10/month' : ''}
              </Text>
              <Text style={{ color: '#94A3B8' }}>
                {showAddChild ? '▲' : '▶'}
              </Text>
            </TouchableOpacity>

            {showAddChild && (
              <View style={{ padding: 16,
                backgroundColor: '#F8FAFC',
                borderRadius: 12, margin: 12 }}>
                <TextInput
                  placeholder="Child's name"
                  value={childName}
                  onChangeText={setChildName}
                  style={s.input}
                  placeholderTextColor="#94A3B8"
                />
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12,
                    color: '#64748B', marginBottom: 6 }}>
                    Year Level
                  </Text>
                  <ScrollView horizontal
                    showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row',
                      gap: 8 }}>
                      {['Prep','1','2','3','4','5','6']
                        .map(g => (
                        <TouchableOpacity key={g}
                          onPress={() => setChildGrade(
                            g === 'Prep' ? '0' : g
                          )}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor:
                              childGrade === (g === 'Prep'
                                ? '0' : g)
                              ? '#1B2B4B' : '#E2E8F0',
                          }}>
                          <Text style={{ fontWeight: '700',
                            color: childGrade === (g === 'Prep'
                              ? '0' : g)
                              ? '#C49A1A' : '#64748B',
                            fontSize: 13 }}>
                            {g === 'Prep' ? 'Prep'
                              : `Yr ${g}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <TextInput
                  placeholder="4-digit PIN"
                  value={childPin}
                  onChangeText={t =>
                    setChildPin(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  style={[s.input, { letterSpacing: 8,
                    fontSize: 20 }]}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  style={s.primaryBtn}
                  onPress={handleAddChild}
                  disabled={addChildLoading}
                >
                  {addChildLoading
                    ? <ActivityIndicator color="white" />
                    : <Text style={s.primaryBtnText}>
                        Add Child ✓
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* PARENTAL CONTROLS — link to existing screen */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>PARENTAL CONTROLS</Text>
          <View style={s.card}>
            <TouchableOpacity
              style={s.actionRow}
              onPress={() =>
                router.push('/parent/arcade-settings')}
            >
              <Text style={s.actionText}>
                🕹️ Arcade Time Limits
              </Text>
              <Text style={{ color: '#94A3B8' }}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* HELP & SUPPORT */}
        <View style={s.section}>
          <View style={s.card}>
            <TouchableOpacity
              style={[s.actionRow, { borderRadius: 14 }]}
              onPress={() => setShowSupport(true)}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15, padding: 4 }}>
                🎫 Help &amp; Support
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT */}
        <View style={[s.section, { marginBottom: 40 }]}>
          <View style={s.card}>
            <TouchableOpacity
              style={[s.actionRow,
                { borderRadius: 14 }]}
              onPress={handleLogout}
            >
              <Text style={{ color: '#EF4444',
                fontWeight: '700', fontSize: 15,
                padding: 4 }}>
                🚪 Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <SupportSheet visible={showSupport} onClose={() => setShowSupport(false)} />
      <ParentTabBar />
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  loading: { flex: 1, backgroundColor: c.bgPrimary,
    alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16, backgroundColor: c.bgHeader },
  headerTitle: { color: 'white', fontWeight: '800',
    fontSize: 17 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800',
    color: c.textMuted, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: c.bgCard, borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16 },
  label: { fontSize: 13, color: c.textSecondary,
    fontWeight: '500' },
  value: { fontSize: 15, fontWeight: '700',
    color: c.textPrimary },
  actionRow: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16 },
  actionText: { fontSize: 15, fontWeight: '600',
    color: c.textPrimary },
  input: { backgroundColor: c.bgCard, borderWidth: 1.5,
    borderColor: c.borderColor, borderRadius: 10,
    padding: 12, fontSize: 15, marginBottom: 10,
    color: c.textPrimary },
  primaryBtn: { backgroundColor: c.bgHeader,
    borderRadius: 10, padding: 14,
    alignItems: 'center',
    borderWidth: 2, borderColor: '#C49A1A',
    marginTop: 4 },
  primaryBtnText: { color: 'white', fontWeight: '800',
    fontSize: 15 },
  smallBtn: { backgroundColor: c.bgPrimary,
    borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 6 },
  smallBtnText: { fontSize: 12, fontWeight: '700',
    color: c.textPrimary },
})
