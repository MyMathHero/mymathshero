import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { authAPI } from '../lib/api'
import { theme } from '../lib/theme'
import HeroRobot from '../components/HeroRobot'

type Role = 'student' | 'parent' | null

export default function Login() {
  const router = useRouter()
  const [role, setRole] = useState<Role>(null)
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!role) return
    if (role === 'student' && (!username.trim() || !pin.trim())) {
      Alert.alert('Missing details', 'Please enter your username and PIN')
      return
    }
    if (role === 'parent' && (!email.trim() || !password.trim())) {
      Alert.alert('Missing details', 'Please enter your email and password')
      return
    }
    setLoading(true)
    try {
      const payload = role === 'student'
        ? { role, username: username.trim(), pin: pin.trim() }
        : { role, email: email.trim().toLowerCase(), password }

      const res = await authAPI.login(payload)
      const data = res.data

      if (data.success) {
        await Promise.all([
          SecureStore.setItemAsync('auth_token', data.token || ''),
          SecureStore.setItemAsync('user_role', role),
          SecureStore.setItemAsync('user_id', data.user?.id || ''),
          SecureStore.setItemAsync('user_name', data.user?.name || ''),
          SecureStore.setItemAsync('user_grade', String(data.user?.grade || 3)),
        ])

        try {
          if (role === 'student') {
            if (!data.user?.diagnosticComplete) {
              router.replace('/student/diagnostic')
            } else {
              router.replace('/student/dashboard')
            }
          } else {
            router.replace('/parent/dashboard')
          }
        } catch (navErr) {
          console.error('Navigation after login failed:', navErr)
        }
      } else {
        Alert.alert('Login Failed', data.error || 'Please check your details')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      Alert.alert(
        'Connection Error',
        'Could not connect to MyMathsHero. Please check your internet and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    { id: 'student' as Role, emoji: '🎓', label: "I'm a Student" },
    { id: 'parent' as Role, emoji: '👨‍👩‍👧', label: "I'm a Parent" },
  ]

  return (
    <View style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero section */}
          <View style={s.hero}>
            <HeroRobot mood="waving" size={120} containerStyle="circle" />
            <Text style={s.heroLogo}>
              MyMaths<Text style={{ color: theme.colors.gold }}>Hero</Text>
            </Text>
            <Text style={s.heroTagline}>Australia&apos;s AI Maths Tutor</Text>
          </View>

          {/* Form card */}
          <View style={s.card}>
            <Text style={s.label}>Who are you?</Text>
            <View style={s.roleRow}>
              {roles.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[s.roleCard, role === r.id && s.roleCardActive]}
                  onPress={() => setRole(r.id)}
                  activeOpacity={0.8}
                >
                  <Text style={s.roleEmoji}>{r.emoji}</Text>
                  <Text style={[s.roleLabel, role === r.id && s.roleLabelActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {role === 'student' && (
              <View style={s.form}>
                <TextInput
                  style={s.input}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <TextInput
                  style={s.input}
                  placeholder="4-digit PIN"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            )}

            {role === 'parent' && (
              <View style={s.form}>
                <TextInput
                  style={s.input}
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <TextInput
                  style={s.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            )}

            {role && (
              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={s.btnText}>
                  {loading ? 'Logging in...' : 'Log In →'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={s.signupRow}
              onPress={() => router.push('/register')}
            >
              <Text style={s.signupText}>
                Don&apos;t have an account?{' '}
                <Text style={s.signupLink}>Get started →</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.navy },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
  },
  heroLogo: {
    color: 'white', fontWeight: '800',
    fontSize: 32, marginTop: 8,
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14, marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingTop: 32,
    minHeight: 360,
  },
  label: {
    fontSize: 15, fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  roleRow: {
    flexDirection: 'row', gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1, paddingVertical: 18,
    borderRadius: 14, borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldLight,
  },
  roleEmoji: { fontSize: 32, marginBottom: 6 },
  roleLabel: {
    fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600',
  },
  roleLabelActive: { color: theme.colors.textPrimary, fontWeight: '800' },
  form: { gap: 12, marginBottom: 16 },
  input: {
    backgroundColor: 'white',
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 12, padding: 16,
    fontSize: 16, color: theme.colors.textPrimary,
  },
  btn: {
    backgroundColor: theme.colors.navy,
    borderRadius: 14, padding: 18,
    alignItems: 'center',
    borderWidth: 2, borderColor: theme.colors.gold,
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontSize: 17, fontWeight: '800' },
  signupRow: { marginTop: 4, alignItems: 'center' },
  signupText: { fontSize: 14, color: theme.colors.textSecondary },
  signupLink: { color: theme.colors.gold, fontWeight: '700' },
})
