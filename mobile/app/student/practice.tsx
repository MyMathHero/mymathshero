import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { studentAPI } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Practice() {
  const router = useRouter()
  const { skillId, skillName, grade, speedRound } = useLocalSearchParams<{
    skillId: string, skillName: string,
    grade: string, speedRound: string
  }>()

  const isSpeedRound = speedRound === 'true'
  const SPEED_ROUND_TOTAL = 5

  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timer, setTimer] = useState(0)
  const [totalTimer, setTotalTimer] = useState(0)
  const [showNudge, setShowNudge] = useState(false)
  const [speedRoundDone, setSpeedRoundDone] = useState(false)
  const [speedCorrect, setSpeedCorrect] = useState(0)
  const timerRef = useRef<any>(null)
  const totalTimerRef = useRef<any>(null)

  useEffect(() => { loadQuestions() }, [])

  useEffect(() => {
    if (questions.length > 0 && !result) startTimer()
    return stopTimer
  }, [currentIndex, questions.length, result])

  useEffect(() => {
    if (timer === 60 && !result) setShowNudge(true)
  }, [timer])

  // Speed round auto-advance
  useEffect(() => {
    if (!isSpeedRound || !result) return
    const t = setTimeout(() => handleNext(result.correct), 1500)
    return () => clearTimeout(t)
  }, [result, isSpeedRound])

  function startTimer() {
    setTimer(0)
    setShowNudge(false)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    if (isSpeedRound && currentIndex === 0) {
      totalTimerRef.current = setInterval(() =>
        setTotalTimer(t => t + 1), 1000)
    }
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function loadQuestions() {
    try {
      const res = await studentAPI.questions(
        skillId, parseInt(grade || '3')
      )
      setQuestions(res.data.questions || [])
    } catch {
      Alert.alert('Error', 'Could not load questions.')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  async function handleAnswer(option: string) {
    if (selected || submitting) return
    setSelected(option)
    stopTimer()
    setSubmitting(true)
    try {
      const studentId = await SecureStore.getItemAsync('user_id')
      const q = questions[currentIndex]
      const res = await studentAPI.answer({
        studentId, skillId,
        questionId: q.questionId,
        answer: option,
        timeTakenMs: timer * 1000,
        hintUsed: false,
        difficulty: q.difficulty || 0.5,
      })
      setResult(res.data)
      if (res.data.correct && isSpeedRound) {
        setSpeedCorrect(c => c + 1)
      }
    } catch {
      Alert.alert('Error', 'Could not submit answer.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleNext(wasCorrect?: boolean) {
    const nextIndex = currentIndex + 1
    if (isSpeedRound && nextIndex >= SPEED_ROUND_TOTAL) {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current)
      setSpeedRoundDone(true)
      return
    }
    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex)
      setSelected(null)
      setResult(null)
    } else {
      // Reload more questions
      loadQuestions().then(() => {
        setCurrentIndex(0)
        setSelected(null)
        setResult(null)
      })
    }
  }

  const mm = String(Math.floor(timer / 60)).padStart(2, '0')
  const ss = String(timer % 60).padStart(2, '0')

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#C49A1A" size="large" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    )
  }

  // Speed round complete screen
  if (speedRoundDone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={{ fontSize: 64 }}>⚡</Text>
          <Text style={[styles.loadingText, { fontSize: 24, fontWeight: '800', color: 'white' }]}>
            Speed Round Complete!
          </Text>
          <Text style={[styles.loadingText, { color: 'rgba(255,255,255,0.7)' }]}>
            You answered {SPEED_ROUND_TOTAL} questions in {totalTimer} seconds!
          </Text>
          <Text style={[styles.loadingText, { color: '#C49A1A', fontSize: 18, fontWeight: '800' }]}>
            {speedCorrect}/{SPEED_ROUND_TOTAL} correct ✦
          </Text>
          <TouchableOpacity
            style={[styles.nextBtn, { marginTop: 32, width: 240 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.nextBtnText}>Back to Hero HQ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (questions.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={{ fontSize: 48 }}>🤖</Text>
        <Text style={styles.loadingText}>Hero is preparing questions!</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24, padding: 16,
            backgroundColor: '#C49A1A', borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>
            Try Another Skill
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  const q = questions[currentIndex]

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.skillTitle} numberOfLines={1}>
          {isSpeedRound ? `⚡ Speed Round ${currentIndex + 1}/${SPEED_ROUND_TOTAL}` : skillName}
        </Text>
        <View style={styles.timerBox}>
          <Text style={[styles.timerText, timer > 60 && { color: '#EF4444' }]}>
            {mm}:{ss}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={{ backgroundColor: '#1B2B4B' }}>
        <View style={styles.progressOuter}>
          <View style={[styles.progressInner, {
            width: `${((currentIndex + 1) / questions.length) * 100}%` as any
          }]} />
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        {/* Nudge */}
        {showNudge && !result && (
          <View style={styles.nudge}>
            <Text style={styles.nudgeText}>🤖 Stuck? Visit mymathshero.com.au for Ask Hero!</Text>
          </View>
        )}

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{q.question}</Text>
        </View>

        {/* Result */}
        {result && (
          <View style={[styles.resultCard,
            result.correct ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultEmoji}>
              {result.correct ? '🎉' : '😅'}
            </Text>
            <Text style={styles.resultTitle}>
              {result.correct ? 'Correct! Amazing!' : "Why don't we try this way?"}
            </Text>
            {!result.correct && (
              <Text style={styles.resultAnswer}>
                The answer is: {result.correctAnswer}
              </Text>
            )}
            <Text style={styles.resultXP}>
              +{result.xpGained || 0} Hero Points
            </Text>
          </View>
        )}

        {/* Options */}
        {q.options?.map((opt: string, i: number) => {
          const isCorrect = result && opt === result.correctAnswer
          const isSelected = opt === selected
          const isWrong = result && isSelected && !isCorrect
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.option,
                isSelected && !result && styles.optionSelected,
                isCorrect && styles.optionCorrect,
                isWrong && styles.optionWrong,
              ]}
              onPress={() => handleAnswer(opt)}
              disabled={!!selected || submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.optionLetter}>
                {isCorrect ? '✓' : String.fromCharCode(65 + i)}
              </Text>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          )
        })}

        {/* Next button — only shown if not speed round */}
        {result && !isSpeedRound && (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => handleNext()}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>
              {result.correct ? '🚀 Next Question!' : '💪 Try Another!'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  loading: { flex: 1, backgroundColor: '#1B2B4B',
    alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#C49A1A', fontWeight: '600', marginTop: 12, textAlign: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
    backgroundColor: '#1B2B4B' },
  back: { color: '#C49A1A', fontSize: 15, fontWeight: '700' },
  skillTitle: { color: 'white', fontSize: 14, fontWeight: '700',
    flex: 1, textAlign: 'center', marginHorizontal: 8 },
  timerBox: { backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  timerText: { color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 15, fontWeight: '700' },
  progressOuter: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  progressInner: { height: 4, backgroundColor: '#C49A1A' },
  scroll: { flex: 1, padding: 16 },
  nudge: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1.5, borderColor: '#C49A1A' },
  nudgeText: { color: '#1B2B4B', fontSize: 13, fontWeight: '600' },
  questionCard: { backgroundColor: 'white', borderRadius: 16, padding: 22,
    marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  questionText: { fontSize: 20, fontWeight: '700',
    color: '#1B2B4B', lineHeight: 28 },
  resultCard: { borderRadius: 14, padding: 16, marginBottom: 16,
    alignItems: 'center', borderWidth: 2 },
  resultCorrect: { backgroundColor: '#DCFCE7', borderColor: '#22C55E' },
  resultWrong: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  resultEmoji: { fontSize: 36, marginBottom: 6 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: '#1B2B4B', marginBottom: 4 },
  resultAnswer: { fontSize: 15, fontWeight: '600', color: '#1B2B4B', marginBottom: 4 },
  resultXP: { fontSize: 14, fontWeight: '700', color: '#C49A1A' },
  option: { backgroundColor: 'white', borderRadius: 14, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderColor: '#E2E8F0' },
  optionSelected: { borderColor: '#C49A1A', backgroundColor: '#FFFBEB' },
  optionCorrect: { borderColor: '#22C55E', backgroundColor: '#DCFCE7' },
  optionWrong: { borderColor: '#F59E0B', backgroundColor: '#FEF3C7' },
  optionLetter: { fontSize: 16, fontWeight: '800', color: '#1B2B4B', width: 24 },
  optionText: { fontSize: 16, color: '#1B2B4B', fontWeight: '600', flex: 1 },
  nextBtn: { backgroundColor: '#1B2B4B', borderRadius: 14, padding: 18,
    alignItems: 'center', borderWidth: 2, borderColor: '#C49A1A', marginTop: 8 },
  nextBtnText: { color: 'white', fontSize: 17, fontWeight: '800' },
})
