import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { authAPI } from '../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'

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
        // Write all session keys in parallel so a slow keychain doesn't
        // serialise the writes one-by-one.
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

  // Only Student and Parent — no Teacher
  const roles = [
    { id: 'student' as Role, emoji: '🎓', label: "I'm a Student" },
    { id: 'parent' as Role, emoji: '👨‍👩‍👧', label: "I'm a Parent" },
  ]

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>
              MyMaths<Text style={styles.gold}>Hero</Text>
            </Text>
            <Text style={styles.tagline}>Personalised AI Maths Learning</Text>
            <Text style={styles.tagline2}>Prep to Year 12</Text>
          </View>

          <Text style={styles.label}>Who are you?</Text>
          <View style={styles.roleRow}>
            {roles.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[styles.roleCard, role === r.id && styles.roleCardActive]}
                onPress={() => setRole(r.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.roleEmoji}>{r.emoji}</Text>
                <Text style={[styles.roleLabel, role === r.id && styles.roleLabelActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {role === 'student' && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#94A3B8"
              />
              <TextInput
                style={styles.input}
                placeholder="4-digit PIN"
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}

          {role === 'parent' && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#94A3B8"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}

          {role && (
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>
                {loading ? 'Logging in...' : 'Log In →'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.signupRow}
            onPress={() => Alert.alert(
              'Create Account',
              'Visit mymathshero.com.au to create your account, then log in here.'
            )}
          >
            <Text style={styles.signupText}>
              Don&apos;t have an account?{' '}
              <Text style={styles.signupLink}>Get started →</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4F8' },
  scroll: {
    padding: 24, alignItems: 'center',
    paddingTop: 60, paddingBottom: 48,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 42, fontWeight: '800', color: '#1B2B4B' },
  gold: { color: '#C49A1A' },
  tagline: { fontSize: 14, color: '#64748B', marginTop: 6 },
  tagline2: { fontSize: 12, color: '#C49A1A', fontWeight: '700', marginTop: 4 },
  label: {
    fontSize: 18, fontWeight: '700',
    color: '#1B2B4B', marginBottom: 14,
    alignSelf: 'flex-start',
  },
  roleRow: {
    flexDirection: 'row', gap: 12,
    marginBottom: 28, width: '100%',
  },
  roleCard: {
    flex: 1, paddingVertical: 20,
    borderRadius: 14, borderWidth: 2,
    borderColor: '#E2E8F0', backgroundColor: 'white',
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: '#C49A1A',
    backgroundColor: '#FFFBEB',
  },
  roleEmoji: { fontSize: 32, marginBottom: 8 },
  roleLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  roleLabelActive: { color: '#1B2B4B', fontWeight: '800' },
  form: { width: '100%', gap: 12, marginBottom: 20 },
  input: {
    width: '100%', backgroundColor: 'white',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 16,
    fontSize: 16, color: '#1B2B4B',
  },
  btn: {
    width: '100%', backgroundColor: '#1B2B4B',
    borderRadius: 14, padding: 18,
    alignItems: 'center',
    borderWidth: 2, borderColor: '#C49A1A',
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontSize: 17, fontWeight: '800' },
  signupRow: { marginTop: 8 },
  signupText: { fontSize: 14, color: '#64748B' },
  signupLink: { color: '#C49A1A', fontWeight: '700' },
})
