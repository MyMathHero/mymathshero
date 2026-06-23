import { useState, useEffect, useRef } from 'react'
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native'
import * as Speech from 'expo-speech'
import * as SecureStore from 'expo-secure-store'
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { File, Paths } from 'expo-file-system'
import { fetch as expoFetch } from 'expo/fetch'
import api, { API_URL } from '../lib/api'
import HeroRobot from './HeroRobot'
import Manipulative from './manipulatives/Manipulative'

// Audio playback uses expo-audio + expo-file-system (SDK 56-correct).
// expo-av was removed in SDK 56. We stream the OpenAI proxy response straight
// into a cache file via WritableStream, then play with createAudioPlayer.

interface Props {
  visible: boolean
  onClose: () => void
  question?: string | null   // null/'' = general Maths mode (floating button)
  skillId?: string
  questionId?: string
  grade?: number
  studentName?: string
}

// UI message and API message kept in sync. role 'hero' ⇄ 'assistant'.
type Message = {
  role: 'hero' | 'student'
  text: string
  isIntro?: boolean
  manipulative?: string | null
}

export default function AskHeroSheet({
  visible, onClose, question, skillId, questionId, grade = 3, studentName = 'Hero',
}: Props) {
  const general = !question

  const [messages, setMessages] = useState<Message[]>([])
  // Conversation history sent to the API (gives the model memory).
  const [conversation, setConversation] =
    useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [robotMood, setRobotMood] =
    useState<'waving' | 'thinking' | 'happy'>('waving')
  // Teach Me (animated whiteboard lesson) vs Ask (chat). Default to Teach when
  // there's a question to teach.
  const [tab, setTab] = useState<'teach' | 'ask'>(question ? 'teach' : 'ask')
  const [lesson, setLesson] = useState<{ steps: any[]; manipulative?: string | null } | null>(null)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [lessonError, setLessonError] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const lessonPlayingRef = useRef(false)
  const slideAnim = useRef(new Animated.Value(600)).current
  const scrollRef = useRef<ScrollView>(null)
  const playerRef = useRef<AudioPlayer | null>(null)

  // Open/close animation + fresh conversation each time the sheet opens.
  useEffect(() => {
    if (visible) {
      resetConversation()
      const startTab: 'teach' | 'ask' = question ? 'teach' : 'ask'
      setTab(startTab)
      setLesson(null); setLessonError(''); setStepIndex(0)
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start()
      // Teach mode auto-fetches + narrates a lesson; Ask mode plays the chat intro.
      const t = setTimeout(() => {
        if (startTab === 'teach') { void runLesson() }
        else { void playIntroduction() }
      }, 600)
      return () => clearTimeout(t)
    }
    Animated.timing(slideAnim, {
      toValue: 600, duration: 250, useNativeDriver: true,
    }).start()
    void stopAllAudio()
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Reset the conversation when the student moves to a new question.
  useEffect(() => {
    if (visible) resetConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId])

  function resetConversation() {
    setMessages([])
    setConversation([])
    setInput('')
  }

  async function playIntroduction() {
    setRobotMood('waving')
    const intro = general
      ? `Hi ${studentName}! I'm Hero, your AI Maths tutor. What Maths question can I help you with today?`
      : `Hi ${studentName}! I'm Hero, your AI Maths tutor. I won't give you the answer, but I'll help you figure it out. What part are you stuck on?`
    addHeroMessage(intro, true)
    await speakWithOpenAI(intro)
  }

  // Fetch a structured lesson and narrate it step-by-step, revealing each line
  // as Hero speaks it. Reuses speakWithOpenAI (OpenAI TTS via expo/fetch).
  async function runLesson() {
    if (!question || lessonLoading) return
    setLessonLoading(true); setLessonError(''); setRobotMood('thinking')
    try {
      const studentId = (await SecureStore.getItemAsync('user_id')) || ''
      const res = await api.post('/api/student/lesson', {
        questionText: question, questionId: questionId || null,
        skillId: skillId || null, studentId, grade,
      })
      if (res.data?.upgrade) { setLessonError(res.data.message || 'Teach Me is a Premium feature 💎'); setRobotMood('waving'); return }
      const lsn = res.data?.lesson
      if (!lsn?.steps?.length) { setLessonError("I couldn't build a lesson right now."); setRobotMood('waving'); return }
      setLesson(lsn)
      setStepIndex(0)
      lessonPlayingRef.current = true
      // Narrate steps in order, revealing each as we speak it.
      for (let i = 0; i < lsn.steps.length; i++) {
        if (!lessonPlayingRef.current) break
        setStepIndex(i)
        setRobotMood('happy')
        const say = lsn.steps[i]?.say
        if (say) await speakWithOpenAI(say)
        else await new Promise(r => setTimeout(r, 1200))
      }
      setRobotMood('happy')
    } catch {
      setLessonError("I had trouble connecting. Try again! 🤖")
      setRobotMood('waving')
    } finally {
      setLessonLoading(false)
    }
  }

  // Try the OpenAI nova proxy at /api/hero-voice; fall back to expo-speech.
  async function speakWithOpenAI(text: string): Promise<void> {
    const clean = text
      .replace(/[✦🤖🎯💪🎉😅🔥⚡🏆👋]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!clean) return

    setSpeaking(true)

    try {
      await stopAllAudio()

      // Play through the device even when the iOS silent switch is on, so Hero's
      // voice is actually audible. Best-effort — never block playback if it fails.
      try {
        await setAudioModeAsync({ playsInSilentMode: true })
      } catch {}

      // Fetch the audio via expo/fetch (NOT axios). axios `responseType:
      // 'arraybuffer'` is unreliable in React Native and returns a body whose
      // bytes are mangled, so playback silently failed and we dropped to the
      // phone's default TTS voice. expo/fetch's response.bytes() gives a real
      // Uint8Array. We add the same auth headers the axios interceptor would.
      const token = await SecureStore.getItemAsync('auth_token')
      const res = await expoFetch(`${API_URL}/api/hero-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? {
                Cookie: `mymathshero_token=${token}`,
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify({ text: clean }),
      })
      if (!res.ok) {
        throw new Error(`hero-voice ${res.status}`)
      }
      const bytes = await res.bytes()
      if (!bytes || bytes.byteLength === 0) {
        throw new Error('Empty audio response')
      }

      // Write the audio bytes to a cache file via the modern File API.
      const file = new File(Paths.cache, `hero-${Date.now()}.mp3`)
      try { file.create() } catch {}
      file.write(bytes)

      // Play via expo-audio. createAudioPlayer is the imperative SDK 56 API.
      const player = createAudioPlayer({ uri: file.uri })
      playerRef.current = player
      player.play()

      await new Promise<void>((resolve) => {
        const sub = player.addListener('playbackStatusUpdate', (status) => {
          if (status?.didJustFinish) {
            try { sub.remove() } catch {}
            resolve()
          }
        })
      })

      try { player.release() } catch {}
      playerRef.current = null
      try { file.delete() } catch {}
      setSpeaking(false)
      return
    } catch (err) {
      console.log('OpenAI TTS failed, falling back to expo-speech:', err)
    }

    // Fallback: expo-speech.
    try { await Speech.stop() } catch {}
    await new Promise<void>((resolve) => {
      Speech.speak(clean, {
        language: 'en-AU',
        rate: 0.85,
        pitch: 1.05,
        onDone: () => { setSpeaking(false); resolve() },
        onError: () => { setSpeaking(false); resolve() },
        onStopped: () => { setSpeaking(false); resolve() },
      })
    })
  }

  async function stopAllAudio() {
    setSpeaking(false)
    try { await Speech.stop() } catch {}
    if (playerRef.current) {
      try { playerRef.current.pause() } catch {}
      try { playerRef.current.release() } catch {}
      playerRef.current = null
    }
  }

  function addHeroMessage(text: string, isIntro = false, manipulative: string | null = null) {
    setMessages(prev => [...prev, { role: 'hero', text, isIntro, manipulative }])
    // Mirror into the API conversation as an assistant turn.
    setConversation(prev => [...prev, { role: 'assistant', content: text }])
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  async function sendHeroMessage() {
    if (!input.trim() || loading || speaking) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'student', text: userMsg }])
    const updatedConversation = [...conversation, { role: 'user' as const, content: userMsg }]
    setConversation(updatedConversation)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)

    setLoading(true)
    setRobotMood('thinking')
    try {
      const studentId = (await SecureStore.getItemAsync('user_id')) || ''
      const res = await api.post('/api/student/hint', {
        messages: updatedConversation,
        questionText: general ? null : question,
        questionId: general ? null : (questionId || null),
        // skillId lets the server tailor hints to this skill's recent history.
        skillId: general ? null : (skillId || null),
        studentName,
        grade,
        studentId,
      })
      const reply = res.data?.reply
        || "I'm thinking... what have you tried so far? 🤔"
      setRobotMood('happy')
      // res.data.manipulative is a tool key when Hero chose to surface a visual.
      addHeroMessage(reply, false, res.data?.manipulative || null)
      await speakWithOpenAI(reply)
    } catch {
      setRobotMood('happy')
      const fallback = 'Connection issue — try again! 🤖'
      addHeroMessage(fallback)
    } finally {
      setLoading(false)
    }
  }

  async function handleClose() {
    lessonPlayingRef.current = false
    await stopAllAudio()
    onClose()
  }

  // Switch tabs: stop any lesson/voice, then enter the chosen mode.
  function switchTab(next: 'teach' | 'ask') {
    if (next === tab) return
    lessonPlayingRef.current = false
    void stopAllAudio()
    setTab(next)
    if (next === 'teach') { if (!lesson) void runLesson() }
    else if (messages.length === 0) { void playIntroduction() }
  }

  function replayLesson() {
    if (!lesson) return
    lessonPlayingRef.current = false
    void stopAllAudio().then(() => { setStepIndex(0); setLesson(null); void runLesson() })
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={s.overlay}
        activeOpacity={1}
        onPress={handleClose}
      />

      <Animated.View style={[s.sheet, tab === 'teach' && s.sheetTall, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handle} />

        {/* Hero header */}
        <View style={s.header}>
          <View style={s.robotContainer}>
            <HeroRobot mood={robotMood} size={48} containerStyle="circle" />
            {speaking && <View style={s.speakingRing} />}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.heroName}>
              {tab === 'teach' ? <>Hero is <Text style={{ color: '#C49A1A' }}>teaching</Text> ✦</> : <>Ask <Text style={{ color: '#C49A1A' }}>Hero</Text> ✦</>}
            </Text>
            <Text style={s.heroSub}>
              {loading || lessonLoading ? '🤔 Hero is thinking...'
                : speaking ? '🔊 Hero is speaking...'
                : '🤖 Your AI Maths Tutor'}
            </Text>
          </View>

          <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs (only when a question is present to teach) */}
        {!general && (
          <View style={s.tabsRow}>
            <TouchableOpacity onPress={() => switchTab('teach')} style={[s.tab, tab === 'teach' && s.tabActive]}>
              <Text style={[s.tabText, tab === 'teach' && s.tabTextActive]}>✏️ Teach Me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchTab('ask')} style={[s.tab, tab === 'ask' && s.tabActive]}>
              <Text style={[s.tabText, tab === 'ask' && s.tabTextActive]}>💬 Ask Hero</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Teach Me: animated whiteboard lesson ───────────────────────── */}
        {tab === 'teach' && (
          <View style={{ flex: 1 }}>
            <View style={s.questionRef}>
              <Text style={s.questionRefLabel}>📝 Question</Text>
              <Text style={s.questionRefText} numberOfLines={3}>{question}</Text>
            </View>
            <ScrollView style={s.whiteboard} contentContainerStyle={{ padding: 18 }}>
              {lessonLoading && !lesson && (
                <Text style={s.wbHint}>Hero is preparing your lesson… ✦✦✦</Text>
              )}
              {!!lessonError && <Text style={s.wbError}>{lessonError}</Text>}
              {lesson?.steps.slice(0, stepIndex + 1).map((st: any, i: number) => (
                <View key={i} style={{ marginBottom: 16 }}>
                  {!!st.say && <Text style={s.wbSay}>{st.say}</Text>}
                  {!!st.write && (
                    <Text style={[s.wbWrite, st.emphasis === 'result' && s.wbResult]}>{st.write}</Text>
                  )}
                </View>
              ))}
              {lesson?.manipulative && stepIndex >= (lesson.steps.length - 1) && (
                <Manipulative tool={lesson.manipulative} />
              )}
            </ScrollView>
            {lesson && (
              <View style={s.lessonControls}>
                <TouchableOpacity onPress={replayLesson} style={s.lessonBtn}>
                  <Text style={s.lessonBtnText}>⏮ Replay</Text>
                </TouchableOpacity>
                <Text style={s.lessonStep}>Step {Math.min(stepIndex + 1, lesson.steps.length)} / {lesson.steps.length}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Ask Hero: chat (only in ask mode) ──────────────────────────── */}
        {tab === 'ask' && (<>
        {/* Current question reference (only in question mode) */}
        <View style={s.questionRef}>
          <Text style={s.questionRefLabel}>
            {general ? '🤖 General Maths help' : '📝 Current question:'}
          </Text>
          <Text style={s.questionRefText} numberOfLines={2}>
            {general ? 'Ask me anything about Maths! 😊' : question}
          </Text>
        </View>

        {/* Chat */}
        <ScrollView
          ref={scrollRef}
          style={s.chat}
          contentContainerStyle={{ padding: 14, gap: 12 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, i) => (
            <View key={i}>
              <View style={msg.role === 'hero' ? s.heroBubbleRow : s.studentBubbleRow}>
                {msg.role === 'hero' && (
                  <Text style={{ fontSize: 16 }}>🤖</Text>
                )}
                <View style={[
                  s.bubble,
                  msg.role === 'hero' ? s.heroBubble : s.studentBubble,
                  msg.isIntro && s.introBubble,
                ]}>
                  <Text style={[
                    s.bubbleText,
                    msg.isIntro && s.introBubbleText,
                  ]}>
                    {msg.text}
                  </Text>
                </View>
              </View>
              {/* Inline visual tool Hero chose to surface (if any). */}
              {msg.role === 'hero' && msg.manipulative && (
                <Manipulative tool={msg.manipulative} />
              )}
            </View>
          ))}

          {loading && (
            <View style={s.heroBubbleRow}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
              <View style={[s.bubble, s.heroBubble]}>
                <View style={s.thinkingRow}>
                  <ActivityIndicator color="#C49A1A" size="small" />
                  <Text style={s.thinkingText}>Thinking... 🤔</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Ask Hero anything about Maths..."
              placeholderTextColor="#94A3B8"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendHeroMessage}
              editable={!loading && !speaking}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || loading || speaking) && s.sendBtnOff]}
              onPress={sendHeroMessage}
              disabled={!input.trim() || loading || speaking}
            >
              <Text style={s.sendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        </>)}
      </Animated.View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    minHeight: '55%',
    borderTopWidth: 3,
    borderColor: '#C49A1A',
  },
  sheetTall: { maxHeight: '94%', minHeight: '90%' },
  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: '#1B2B4B' },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabActive: { backgroundColor: '#C49A1A' },
  tabText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: 'white' },
  whiteboard: { flex: 1, backgroundColor: '#FCFBF7' },
  wbHint: { color: '#64748B', fontSize: 17 },
  wbError: { color: '#B91C1C', fontSize: 16 },
  wbSay: { color: '#1B2B4B', fontSize: 18, lineHeight: 25, marginBottom: 6 },
  wbWrite: { color: '#0f3d6e', fontSize: 22, fontWeight: '600' },
  wbResult: { color: '#15803d', fontSize: 26, fontWeight: '800', backgroundColor: '#ECFDF5', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  lessonControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderTopWidth: 1, borderColor: '#E2E8F0' },
  lessonBtn: { backgroundColor: '#C49A1A', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  lessonBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },
  lessonStep: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  handle: {
    width: 44, height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1B2B4B',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(196,154,26,0.3)',
  },
  robotContainer: {
    position: 'relative',
    width: 56, height: 56,
  },
  speakingRing: {
    position: 'absolute',
    top: -4, left: -4,
    width: 64, height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  heroName: { color: 'white', fontWeight: '800', fontSize: 17 },
  heroSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: 'white', fontSize: 16 },
  questionRef: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  questionRefLabel: {
    fontSize: 11, color: '#94A3B8',
    fontWeight: '600', marginBottom: 3,
  },
  questionRefText: {
    fontSize: 14, color: '#1B2B4B', fontWeight: '600',
  },
  chat: { flex: 1, maxHeight: 320 },
  heroBubbleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  studentBubbleRow: {
    flexDirection: 'row-reverse', alignItems: 'flex-end',
  },
  bubble: { maxWidth: '82%', borderRadius: 18, padding: 12 },
  heroBubble: {
    backgroundColor: '#1B2B4B',
    borderBottomLeftRadius: 4,
  },
  introBubble: {
    backgroundColor: '#162240',
    borderWidth: 1,
    borderColor: 'rgba(196,154,26,0.3)',
  },
  studentBubble: {
    backgroundColor: '#C49A1A',
    borderBottomRightRadius: 4,
  },
  bubbleText: { color: 'white', fontSize: 14, lineHeight: 21 },
  introBubbleText: { color: 'rgba(255,255,255,0.9)' },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  inputRow: {
    flexDirection: 'row', gap: 8,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1, borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    borderRadius: 12, padding: 12,
    fontSize: 15, color: '#1B2B4B',
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  sendBtn: {
    backgroundColor: '#C49A1A',
    borderRadius: 12,
    width: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: '#E2E8F0' },
  sendBtnText: { color: 'white', fontSize: 22, fontWeight: '800' },
})
