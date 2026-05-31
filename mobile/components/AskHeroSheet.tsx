import { useState, useEffect, useRef } from 'react'
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native'
import * as Speech from 'expo-speech'
import * as SecureStore from 'expo-secure-store'
import { studentAPI } from '../lib/api'

interface Props {
  visible: boolean
  onClose: () => void
  question: string
  skillId: string
  questionId: string
}

type ChatMessage = { role: 'hero' | 'student'; text: string }

// AskHeroSheet uses expo-speech for on-device TTS. We deliberately don't try to
// stream audio from the web /api/hero-voice endpoint here: native React Native
// can't decode an ArrayBuffer audio response without expo-av (deprecated in
// SDK 56) or extra base64 polyfills. expo-speech is the simplest SDK-clean path
// and works offline too.

export default function AskHeroSheet({
  visible, onClose, question, skillId, questionId,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const slideAnim = useRef(new Animated.Value(300)).current
  const scrollRef = useRef<ScrollView>(null)
  // Track whether we've already kicked off the initial hint for this opening.
  const initialisedRef = useRef(false)

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start()
      if (!initialisedRef.current) {
        initialisedRef.current = true
        setMessages([])
        fetchHint()
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: 300, duration: 200,
        useNativeDriver: true,
      }).start()
      stopAudio()
      initialisedRef.current = false
    }
    return () => { stopAudio() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  async function fetchHint() {
    setLoading(true)
    try {
      const studentId = await SecureStore.getItemAsync('user_id')
      const res = await studentAPI.hint({
        studentId,
        skillId,
        questionId,
        question,
        attemptNumber: 1,
        behaviour: 'confused',
      })
      const hint = res.data?.hint || "Let me help you think through this step by step!"
      addHeroMessage(hint)
      speakText(hint)
    } catch {
      const fallback = "Let me help you think through this step by step! Try breaking the problem into smaller parts."
      addHeroMessage(fallback)
      speakText(fallback)
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'student', text: userMsg }])
    scrollToEnd()
    setLoading(true)

    try {
      const studentId = await SecureStore.getItemAsync('user_id')
      const res = await studentAPI.hint({
        studentId, skillId, questionId,
        question: `Student asked: "${userMsg}". Original: "${question}"`,
        attemptNumber: 2,
        behaviour: 'confused',
      })
      const reply = res.data?.hint || "Great question! Try thinking about what you already know."
      addHeroMessage(reply)
      speakText(reply)
    } catch {
      const fallback = "Great question! Try thinking step by step."
      addHeroMessage(fallback)
      speakText(fallback)
    } finally {
      setLoading(false)
    }
  }

  function addHeroMessage(text: string) {
    setMessages(prev => [...prev, { role: 'hero', text }])
    scrollToEnd()
  }

  function scrollToEnd() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  function speakText(text: string) {
    try {
      Speech.stop()
      const clean = text.replace(/[✦🤖🎯💪🎉😅🔥⚡🏆👋]/g, '').trim()
      if (!clean) return
      setSpeaking(true)
      Speech.speak(clean, {
        rate: 0.95,
        pitch: 1.05,
        language: 'en-AU',
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      })
    } catch {
      setSpeaking(false)
    }
  }

  function stopAudio() {
    try { Speech.stop() } catch {}
    setSpeaking(false)
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={s.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handle} />

        {/* Header */}
        <View style={s.sheetHeader}>
          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarText}>🤖</Text>
            {speaking && <View style={s.speakingDot} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetTitle}>
              Ask <Text style={{ color: '#C49A1A' }}>Hero</Text> ✦
            </Text>
            <Text style={s.sheetSub}>
              {speaking ? '🔊 Speaking...' : 'Your AI Maths Tutor'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { stopAudio(); onClose() }}
            style={s.closeBtn}
          >
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Current question */}
        <View style={s.questionBox}>
          <Text style={s.questionLabel}>Current question:</Text>
          <Text style={s.questionText} numberOfLines={3}>
            {question}
          </Text>
        </View>

        {/* Chat */}
        <ScrollView
          ref={scrollRef}
          style={s.chat}
          contentContainerStyle={{ padding: 16, gap: 10 }}
        >
          {messages.map((msg, i) => (
            <View key={i} style={[
              s.bubbleRow,
              msg.role === 'hero' ? s.heroBubbleRow : s.studentBubbleRow,
            ]}>
              {msg.role === 'hero' && <Text style={s.bubbleIcon}>🤖</Text>}
              <Text style={[
                s.bubbleText,
                msg.role === 'student' && s.studentBubbleText,
              ]}>
                {msg.text}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={[s.bubbleRow, s.heroBubbleRow]}>
              <Text style={s.bubbleIcon}>🤖</Text>
              <View style={[s.bubbleText, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <ActivityIndicator color="#C49A1A" size="small" />
                <Text style={{ color: '#C49A1A', fontSize: 14 }}>Hero is thinking...</Text>
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
              style={s.chatInput}
              placeholder="Ask Hero anything..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              placeholderTextColor="#94A3B8"
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || loading}
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
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 3, borderColor: '#C49A1A',
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 16, backgroundColor: '#1B2B4B',
    marginTop: 4,
  },
  heroAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#C49A1A',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  heroAvatarText: { fontSize: 22 },
  speakingDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#1B2B4B',
  },
  sheetTitle: { color: 'white', fontWeight: '800', fontSize: 16 },
  sheetSub: { color: '#94A3B8', fontSize: 12 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: 'white', fontSize: 16 },
  questionBox: {
    backgroundColor: '#F0F4F8', padding: 14,
    borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  questionLabel: { fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: '600' },
  questionText: { fontSize: 14, fontWeight: '700', color: '#1B2B4B' },
  chat: { flex: 1, maxHeight: 280 },
  bubbleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, maxWidth: '88%',
  },
  heroBubbleRow: { alignSelf: 'flex-start' },
  studentBubbleRow: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleIcon: { fontSize: 18, marginTop: 2 },
  bubbleText: {
    backgroundColor: '#1B2B4B', color: 'white',
    padding: 12, borderRadius: 16, fontSize: 14,
    lineHeight: 20, flexShrink: 1,
  },
  studentBubbleText: { backgroundColor: '#C49A1A' },
  inputRow: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderTopWidth: 1, borderColor: '#E2E8F0',
  },
  chatInput: {
    flex: 1, backgroundColor: '#F0F4F8', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#1B2B4B',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  sendBtn: {
    backgroundColor: '#C49A1A', borderRadius: 12,
    width: 44, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E2E8F0' },
  sendBtnText: { color: 'white', fontSize: 20, fontWeight: '800' },
})
