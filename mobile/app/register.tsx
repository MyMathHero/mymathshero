import { useState, useMemo } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenBackground } from '../lib/ui'
import api, { authAPI } from '../lib/api'
import { useTheme, ThemeColors } from '../lib/themeContext'

type Step = 'parent' | 'child' | 'plan'

// The web /api/auth/register endpoint accepts ONLY parent fields:
// { role: 'parent', name, email, password, phone? }
// Child details are stored separately via POST /api/add-child after register+login.
// The backend currently has no plan/Stripe wiring, so `plan` is captured locally
// for UX continuity but not sent to the server.

export default function Register() {
  const router = useRouter()
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [step, setStep] = useState<Step>('parent')
  const [loading, setLoading] = useState(false)

  // Parent
  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPassword, setParentPassword] = useState('')
  const [parentPhone, setParentPhone] = useState('')

  // Child (sent to /api/add-child after parent registration)
  const [childName, setChildName] = useState('')
  const [childGrade, setChildGrade] = useState('3')
  const [childAvatar] = useState('🦊')

  // Plan — captured locally only (no backend support yet)
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'premium'>('premium')

  const grades = ['Prep', '1', '2', '3', '4', '5', '6']

  function validateParent() {
    if (!parentName.trim()) return 'Please enter your name'
    if (!parentEmail.includes('@')) return 'Please enter a valid email'
    if (parentPassword.length < 8) return 'Password must be at least 8 characters'
    return null
  }

  function validateChild() {
    if (!childName.trim()) return "Please enter your child's name"
    return null
  }

  function nextStep() {
    if (step === 'parent') {
      const err = validateParent()
      if (err) { Alert.alert('Missing Details', err); return }
      setStep('child')
    } else if (step === 'child') {
      const err = validateChild()
      if (err) { Alert.alert('Missing Details', err); return }
      setStep('plan')
    }
  }

  async function handleRegister() {
    setLoading(true)
    try {
      // 1) Register the parent account (matches actual backend contract).
      const regRes = await api.post('/api/auth/register', {
        role: 'parent',
        name: parentName.trim(),
        email: parentEmail.trim().toLowerCase(),
        password: parentPassword,
        phone: parentPhone.trim(),
      })
      const regData = regRes.data
      if (!regData?.success) {
        Alert.alert('Registration Failed',
          regData?.error || 'Could not create your account.')
        return
      }
      const parentId = regData.data?.id

      // 2) Add the child via /api/add-child.
      try {
        await api.post('/api/add-child', {
          parent_id: parentId,
          child_name: childName.trim(),
          grade: childGrade,
          avatar: childAvatar,
        })
      } catch (childErr) {
        // Non-fatal — parent can add a child later from the dashboard.
        console.warn('Add child failed:', childErr)
      }

      // 3) Log in to get a token (register endpoint doesn't return one).
      try {
        const loginRes = await authAPI.login({
          role: 'parent',
          email: parentEmail.trim().toLowerCase(),
          password: parentPassword,
        })
        const loginData = loginRes.data
        if (loginData?.success) {
          await Promise.all([
            SecureStore.setItemAsync('auth_token', loginData.token || ''),
            SecureStore.setItemAsync('user_role', 'parent'),
            SecureStore.setItemAsync('user_id', loginData.user?.id || parentId || ''),
            SecureStore.setItemAsync('user_name', loginData.user?.name || parentName.trim()),
          ])
        }
      } catch (loginErr) {
        console.warn('Auto-login after register failed:', loginErr)
        // User can still sign in manually.
        Alert.alert(
          'Account Created',
          'Your account is ready. Please log in to continue.',
          [{ text: 'Log in', onPress: () => router.replace('/login') }]
        )
        return
      }

      router.replace('/parent/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.error
      Alert.alert('Error', msg || 'Could not create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const stepTitles = {
    parent: 'Create Your Account',
    child: 'Add Your Child',
    plan: 'Choose a Plan',
  }
  const stepNumbers = { parent: 1, child: 2, plan: 3 }

  return (
    <ScreenBackground>
    <SafeAreaView style={[s.safe, { backgroundColor: 'transparent' }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => {
            if (step === 'parent') router.back()
            else if (step === 'child') setStep('parent')
            else setStep('child')
          }}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{stepTitles[step]}</Text>
          <Text style={s.stepCount}>Step {stepNumbers[step]} of 3</Text>
        </View>

        <View style={s.progressBar}>
          <View style={[s.progressFill, {
            width: `${(stepNumbers[step] / 3) * 100}%` as any
          }]} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'parent' && (
            <>
              <Text style={s.sectionLabel}>Your Details</Text>
              <TextInput style={s.input} placeholder="Full name"
                value={parentName} onChangeText={setParentName}
                placeholderTextColor="#94A3B8" />
              <TextInput style={s.input} placeholder="Email address"
                value={parentEmail} onChangeText={setParentEmail}
                keyboardType="email-address" autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#94A3B8" />
              <TextInput style={s.input} placeholder="Password (min 8 characters)"
                value={parentPassword} onChangeText={setParentPassword}
                secureTextEntry placeholderTextColor="#94A3B8" />
              <TextInput style={s.input} placeholder="Phone number (optional)"
                value={parentPhone} onChangeText={setParentPhone}
                keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
              <TouchableOpacity style={s.btn} onPress={nextStep}>
                <Text style={s.btnText}>Next — Add Your Child →</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'child' && (
            <>
              <Text style={s.sectionLabel}>Your Child&apos;s Details</Text>
              <Text style={s.helper}>
                We&apos;ll generate a username and PIN for your child&apos;s login,
                which you can change later from the dashboard.
              </Text>
              <TextInput style={s.input} placeholder="Child's full name"
                value={childName} onChangeText={setChildName}
                placeholderTextColor="#94A3B8" />

              <Text style={s.sectionLabel}>Current Year Level</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {grades.map(g => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setChildGrade(g)}
                      style={[s.gradeBtn, childGrade === g && s.gradeBtnActive]}
                    >
                      <Text style={[s.gradeBtnText, childGrade === g && s.gradeBtnTextActive]}>
                        {g === 'Prep' ? 'Prep' : `Year ${g}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={s.btn} onPress={nextStep}>
                <Text style={s.btnText}>Next — Choose Plan →</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'plan' && (
            <>
              <Text style={s.sectionLabel}>Choose Your Plan</Text>

              <View style={s.launchBanner}>
                <Text style={s.launchTitle}>🎉 Founding Family Offer</Text>
                <Text style={s.launchDesc}>
                  First 1,000 families get full Premium access for just
                  $19.99 for the entire first year.
                </Text>
              </View>

              <TouchableOpacity
                style={[s.planCard, selectedPlan === 'standard' && s.planCardActive]}
                onPress={() => setSelectedPlan('standard')}
              >
                <View style={s.planHeader}>
                  <Text style={s.planName}>Standard</Text>
                  <Text style={s.planPrice}>$14.99/mo</Text>
                </View>
                <Text style={s.planFeature}>✅ All Maths curriculum</Text>
                <Text style={s.planFeature}>✅ Hero Points + badges</Text>
                <Text style={s.planFeature}>✅ Weekly Hero Report</Text>
                <Text style={s.planFeatureMuted}>❌ Ask Hero AI Tutor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.planCard, s.planCardPremium,
                  selectedPlan === 'premium' && s.planCardPremiumActive]}
                onPress={() => setSelectedPlan('premium')}
              >
                <View style={s.premiumBadge}>
                  <Text style={s.premiumBadgeText}>RECOMMENDED</Text>
                </View>
                <View style={s.planHeader}>
                  <Text style={[s.planName, { color: 'white' }]}>Premium</Text>
                  <Text style={[s.planPrice, { color: '#C49A1A' }]}>$24.99/mo</Text>
                </View>
                <Text style={[s.planFeature, { color: 'rgba(255,255,255,0.9)' }]}>
                  ✅ Everything in Standard
                </Text>
                <Text style={[s.planFeature, { color: 'rgba(255,255,255,0.9)' }]}>
                  ✅ Ask Hero AI Tutor
                </Text>
                <Text style={[s.planFeature, { color: 'rgba(255,255,255,0.9)' }]}>
                  ✅ Voice explanations
                </Text>
                <Text style={[s.planFeature, { color: 'rgba(255,255,255,0.9)' }]}>
                  ✅ Full Arcade access
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={s.btnText}>Create Account →</Text>
                }
              </TouchableOpacity>

              <Text style={s.terms}>
                First month free for first 1,000 families. Cancel anytime.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
    backgroundColor: c.bgHeader },
  back: { color: c.accentGold, fontWeight: '700', fontSize: 15 },
  headerTitle: { color: 'white', fontWeight: '800', fontSize: 16 },
  stepCount: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  progressBar: { height: 4, backgroundColor: c.bgHeader },
  progressFill: { height: 4, backgroundColor: '#C49A1A' },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 12, marginTop: 8 },
  helper: { fontSize: 13, color: c.textSecondary, marginBottom: 12, lineHeight: 18 },
  input: { backgroundColor: c.bgCard, borderWidth: 1.5,
    borderColor: c.borderColor, borderRadius: 12, padding: 16,
    fontSize: 16, color: c.textPrimary, marginBottom: 12 },
  btn: { backgroundColor: c.bgHeader, borderRadius: 14,
    padding: 18, alignItems: 'center',
    borderWidth: 2, borderColor: '#C49A1A', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '800' },
  gradeBtn: { paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 2, borderColor: c.borderColor,
    backgroundColor: c.bgCard },
  gradeBtnActive: { borderColor: '#C49A1A', backgroundColor: '#FFFBEB' },
  gradeBtnText: { color: c.textSecondary, fontWeight: '700', fontSize: 13 },
  gradeBtnTextActive: { color: c.textPrimary },
  launchBanner: { backgroundColor: c.bgHeader, borderRadius: 14,
    padding: 16, marginBottom: 16, borderWidth: 2, borderColor: '#C49A1A' },
  launchTitle: { color: c.accentGold, fontWeight: '800',
    fontSize: 15, marginBottom: 4 },
  launchDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 18 },
  planCard: { backgroundColor: c.bgCard, borderRadius: 16,
    padding: 18, marginBottom: 12, borderWidth: 2, borderColor: c.borderColor },
  planCardActive: { borderColor: '#1B2B4B' },
  planCardPremium: { backgroundColor: c.bgHeader,
    borderColor: '#1B2B4B', position: 'relative', paddingTop: 28 },
  planCardPremiumActive: { borderColor: '#C49A1A' },
  premiumBadge: { position: 'absolute', top: -1, left: 16,
    backgroundColor: '#C49A1A', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 3 },
  premiumBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  planName: { fontSize: 17, fontWeight: '800', color: c.textPrimary },
  planPrice: { fontSize: 17, fontWeight: '800', color: c.accentGold },
  planFeature: { fontSize: 13, color: '#334155', marginBottom: 4 },
  planFeatureMuted: { fontSize: 13, color: c.textMuted, marginBottom: 4 },
  terms: { textAlign: 'center', color: c.textMuted, fontSize: 12, marginTop: 12 },
})
