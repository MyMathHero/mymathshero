import { useState, useEffect, useRef } from 'react'
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native'
import * as Speech from 'expo-speech'
import * as SecureStore from 'expo-secure-store'
import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import { File, Paths } from 'expo-file-system'
import api from '../lib/api'
import HeroRobot from './HeroRobot'

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
  const slideAnim = useRef(new Animated.Value(600)).current
  const scrollRef = useRef<ScrollView>(null)
  const playerRef = useRef<AudioPlayer | null>(null)

  // Open/close animation + fresh conversation each time the sheet opens.
  useEffect(() => {
    if (visible) {
      resetConversation()
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start()
      const t = setTimeout(() => { void playIntroduction() }, 600)
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

      // POST to the web proxy. Use api (axios) so our interceptors/base-URL apply.
      const res = await api.post(
        '/api/hero-voice',
        { text: clean },
        { responseType: 'arraybuffer' }
      )
      const buf: ArrayBuffer = res.data
      if (!buf || (buf as ArrayBuffer).byteLength === 0) {
        throw new Error('Empty audio response')
      }

      // Write the audio bytes to a cache file via the modern File API.
      const file = new File(Paths.cache, `hero-${Date.now()}.mp3`)
      try { file.create() } catch {}
      const writer = file.writableStream().getWriter()
      await writer.write(new Uint8Array(buf))
      await writer.close()

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

  function addHeroMessage(text: string, isIntro = false) {
    setMessages(prev => [...prev, { role: 'hero', text, isIntro }])
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
        studentName,
        grade,
        studentId,
      })
      const reply = res.data?.reply
        || "I'm thinking... what have you tried so far? 🤔"
      setRobotMood('happy')
      addHeroMessage(reply)
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
    await stopAllAudio()
    onClose()
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

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handle} />

        {/* Hero header */}
        <View style={s.header}>
          <View style={s.robotContainer}>
            <HeroRobot mood={robotMood} size={48} containerStyle="circle" />
            {speaking && <View style={s.speakingRing} />}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.heroName}>
              Ask <Text style={{ color: '#C49A1A' }}>Hero</Text> ✦
            </Text>
            <Text style={s.heroSub}>
              {loading ? '🤔 Hero is thinking...'
                : speaking ? '🔊 Hero is speaking...'
                : '🤖 Your AI Maths Tutor'}
            </Text>
          </View>

          <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

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
            <View
              key={i}
              style={msg.role === 'hero' ? s.heroBubbleRow : s.studentBubbleRow}
            >
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
