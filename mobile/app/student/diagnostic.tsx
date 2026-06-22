import { useState, useMemo} from 'react'
import { View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { studentAPI } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenBackground } from '../../lib/ui'
import HeroRobot from '../../components/HeroRobot'

export default function Diagnostic() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const [stage, setStage] = useState<'welcome' | 'quiz' | 'done'>('welcome')
  const [questions, setQuestions] = useState<any[]>([])
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function startDiagnostic() {
    setLoading(true)
    try {
      const grade = parseInt(
        await SecureStore.getItemAsync('user_grade') || '3'
      )
      const res = await studentAPI.diagnostic(grade)
      setQuestions(res.data.questions || [])
      setStage('quiz')
    } catch {
      Alert.alert('Error', 'Could not load assessment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleAnswer(option: string) {
    if (selected) return
    setSelected(option)
    const q = questions[current]
    const newResult = {
      questionId: q.questionId,
      skillId: q.skillId,
      correct: option === q.correctAnswer,
      timeTakenMs: 5000,
      grade: q.grade,
    }
    const updated = [...results, newResult]
    setResults(updated)
    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent(i => i + 1)
        setSelected(null)
      } else {
        finishDiagnostic(updated)
      }
    }, 800)
  }

  async function finishDiagnostic(finalResults: any[]) {
    setStage('done')
    setLoading(true)
    try {
      const studentId = await SecureStore.getItemAsync('user_id')
      await studentAPI.submitDiagnostic({ studentId, results: finalResults })
    } catch {}
    finally { setLoading(false) }
  }

  if (stage === 'welcome') {
    return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.center}>
          <HeroRobot mood="waving" size={140} containerStyle="card" />
          <Text style={[styles.title, { marginTop: 12 }]}>
            Hi! I&apos;m <Text style={styles.gold}>Hero</Text>
          </Text>
          <Text style={styles.sub}>
            Let me find out what Maths you already know!
            This takes about 5 minutes.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>✦ 11 quick Maths questions</Text>
            <Text style={styles.infoText}>✦ No time pressure</Text>
            <Text style={styles.infoText}>✦ Sets up your personal plan</Text>
          </View>
          <TouchableOpacity style={styles.startBtn}
            onPress={startDiagnostic} disabled={loading}>
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.startBtnText}>Start Assessment →</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
    )
  }

  if (stage === 'done') {
    return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.center}>
          <HeroRobot mood="celebrating" size={140} containerStyle="card" />
          <Text style={[styles.title, { marginTop: 12 }]}>
            All <Text style={styles.gold}>Done!</Text>
          </Text>
          <Text style={styles.sub}>
            Hero has set up your personalised Maths learning plan!
          </Text>
          <TouchableOpacity style={styles.startBtn}
            onPress={() => router.replace('/student/dashboard')}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.startBtnText}>Let&apos;s Start Learning! →</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
    )
  }

  // Quiz stage
  if (questions.length === 0) {
    return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.center}>
          <HeroRobot mood="thinking" size={60} containerStyle="card" />
          <Text style={[styles.sub, { marginTop: 12 }]}>No assessment questions available right now.</Text>
          <TouchableOpacity style={styles.startBtn}
            onPress={() => router.replace('/student/dashboard')}>
            <Text style={styles.startBtnText}>Continue to Hero HQ →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
    )
  }

  const q = questions[current]
  return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Assessment</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <HeroRobot mood="thinking" size={36} containerStyle="circle" />
          <Text style={styles.topCount}>{current + 1} / {questions.length}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: '#1B2B4B' }}>
        <View style={styles.progressOuter}>
          <View style={[styles.progressInner, {
            width: `${((current + 1) / questions.length) * 100}%` as any
          }]} />
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{q.question}</Text>
        </View>

        {(q.options || []).map((opt: string, i: number) => {
          const isSelected = selected === opt
          return (
            <TouchableOpacity
              key={i}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handleAnswer(opt)}
              disabled={!!selected}
              activeOpacity={0.8}
            >
              <Text style={styles.optionLetter}>{String.fromCharCode(65 + i)}</Text>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          )
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: c.textPrimary, marginBottom: 10 },
  gold: { color: c.accentGold },
  sub: { fontSize: 15, color: c.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 24 },
  infoBox: { backgroundColor: c.bgCard, borderRadius: 14, padding: 18,
    width: '100%', marginBottom: 28, borderWidth: 1, borderColor: c.borderColor, gap: 8 },
  infoText: { fontSize: 14, color: c.textPrimary, fontWeight: '600' },
  startBtn: { backgroundColor: c.bgHeader, borderRadius: 14, padding: 18,
    alignItems: 'center', width: '100%', borderWidth: 2, borderColor: '#C49A1A' },
  startBtnText: { color: 'white', fontSize: 17, fontWeight: '800' },
  topBar: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16, backgroundColor: c.bgHeader },
  topTitle: { color: 'white', fontSize: 16, fontWeight: '800' },
  topCount: { color: c.accentGold, fontSize: 14, fontWeight: '700' },
  progressOuter: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  progressInner: { height: 4, backgroundColor: '#C49A1A' },
  scroll: { flex: 1, padding: 16 },
  questionCard: { backgroundColor: c.bgCard, borderRadius: 16, padding: 22,
    marginBottom: 16, borderWidth: 1, borderColor: c.borderColor },
  questionText: { fontSize: 20, fontWeight: '700', color: c.textPrimary, lineHeight: 28 },
  option: { backgroundColor: c.bgCard, borderRadius: 14, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderColor: c.borderColor },
  optionSelected: { borderColor: '#C49A1A', backgroundColor: '#FFFBEB' },
  optionLetter: { fontSize: 16, fontWeight: '800', color: c.textPrimary, width: 24 },
  optionText: { fontSize: 16, color: c.textPrimary, fontWeight: '600', flex: 1 },
})
