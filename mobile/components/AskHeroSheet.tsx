import { useState, useEffect, useRef } from 'react'
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import {
  createAudioPlayer, setAudioModeAsync, type AudioPlayer,
  useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync,
} from 'expo-audio'
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
  type LessonExample = { question: string; options: string[]; correctAnswer: string; hint?: string }
  const [lesson, setLesson] = useState<{ steps: any[]; manipulative?: string | null; example?: LessonExample } | null>(null)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [lessonError, setLessonError] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const lessonPlayingRef = useRef(false)
  // Practice phase: after the lesson, try a similar example before the real Q.
  const [phase, setPhase] = useState<'lesson' | 'practice' | 'result'>('lesson')
  const [practicePick, setPracticePick] = useState<string | null>(null)
  // Caption sync (item 4): reveal a Hero chat message in time with its audio.
  const [reveal, setReveal] = useState<{ index: number; chars: number }>({ index: -1, chars: 0 })
  const slideAnim = useRef(new Animated.Value(600)).current
  const scrollRef = useRef<ScrollView>(null)
  const playerRef = useRef<AudioPlayer | null>(null)
  // Voice input — talk to Hero (speech-to-speech, report #6).
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  // Voice-first Ask Hero: lead with a big mic, let the student switch to typing.
  const [typeMode, setTypeMode] = useState(false)

  // Open/close animation + fresh conversation each time the sheet opens.
  useEffect(() => {
    if (visible) {
      resetConversation()
      const startTab: 'teach' | 'ask' = question ? 'teach' : 'ask'
      setTab(startTab)
      setLesson(null); setLessonError(''); setStepIndex(0)
      setPhase('lesson'); setPracticePick(null)
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
      setPhase('lesson'); setPracticePick(null)
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
      // Lesson finished → invite the student to try a similar example.
      if (lessonPlayingRef.current && lsn.example) {
        setPhase('practice')
        await speakWithOpenAI(`Now you try one! ${lsn.example.question}`)
      }
    } catch {
      setLessonError("I had trouble connecting. Try again! 🤖")
      setRobotMood('waving')
    } finally {
      setLessonLoading(false)
    }
  }

  // Manually enter the practice example (the "Let me try one" button).
  function answerPracticeReady() {
    if (!lesson?.example) return
    setPracticePick(null); setPhase('practice')
    setRobotMood('waving')
    void speakWithOpenAI(`Now you try one! ${lesson.example.question}`)
  }

  // Student answers the practice example.
  async function answerPractice(opt: string) {
    if (practicePick != null || !lesson?.example) return
    lessonPlayingRef.current = false
    await stopAllAudio()
    setPracticePick(opt)
    const correct = opt === lesson.example.correctAnswer
    setPhase('result')
    setRobotMood(correct ? 'happy' : 'thinking')
    void speakWithOpenAI(
      correct
        ? "Brilliant! You've got it — now head back and answer your real question. 🎉"
        : `Good try! Let's look at how it's done, then you'll be ready for your question.`,
    )
  }

  // From a wrong answer, show the worked lesson again on the whiteboard.
  function reviewWorked() {
    setPhase('lesson'); setPracticePick(null)
    replayLesson()
  }

  // Play Hero's voice via the OpenAI TTS proxy at /api/hero-voice. NO expo-speech
  // fallback — if it's unavailable or plan-gated, Hero stays silent.
  // onProgress(fraction 0..1) lets a caller reveal caption text in time with the
  // audio (item 4). Optional — lesson narration doesn't use it.
  async function speakWithOpenAI(text: string, onProgress?: (frac: number) => void): Promise<void> {
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
        const sub = player.addListener('playbackStatusUpdate', (status: any) => {
          // Drive the caption reveal off real playback position.
          if (onProgress && status?.duration > 0) {
            onProgress(Math.min(1, (status.currentTime || 0) / status.duration))
          }
          if (status?.didJustFinish) {
            try { sub.remove() } catch {}
            onProgress && onProgress(1)
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
      // OpenAI TTS unavailable or plan-gated — stay silent (no device-voice fallback).
      console.log('OpenAI TTS unavailable:', err)
      setSpeaking(false)
    }
  }

  async function stopAllAudio() {
    setSpeaking(false)
    setReveal({ index: -1, chars: 0 }) // snap any partial caption to full
    if (playerRef.current) {
      try { playerRef.current.pause() } catch {}
      try { playerRef.current.release() } catch {}
      playerRef.current = null
    }
  }

  function addHeroMessage(text: string, isIntro = false, manipulative: string | null = null): number {
    let idx = -1
    setMessages(prev => { idx = prev.length; return [...prev, { role: 'hero', text, isIntro, manipulative }] })
    // Mirror into the API conversation as an assistant turn.
    setConversation(prev => [...prev, { role: 'assistant', content: text }])
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    return idx
  }

  // Speak a chat reply while revealing its bubble text in sync with the audio.
  async function speakReply(idx: number, text: string) {
    setReveal({ index: idx, chars: 0 })
    await speakWithOpenAI(text, (frac) => setReveal({ index: idx, chars: Math.ceil(text.length * frac) }))
    setReveal({ index: -1, chars: 0 }) // done → show full text
  }

  async function sendHeroMessage(explicitMsg?: string) {
    // explicitMsg lets voice input send a transcript directly (state is async).
    const userMsg = (typeof explicitMsg === 'string' ? explicitMsg : input).trim()
    if (!userMsg || loading || speaking) return
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
      const idx = addHeroMessage(reply, false, res.data?.manipulative || null)
      await speakReply(idx, reply)
    } catch {
      setRobotMood('happy')
      const fallback = 'Connection issue — try again! 🤖'
      addHeroMessage(fallback)
    } finally {
      setLoading(false)
    }
  }

  // Mic tap (speech-to-speech, report #6): tap to record, tap to stop →
  // transcribe (Whisper) → auto-send → Hero speaks the reply.
  async function handleMicTap() {
    if (loading || speaking) return
    if (voiceState === 'recording') {
      setVoiceState('transcribing')
      try {
        await audioRecorder.stop()
        const uri = audioRecorder.uri
        if (!uri) { setVoiceState('idle'); return }
        const token = await SecureStore.getItemAsync('auth_token')
        const studentId = (await SecureStore.getItemAsync('user_id')) || ''
        const form = new FormData()
        // React Native FormData file shape.
        form.append('audio', { uri, name: 'speech.m4a', type: 'audio/m4a' } as any)
        if (studentId) form.append('studentId', studentId)
        const res = await expoFetch(`${API_URL}/api/student/voice-transcribe`, {
          method: 'POST',
          headers: token ? { Cookie: `mymathshero_token=${token}`, Authorization: `Bearer ${token}` } : {},
          body: form as any,
        })
        setVoiceState('idle')
        if (res.status === 403) {
          addHeroMessage('Talking to me is a Premium feature 💎 You can still type your question!')
          return
        }
        if (!res.ok) return
        const data = await res.json()
        const text = (data.text || '').trim()
        if (text) sendHeroMessage(text)
      } catch {
        setVoiceState('idle')
      }
      return
    }
    // Start recording.
    if (speaking) await stopAllAudio()
    try {
      const perm = await requestRecordingPermissionsAsync()
      if (!perm.granted) return
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await audioRecorder.prepareToRecordAsync()
      audioRecorder.record()
      setVoiceState('recording')
    } catch {
      setVoiceState('idle')
    }
  }

  async function handleClose() {
    lessonPlayingRef.current = false
    if (voiceState === 'recording') { try { await audioRecorder.stop() } catch {} }
    setVoiceState('idle')
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
              <Text style={s.questionRefLabel}>📝 Your question</Text>
              <Text style={s.questionRefText} numberOfLines={3}>{question}</Text>
            </View>

            {phase === 'practice' && lesson?.example ? (
              /* Practice example — tap to answer */
              <ScrollView style={s.whiteboard} contentContainerStyle={{ padding: 18 }}>
                <Text style={s.wbHint}>✏️ Your turn — try this one:</Text>
                <Text style={[s.wbWrite, { marginBottom: 16 }]}>{lesson.example.question}</Text>
                {lesson.example.options.map((opt, i) => (
                  <TouchableOpacity key={i} onPress={() => answerPractice(opt)} style={s.exampleOpt}>
                    <Text style={s.exampleOptText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : phase === 'result' ? (
              /* Result */
              <ScrollView style={s.whiteboard} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 52 }}>{practicePick === lesson?.example?.correctAnswer ? '🎉' : '💪'}</Text>
                <Text style={[s.wbWrite, { textAlign: 'center', marginVertical: 8 }]}>
                  {practicePick === lesson?.example?.correctAnswer ? "You've got it!" : 'Good try — let’s review it'}
                </Text>
                <Text style={[s.wbSay, { textAlign: 'center' }]}>
                  {practicePick === lesson?.example?.correctAnswer
                    ? 'Now head back and answer your real question.'
                    : (lesson?.example?.hint || 'Watch the worked example, then go back and try your question.')}
                </Text>
                {practicePick !== lesson?.example?.correctAnswer && (
                  <TouchableOpacity onPress={reviewWorked} style={[s.lessonBtn, { marginTop: 16 }]}>
                    <Text style={s.lessonBtnText}>👀 Show me worked out</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleClose} style={s.backToQ}>
                  <Text style={s.backToQBtnText}>← Back to my question</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              /* Lesson whiteboard */
              <>
                <ScrollView style={s.whiteboard} contentContainerStyle={{ padding: 18 }}>
                  {lessonLoading && !lesson && (
                    <Text style={s.wbHint}>Hero is preparing your lesson… ✦✦✦</Text>
                  )}
                  {!!lessonError && <Text style={s.wbError}>{lessonError}</Text>}
                  {!lessonLoading && !lessonError && lesson && (
                    <Text style={s.wbHint}>📘 Here’s a similar example (not your question):</Text>
                  )}
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
                    {lesson.example && (
                      <TouchableOpacity onPress={() => { lessonPlayingRef.current = false; void stopAllAudio().then(() => answerPracticeReady()) }} style={[s.lessonBtn, { backgroundColor: '#C49A1A' }]}>
                        <Text style={[s.lessonBtnText, { color: '#1B2B4B' }]}>Let me try one →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {lesson && (
                  <TouchableOpacity onPress={handleClose} style={{ alignSelf: 'center', paddingVertical: 8 }}>
                    <Text style={s.backToQText}>← Back to my question</Text>
                  </TouchableOpacity>
                )}
              </>
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
                    {/* Reveal in sync with the voice while this message is spoken. */}
                    {msg.role === 'hero' && reveal.index === i
                      ? (msg.text.slice(0, reveal.chars) || '…')
                      : msg.text}
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
          {tab === 'ask' && !typeMode ? (
            // VOICE-FIRST: big centered round mic + "type instead" link.
            <View style={s.voiceFirst}>
              <TouchableOpacity
                style={[s.bigMic, voiceState === 'recording' && s.micBtnRecording]}
                onPress={handleMicTap}
                disabled={loading || speaking || voiceState === 'transcribing'}
              >
                <Text style={s.bigMicText}>
                  {voiceState === 'transcribing' ? '…' : voiceState === 'recording' ? '⏺' : '🎤'}
                </Text>
              </TouchableOpacity>
              <Text style={s.voiceHint}>
                {voiceState === 'recording' ? 'Listening… tap to send'
                  : voiceState === 'transcribing' ? 'Got it — thinking…'
                  : 'Tap to talk to Hero'}
              </Text>
              <TouchableOpacity onPress={() => setTypeMode(true)} disabled={loading}>
                <Text style={s.switchLink}>⌨️ Type instead</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <View style={s.inputRow}>
            {/* Mic / back-to-voice (talk to Hero, speech-to-speech). */}
            <TouchableOpacity
              style={[s.micBtn, voiceState === 'recording' && s.micBtnRecording]}
              onPress={tab === 'ask' ? () => setTypeMode(false) : handleMicTap}
              disabled={loading || speaking || voiceState === 'transcribing'}
            >
              <Text style={s.micBtnText}>
                {voiceState === 'transcribing' ? '…' : voiceState === 'recording' ? '⏺' : '🎤'}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={s.input}
              placeholder={voiceState === 'recording' ? 'Listening… tap ⏺ to send' : 'Ask Hero anything about Maths...'}
              placeholderTextColor="#94A3B8"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendHeroMessage()}
              editable={!loading && !speaking && voiceState === 'idle'}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || loading || speaking) && s.sendBtnOff]}
              onPress={() => sendHeroMessage()}
              disabled={!input.trim() || loading || speaking}
            >
              <Text style={s.sendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
          )}
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
  whiteboard: { flex: 1, backgroundColor: '#10243F' },
  wbHint: { color: '#9DB4D4', fontSize: 17 },
  wbError: { color: '#FCA5A5', fontSize: 16 },
  wbSay: { color: '#EAF2FF', fontSize: 18, lineHeight: 25, marginBottom: 6 },
  wbWrite: { color: '#BFD8FF', fontSize: 22, fontWeight: '600' },
  wbResult: { color: '#5EE6A8', fontSize: 26, fontWeight: '800', backgroundColor: 'rgba(94,230,168,0.14)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  lessonControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', padding: 14, borderTopWidth: 1, borderColor: '#E2E8F0' },
  lessonBtn: { backgroundColor: '#1B2B4B', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  lessonBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },
  lessonStep: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  exampleOpt: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: '#C49A1A', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 14, marginBottom: 10, alignItems: 'center' },
  exampleOptText: { color: '#EAF2FF', fontSize: 20, fontWeight: '800' },
  backToQ: { backgroundColor: '#C49A1A', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginTop: 18 },
  backToQBtnText: { color: '#1B2B4B', fontWeight: '800', fontSize: 15 },
  backToQText: { color: '#C49A1A', fontWeight: '800', fontSize: 14 },
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
  micBtn: { backgroundColor: '#1B2B4B', borderRadius: 12, width: 48, alignItems: 'center', justifyContent: 'center' },
  micBtnRecording: { backgroundColor: '#EF4444' },
  micBtnText: { fontSize: 20 },
  // Voice-first Ask Hero
  voiceFirst: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  bigMic: { backgroundColor: '#C49A1A', width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', shadowColor: '#C49A1A', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  bigMicText: { fontSize: 34 },
  voiceHint: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  switchLink: { color: '#C49A1A', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
})
