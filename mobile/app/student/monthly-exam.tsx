import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenBackground } from '../../lib/ui'
import { studentAPI } from '../../lib/api'
import { formatMath } from '../../components/MathText'
import { useTheme, ThemeColors } from '../../lib/themeContext'

const strip = (s: string) => String(s ?? '').trim().replace(/^\s*[A-Da-d][).:]\s*/, '')

export default function MonthlyExamScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<{ questionId: string; answer: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const id = (await SecureStore.getItemAsync('user_id')) || ''
      setStudentId(id)
      try {
        const res = await studentAPI.monthlyExam(id)
        const data = res?.data || {}
        if (!data.due) {
          setResult({ notDue: true, daysUntil: data.daysUntil })
        } else if (!data.available || !data.questions?.length) {
          setError('No review questions available right now. Try again later!')
        } else {
          setQuestions(data.questions)
        }
      } catch {
        setError('Could not load the review exam.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const q = questions[idx]

  function choose(option: string) {
    const next = [...answers.filter(a => a.questionId !== q.questionId), { questionId: q.questionId, answer: option }]
    setAnswers(next)
    if (idx + 1 < questions.length) setIdx(idx + 1)
    else submit(next)
  }

  async function submit(finalAnswers: { questionId: string; answer: string }[]) {
    setSubmitting(true)
    try {
      const res = await studentAPI.monthlyExamSubmit(studentId, finalAnswers)
      setResult(res?.data || null)
    } catch {
      setError('Could not submit your answers.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: colors.accentGold, fontWeight: '700', fontSize: 15 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Monthly Review</Text>
          <View style={{ width: 44 }} />
        </View>

        {loading && (
          <View style={s.center}><ActivityIndicator color={colors.accentGold} size="large" /></View>
        )}
        {error && <View style={s.center}><Text style={{ color: '#EF4444' }}>{error}</Text></View>}

        {result?.notDue && (
          <View style={s.center}>
            <Text style={{ fontSize: 56 }}>📅</Text>
            <Text style={[s.big, { color: colors.textPrimary }]}>No exam due yet</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 6, textAlign: 'center' }}>
              Your next HERO exam is in {result.daysUntil} day{result.daysUntil === 1 ? '' : 's'}. Keep practising! 💪
            </Text>
            <TouchableOpacity onPress={() => router.back()} style={[s.goldBtn, { marginTop: 22 }]}>
              <Text style={s.goldBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}

        {result && !result.notDue && (
          <View style={s.center}>
            <Text style={{ fontSize: 60 }}>{result.score >= 85 ? '🏆' : '📊'}</Text>
            <Text style={[s.big, { color: colors.textPrimary }]}>
              {result.alreadyTaken ? 'Exam submitted' : 'HERO Exam complete!'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 4 }}>Score: {result.score}%</Text>
            {result.bonusAwarded > 0 ? (
              <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 18, marginTop: 8 }}>+{result.bonusAwarded} 🪙 bonus!</Text>
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>Score 85%+ next time for a bonus!</Text>
            )}
            {!!result.heroSummary && (
              <View style={{ marginTop: 14, backgroundColor: colors.bgCard, borderColor: colors.borderColor, borderWidth: 1, borderRadius: 12, padding: 12, maxWidth: 460 }}>
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 12, marginBottom: 4 }}>🦸 Hero says</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20 }}>{result.heroSummary}</Text>
              </View>
            )}
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 10, textAlign: 'center' }}>
              Freestyle practice, arcade &amp; challenges are now unlocked. 🎉
            </Text>
            <TouchableOpacity onPress={() => router.back()} style={[s.goldBtn, { marginTop: 16 }]}>
              <Text style={s.goldBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && !result && q && (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 13 }}>📅 Monthly Review</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{idx + 1} / {questions.length}</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${(idx / questions.length) * 100}%` as any }]} />
            </View>
            <Text style={[s.question, { color: colors.textPrimary }]}>{formatMath(q.question)}</Text>
            <View style={{ gap: 10, marginTop: 16 }}>
              {(q.options || []).map((opt: string, i: number) => (
                <TouchableOpacity key={i} disabled={submitting} onPress={() => choose(opt)} style={s.option}>
                  <Text style={[s.optionText, { color: colors.textPrimary }]}>{formatMath(strip(opt))}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {submitting && <ActivityIndicator color={colors.accentGold} style={{ marginTop: 16 }} />}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 8,
  },
  headerTitle: { color: c.textPrimary, fontWeight: '900', fontSize: 17 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  big: { fontWeight: '800', fontSize: 22, marginTop: 8, textAlign: 'center' },
  barBg: { height: 6, backgroundColor: c.borderColor, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: c.accentGold, borderRadius: 3 },
  question: { fontWeight: '700', fontSize: 18, marginTop: 16 },
  option: {
    padding: 14, borderRadius: 12, borderWidth: 2, borderColor: c.borderColor, backgroundColor: c.bgCard,
  },
  optionText: { fontWeight: '600', fontSize: 15 },
  goldBtn: {
    backgroundColor: c.accentGold, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40,
  },
  goldBtnText: { color: '#1B2B4B', fontWeight: '800', fontSize: 15 },
})
