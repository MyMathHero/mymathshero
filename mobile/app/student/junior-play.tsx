import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenBackground } from '../../lib/ui'
import HeroRobot from '../../components/HeroRobot'
import VisualRender from '../../components/junior/VisualRender'
import RewardBurst, { comboMessage, type Burst } from '../../components/RewardBurst'
import AskHeroSheet from '../../components/AskHeroSheet'
import { studentAPI } from '../../lib/api'
import { getSkillInfo } from '../../lib/skillNames'
import { categoriesForWorld } from '../../lib/juniorMode'
import { speak, stopSpeaking } from '../../lib/heroVoice'

const NAVY = '#1B2B4B', GOLD = '#C49A1A'

// Mobile Junior play loop — mirrors web /junior/play.
export default function JuniorPlay() {
  const router = useRouter()
  const { world } = useLocalSearchParams<{ world?: string }>()
  const [studentId, setStudentId] = useState('')
  const [skill, setSkill] = useState<{ id: string; name: string } | null>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [mood, setMood] = useState<'waving' | 'thinking' | 'happy' | 'sad'>('waving')
  const [reward, setReward] = useState<Burst>(null)
  const [showTutor, setShowTutor] = useState(false)
  const [error, setError] = useState('')
  const combo = useRef(0), best = useRef(0), busy = useRef(false)

  useEffect(() => {
    (async () => {
      const id = (await SecureStore.getItemAsync('user_id')) || ''
      if (!id) { router.replace('/login'); return }
      setStudentId(id)
      await loadSkill(id)
    })()
    return () => { void stopSpeaking() }
  }, [])

  async function loadSkill(id: string) {
    try {
      const rr = await studentAPI.recommendations(id)
      const recs = rr.data?.recommendations || []
      let chosen: any = null
      if (world) {
        const cats = categoriesForWorld(String(world))
        chosen = recs.find((sk: any) => cats.includes(getSkillInfo(sk.id || sk.skillId)?.category as any))
      }
      chosen = chosen || recs[0] || { id: 'm_0_count10', name: 'Counting to 10' }
      const sid = chosen.id || chosen.skillId
      setSkill({ id: sid, name: chosen.name || getSkillInfo(sid)?.name || 'Maths' })
      const qr = await studentAPI.juniorQuestions(sid, id)
      const qs = (qr.data?.questions || []).filter((q: any) => q.visual)
      if (!qs.length) { setError("Let's try a different game!"); return }
      setQuestions(qs); setIndex(0); setPicked(null); setCorrect(null)
    } catch { setError('Could not start the game.') }
  }

  // Narrate each question as it appears.
  useEffect(() => {
    const q = questions[index]
    if (!q) return
    setMood('thinking')
    void speak(q.narration || q.question || '')
  }, [index, questions])

  const q = questions[index]

  async function answer(opt: string) {
    if (busy.current || picked != null || !q || !skill) return
    busy.current = true
    setPicked(opt)
    void stopSpeaking()
    try {
      const res = await studentAPI.answer({
        studentId, skillId: skill.id, questionId: q.questionId,
        answer: opt, timeTakenMs: 4000, hintUsed: false, difficulty: q.difficulty || 0.3,
      })
      const ok = !!res.data?.correct
      setCorrect(ok)
      if (ok) {
        combo.current += 1
        const newBest = combo.current > best.current
        if (newBest) best.current = combo.current
        setMood('happy')
        const msg = comboMessage(combo.current, { newBest })
        setReward({ id: Date.now(), xp: res.data?.xpGained ?? 10, coins: res.data?.coinsGained ?? 5, message: msg })
        void speak(msg.replace(/[^\w !?,'-]/g, ''))
      } else {
        combo.current = 0
        setMood('sad')
        void speak(`Good try! The answer is ${res.data?.correctAnswer}. Let's keep going!`)
      }
      setTimeout(() => next(), 2200)
    } catch {
      setTimeout(() => next(), 800)
    } finally {
      busy.current = false
    }
  }

  async function next() {
    void stopSpeaking()
    setPicked(null); setCorrect(null); setMood('thinking')
    if (index + 1 < questions.length) setIndex(i => i + 1)
    else if (studentId) await loadSkill(studentId)
  }

  if (error) {
    return (
      <ScreenBackground><SafeAreaView style={s.center} edges={['top']}>
        <HeroRobot mood="thinking" size={130} containerStyle="card" />
        <Text style={s.big}>{error}</Text>
        <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/student/junior')}><Text style={s.homeBtnText}>🏠 Home</Text></TouchableOpacity>
      </SafeAreaView></ScreenBackground>
    )
  }
  if (!q) {
    return <ScreenBackground><SafeAreaView style={s.center} edges={['top']}><HeroRobot mood="thinking" size={130} containerStyle="card" /><Text style={s.big}>Getting your game ready…</Text></SafeAreaView></ScreenBackground>
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <RewardBurst burst={reward} />
        {/* Top bar */}
        <View style={s.top}>
          <TouchableOpacity onPress={() => { void stopSpeaking(); router.replace('/student/junior') }} style={s.iconBtn}><Text style={{ fontSize: 20 }}>🏠</Text></TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {questions.map((_, i) => <View key={i} style={[s.dot, { backgroundColor: i < index ? GOLD : i === index ? NAVY : '#CBD5E1' }]} />)}
          </View>
          <TouchableOpacity onPress={() => { void stopSpeaking(); setShowTutor(true) }} style={[s.iconBtn, { width: 'auto', paddingHorizontal: 12 }]}><Text style={{ fontWeight: '800', color: NAVY }}>👀 Show me</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll}>
          <HeroRobot mood={mood === 'sad' ? 'sad' : mood === 'happy' ? 'celebrating' : 'thinking'} size={96} containerStyle="card" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 }}>
            <Text style={s.qText}>{q.question}</Text>
            <TouchableOpacity onPress={() => void speak(q.narration || q.question)} style={s.iconBtn}><Text style={{ fontSize: 18 }}>🔊</Text></TouchableOpacity>
          </View>
          <View style={s.visualCard}><VisualRender visual={q.visual} /></View>
          <View style={s.opts}>
            {(q.options || []).map((opt: string, i: number) => {
              const isPick = picked === opt
              let bg = 'white', bd = '#E2E8F0', col = NAVY
              if (picked != null) {
                if (isPick && correct) { bg = '#ECFDF5'; bd = '#22C55E'; col = '#15803D' }
                else if (isPick && !correct) { bg = '#FEF2F2'; bd = '#FCA5A5'; col = '#B91C1C' }
              }
              return (
                <TouchableOpacity key={i} disabled={picked != null} onPress={() => answer(opt)}
                  style={[s.opt, { backgroundColor: bg, borderColor: bd }]}>
                  <Text style={[s.optText, { color: col }]}>{opt}{isPick && correct ? ' ✅' : isPick && correct === false ? ' ❌' : ''}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>

        <AskHeroSheet
          visible={showTutor}
          onClose={() => setShowTutor(false)}
          question={q.question}
          skillId={skill?.id}
          questionId={q.questionId}
          grade={0}
        />
      </SafeAreaView>
    </ScreenBackground>
  )
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  big: { color: NAVY, fontSize: 20, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  homeBtn: { marginTop: 16, backgroundColor: GOLD, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 32 },
  homeBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  iconBtn: { backgroundColor: 'white', borderColor: '#E2E8F0', borderWidth: 2, borderRadius: 14, minWidth: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 11, height: 11, borderRadius: 99 },
  scroll: { alignItems: 'center', padding: 14, paddingBottom: 40 },
  qText: { color: NAVY, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  visualCard: { backgroundColor: 'white', borderColor: '#E2E8F0', borderWidth: 3, borderRadius: 22, padding: 16, marginVertical: 12, width: '94%', alignItems: 'center' },
  opts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, width: '94%' },
  opt: { borderWidth: 3, borderRadius: 18, paddingVertical: 18, minWidth: 120, flexGrow: 1, alignItems: 'center' },
  optText: { fontSize: 28, fontWeight: '900' },
})
