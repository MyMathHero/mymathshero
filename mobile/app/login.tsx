import { useState, useMemo } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Svg, { Path, Circle } from 'react-native-svg'
import { authAPI } from '../lib/api'
import { theme } from '../lib/theme'
import { useTheme, ThemeColors } from '../lib/themeContext'
import HeroRobot from '../components/HeroRobot'

type Role = 'student' | 'parent' | null

// Decorative floating maths symbols, positioned around the hero (matches the
// reference design). Coordinates are percentages of the hero area.
const MATH_SYMBOLS: Array<{ s: string; top: string; left?: string; right?: string; size: number; color: string }> = [
  { s: '∫', top: '8%',  left: '20%',  size: 56, color: '#C49A1A' },
  { s: '÷', top: '6%',  left: '46%',  size: 28, color: 'rgba(255,255,255,0.5)' },
  { s: '√', top: '10%', right: '24%', size: 48, color: '#38BDF8' },
  { s: '=', top: '20%', left: '12%',  size: 26, color: 'rgba(255,255,255,0.35)' },
  { s: '÷', top: '22%', right: '14%', size: 30, color: '#C49A1A' },
  { s: '×', top: '42%', left: '10%',  size: 28, color: 'rgba(255,255,255,0.3)' },
  { s: '%', top: '40%', right: '12%', size: 24, color: '#38BDF8' },
]

export default function Login() {
  const router = useRouter()
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
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

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#0F1F3D', '#16294A', '#1B2B4B']}
        style={StyleSheet.absoluteFill}
      />

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
          {/* Hero section with floating maths symbols */}
          <View style={s.hero}>
            {MATH_SYMBOLS.map((m, i) => (
              <Text
                key={i}
                style={[
                  s.mathSymbol,
                  {
                    top: m.top as any,
                    left: m.left as any,
                    right: m.right as any,
                    fontSize: m.size,
                    color: m.color,
                  },
                ]}
              >
                {m.s}
              </Text>
            ))}

            <View style={s.robotHalo}>
              <HeroRobot mood="waving" size={150} containerStyle="circle" />
            </View>

            <Text style={s.heroLogo}>
              MyMaths<Text style={{ color: theme.colors.gold }}>Hero</Text>
            </Text>
            <Text style={s.heroTagline}>Australia&apos;s AI Maths Tutor</Text>
          </View>

          {/* Frosted glass card */}
          <BlurView intensity={30} tint="light" style={s.card}>
            <Text style={s.label}>Who are you?</Text>

            <View style={s.roleRow}>
              <TouchableOpacity
                style={[s.roleCard, role === 'student' && s.roleCardActive]}
                onPress={() => setRole('student')}
                activeOpacity={0.85}
              >
                <GradCapIcon active={role === 'student'} />
                <Text style={[s.roleLabel, role === 'student' && s.roleLabelActive]}>I&apos;m a Student</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.roleCard, role === 'parent' && s.roleCardActive]}
                onPress={() => setRole('parent')}
                activeOpacity={0.85}
              >
                <ParentsIcon active={role === 'parent'} />
                <Text style={[s.roleLabel, role === 'parent' && s.roleLabelActive]}>I&apos;m a Parent</Text>
              </TouchableOpacity>
            </View>

            {role === 'student' && (
              <View style={s.form}>
                <TextInput style={s.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholderTextColor={theme.colors.textMuted} />
                <TextInput style={s.input} placeholder="4-digit PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} secureTextEntry placeholderTextColor={theme.colors.textMuted} />
              </View>
            )}

            {role === 'parent' && (
              <View style={s.form}>
                <TextInput style={s.input} placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholderTextColor={theme.colors.textMuted} />
                <TextInput style={s.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={theme.colors.textMuted} />
              </View>
            )}

            {role && (
              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                <Text style={s.btnText}>{loading ? 'Logging in...' : 'Log In →'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.signupRow} onPress={() => router.push('/register')}>
              <Text style={s.signupText}>
                Don&apos;t have an account? <Text style={s.signupLink}>Get started →</Text>
              </Text>
            </TouchableOpacity>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function GradCapIcon({ active }: { active: boolean }) {
  const col = active ? '#C49A1A' : '#1B2B4B'
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24">
      <Path d="M12 3L1 8l11 5 9-4.09V14h2V8L12 3z" fill={col} />
      <Path d="M5 11.5v3c0 1.5 3.13 3 7 3s7-1.5 7-3v-3l-7 3.2-7-3.2z" fill={col} />
    </Svg>
  )
}

function ParentsIcon({ active }: { active: boolean }) {
  const col = active ? '#C49A1A' : '#1B2B4B'
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24">
      <Circle cx="8" cy="8" r="3.2" fill={col} />
      <Circle cx="16" cy="8" r="3.2" fill={col} />
      <Path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5v.5h-11V19z" fill={col} />
      <Path d="M13 19c0-2 1-3.6 2.5-4.4 0.5-.2 1-.3 1.5-.3 3 0 4.5 2 4.5 4.7v.5H13V19z" fill={col} />
    </Svg>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F1F3D' },
  hero: {
    alignItems: 'center',
    paddingTop: 90,
    paddingBottom: 40,
    position: 'relative',
  },
  mathSymbol: {
    position: 'absolute',
    fontWeight: '700',
    opacity: 0.9,
  },
  robotHalo: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  heroLogo: {
    color: 'white', fontWeight: '800',
    fontSize: 40, letterSpacing: -0.5,
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15, marginTop: 6,
  },
  card: {
    // BlurView needs a translucent base tint so the frost reads on the gradient.
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 28,
    paddingTop: 30,
    minHeight: 380,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  label: {
    fontSize: 20, fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 18,
  },
  roleRow: {
    flexDirection: 'row', gap: 14,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1, paddingVertical: 22,
    borderRadius: 18, borderWidth: 1.5,
    borderColor: 'rgba(56,189,248,0.5)',
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', gap: 10,
    // soft glow like the reference
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  roleCardActive: {
    borderColor: c.accentGold,
    backgroundColor: 'rgba(196,154,26,0.18)',
    shadowColor: c.accentGold,
  },
  roleLabel: {
    fontSize: 16, color: '#1B2B4B', fontWeight: '700',
  },
  roleLabelActive: { color: '#1B2B4B', fontWeight: '800' },
  form: { gap: 12, marginBottom: 16 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14, padding: 16,
    fontSize: 16, color: '#1B2B4B',
  },
  btn: {
    backgroundColor: '#1B2B4B',
    borderRadius: 14, padding: 18,
    alignItems: 'center',
    borderWidth: 2, borderColor: c.accentGold,
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontSize: 17, fontWeight: '800' },
  signupRow: { marginTop: 4, alignItems: 'center' },
  signupText: { fontSize: 15, color: '#334155' },
  signupLink: { color: c.accentGold, fontWeight: '800' },
})
