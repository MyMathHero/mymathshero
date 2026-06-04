import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, Platform,
  AppState, AppStateStatus,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import api, { studentAPI } from '../../lib/api'
import { showAchievementNotification } from '../../lib/notifications'
import { SafeAreaView } from 'react-native-safe-area-context'
import AskHeroSheet from '../../components/AskHeroSheet'
import HeroRobot from '../../components/HeroRobot'

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
  const [showAskHero, setShowAskHero] = useState(false)
  const [cheatWarning, setCheatWarning] = useState(false)
  const timerRef = useRef<any>(null)
  const totalTimerRef = useRef<any>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const cheatCountRef = useRef(0)

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

  // Anti-cheat: detect backgrounding during an unanswered question. If the
  // student goes away and comes back: warn, swap to a different question.
  // After 3 offences end the session.
  useEffect(() => {
    if (questions.length === 0) return
    const sub = AppState.addEventListener('change', handleAppStateChange)
    return () => sub.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, currentIndex, result])

  function handleAppStateChange(nextState: AppStateStatus) {
    const prev = appStateRef.current
    appStateRef.current = nextState

    // Backgrounded while a question is open and unanswered.
    if (prev === 'active' && nextState !== 'active' && !result) {
      cheatCountRef.current += 1
    }

    // Returned to the app — punish if they backgrounded.
    if (prev !== 'active' && nextState === 'active' && cheatCountRef.current > 0) {
      // After 3 offences, end the session.
      if (cheatCountRef.current >= 3) {
        Alert.alert(
          'Session Ended',
          'You left the app too many times during questions. Your session has ended.',
          [{ text: 'OK', onPress: () => router.back() }]
        )
        return
      }
      setCheatWarning(true)
      setSelected(null)
      setResult(null)
      setTimer(0)
      loadDifferentQuestion()
    }
  }

  // Fetch a fresh question that isn't the one the student just left.
  async function loadDifferentQuestion() {
    try {
      const res = await studentAPI.questions(skillId, parseInt(grade || '3'))
      const incoming: any[] = res?.data?.questions || []
      if (incoming.length === 0) return
      const currentQid = questions[currentIndex]?.questionId
      const different = incoming.find(q => q.questionId !== currentQid) || incoming[0]
      // Replace the current slot in-place so we keep the index/total in sync.
      setQuestions(prev => {
        const next = [...prev]
        next[currentIndex] = different
        return next
      })
    } catch (err) {
      console.error('loadDifferentQuestion failed:', err)
      // If we can't fetch a new one, leaving state reset is still better than
      // letting the student see the old one with a cheat warning.
    }
  }

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

      // Local achievement notifications — fire-and-forget, never block.
      // The web API returns `mastered` boolean and `newBadges: [{name, ...}]`.
      if (res.data?.mastered) {
        showAchievementNotification(
          '🏆 Skill Mastered!',
          'Amazing! You have mastered this skill. Keep going Hero!',
          'skill_mastered'
        ).catch(() => {})
      }
      if (Array.isArray(res.data?.newBadges) && res.data.newBadges.length > 0) {
        const badge = res.data.newBadges[0]
        showAchievementNotification(
          `🏅 New Badge: ${badge?.name || 'Badge earned!'}`,
          badge?.description || 'You earned a new badge!',
          'badge_earned'
        ).catch(() => {})
      }
    } catch {
      Alert.alert('Error', 'Could not submit answer.')
    } finally {
      setSubmitting(false)
    }
  }

  // Fire-and-forget feedback POST. Errors swallowed — feedback must never
  // disrupt practice flow.
  async function submitQuickFeedback(rating: number, message: string) {
    try {
      const studentId = await SecureStore.getItemAsync('user_id')
      await api.post('/api/feedback', {
        userId: studentId,
        role: 'student',
        type: 'session',
        rating,
        message,
        context: { skillId, page: 'practice' },
        platform: 'mobile',
      })
    } catch {
      // Silent.
    }
  }

  // Prompt every 5 questions completed. Spec calls for thumbs up / just right /
  // too easy; I added "Not now" so the student isn't trapped if they're mid-flow.
  function askSessionFeedback() {
    Alert.alert(
      '🤖 Quick Check!',
      'How are the questions going?',
      [
        { text: '😕 Too Hard',    onPress: () => submitQuickFeedback(2, 'too_hard') },
        { text: '😊 Just Right',  onPress: () => submitQuickFeedback(4, 'just_right') },
        { text: '😎 Too Easy',    onPress: () => submitQuickFeedback(3, 'too_easy') },
        { text: 'Not now', style: 'cancel' },
      ],
      { cancelable: true }
    )
  }

  function handleNext(wasCorrect?: boolean) {
    const nextIndex = currentIndex + 1
    // Trigger every 5 questions completed (5, 10, 15, …). Skip during speed
    // rounds — they're short and have their own completion screen.
    if (!isSpeedRound && nextIndex > 0 && nextIndex % 5 === 0) {
      askSessionFeedback()
    }
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
        <HeroRobot mood="thinking" size={120} containerStyle="circle" />
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
        {/* Nudge — opens in-app Ask Hero bottom sheet */}
        {showNudge && !result && (
          <View style={styles.nudge}>
            <Text style={styles.nudgeText}>
              🤖 Stuck? Ask Hero for help!
            </Text>
            <TouchableOpacity
              onPress={() => setShowAskHero(true)}
              style={styles.nudgeBtn}
            >
              <Text style={styles.nudgeBtnText}>Ask Hero ✦</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Anti-cheat warning — shown after student backgrounded the app */}
        {cheatWarning && (
          <View style={styles.cheatBanner}>
            <Text style={styles.cheatBannerText}>
              ⚠️ You left the app — here&apos;s a different question.
            </Text>
            <TouchableOpacity onPress={() => setCheatWarning(false)}>
              <Text style={styles.cheatBannerDismiss}>dismiss</Text>
            </TouchableOpacity>
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
            <HeroRobot
              mood={result.correct ? 'celebrating' : 'sad'}
              size={80}
              containerStyle="card"
            />
            <Text style={styles.resultTitle}>
              {result.correct ? '🎉 Correct! Amazing!' : "Why don't we try this way?"}
            </Text>
            {!result.correct && result.correctAnswer && (
              <Text style={styles.resultAnswer}>
                The answer is: <Text style={styles.resultAnswerStrong}>{result.correctAnswer}</Text>
              </Text>
            )}
            <View style={styles.resultXpPill}>
              <Text style={styles.resultXpText}>
                +{result.xpGained || (result.correct ? 10 : 2)} Hero Points ⚡
              </Text>
            </View>
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

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Ask Hero CTA — always visible during an unanswered question.
          Sibling of ScrollView so position:absolute uses the screen frame. */}
      {!result && (
        <TouchableOpacity
          onPress={() => setShowAskHero(true)}
          style={styles.floatingAsk}
          activeOpacity={0.85}
        >
          <Text style={styles.floatingAskEmoji}>🤖</Text>
          <Text style={styles.floatingAskText}>Ask Hero</Text>
        </TouchableOpacity>
      )}

      <AskHeroSheet
        visible={showAskHero}
        onClose={() => setShowAskHero(false)}
        question={q?.question || ''}
        skillId={skillId}
        questionId={q?.questionId || ''}
        grade={parseInt(grade || '3', 10)}
      />
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
    marginBottom: 12, borderWidth: 1.5, borderColor: '#C49A1A',
    flexDirection: 'row', alignItems: 'center', gap: 12 },
  nudgeText: { color: '#1B2B4B', fontSize: 13, fontWeight: '600', flex: 1 },
  nudgeBtn: { backgroundColor: '#C49A1A', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6 },
  nudgeBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  cheatBanner: { backgroundColor: '#FEF3C7', borderRadius: 12,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F59E0B',
    flexDirection: 'row', alignItems: 'center', gap: 12 },
  cheatBannerText: { flex: 1, color: '#92400E', fontSize: 13, fontWeight: '600' },
  cheatBannerDismiss: { color: '#92400E', fontSize: 12,
    textDecorationLine: 'underline' },
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
  resultAnswerStrong: { fontWeight: '800', color: '#1B2B4B' },
  resultXpPill: {
    backgroundColor: '#C49A1A', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6, marginTop: 10,
  },
  resultXpText: { color: 'white', fontWeight: '800' },
  floatingAsk: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#1B2B4B',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#C49A1A',
    shadowColor: '#C49A1A',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
  floatingAskEmoji: { fontSize: 20 },
  floatingAskText: { color: '#C49A1A', fontWeight: '800', fontSize: 14 },
})
