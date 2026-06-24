import { useState } from 'react'
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import api from '../lib/api'

// Pre-launch review survey (feedback report #8), mobile. Mirrors the web one:
// student or parent variant, a 1–4 rating choice + open text, posted to
// /api/feedback as type 'review'.

type Variant = 'student' | 'parent'

const VARIANTS: Record<Variant, { title: string; q1: string; choices: string[]; q2: string; placeholder: string }> = {
  student: {
    title: 'Quick question! 😊',
    q1: 'How much did you enjoy using MyMathsHero?',
    choices: ['😞 Didn’t like it', '😐 It was okay', '🙂 Liked it', '🤩 Loved it!'],
    q2: 'What was your favourite part, or what was confusing?',
    placeholder: 'Type anything you want to tell us…',
  },
  parent: {
    title: 'How is it going?',
    q1: 'Did your child seem more confident or motivated to practise maths?',
    choices: ['No', 'A little', 'Yes', 'Definitely'],
    q2: 'What did you like most, and what should we improve before launch?',
    placeholder: 'Your thoughts help us a lot…',
  },
}

export default function ReviewSurvey({ visible, variant = 'student', userId, onClose }: {
  visible: boolean; variant?: Variant; userId?: string | null; onClose: () => void
}) {
  const v = VARIANTS[variant]
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!rating || submitting) return
    setSubmitting(true)
    try {
      await api.post('/api/feedback', {
        userId, role: variant, type: 'review', rating,
        message: text.trim() || null,
        context: { survey: variant, choice: v.choices[rating - 1] },
        platform: 'mobile',
      })
    } catch { /* never block */ }
    finally {
      setDone(true); setSubmitting(false)
      setTimeout(() => { onClose(); setDone(false); setRating(0); setText('') }, 1200)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ fontSize: 40 }}>🙏</Text>
              <Text style={s.title}>Thank you!</Text>
              <Text style={s.sub}>Your feedback helps us build a better MyMathsHero.</Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={s.title}>{v.title}</Text>
                <TouchableOpacity onPress={onClose}><Text style={s.close}>×</Text></TouchableOpacity>
              </View>
              <Text style={s.q}>{v.q1}</Text>
              {v.choices.map((c, i) => {
                const val = i + 1, active = rating === val
                return (
                  <TouchableOpacity key={c} onPress={() => setRating(val)} style={[s.choice, active && s.choiceActive]}>
                    <Text style={s.choiceText}>{c}</Text>
                  </TouchableOpacity>
                )
              })}
              <Text style={s.q}>{v.q2}</Text>
              <TextInput
                value={text} onChangeText={setText} multiline maxLength={2000}
                placeholder={v.placeholder} placeholderTextColor="#94A3B8" style={s.input}
              />
              <TouchableOpacity onPress={submit} disabled={!rating || submitting} style={[s.send, !rating && s.sendOff]}>
                <Text style={s.sendText}>{submitting ? 'Sending…' : 'Send feedback'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const NAVY = '#1B2B4B', GOLD = '#C49A1A'
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 420, padding: 22 },
  title: { color: NAVY, fontWeight: '800', fontSize: 18 },
  sub: { color: '#64748B', fontSize: 14, marginTop: 4, textAlign: 'center' },
  close: { fontSize: 24, color: '#94A3B8', lineHeight: 24 },
  q: { color: NAVY, fontSize: 14, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  choice: { borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, padding: 11, marginBottom: 8 },
  choiceActive: { borderColor: GOLD, backgroundColor: '#FFFBEB' },
  choiceText: { color: NAVY, fontSize: 15, fontWeight: '700' },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, fontSize: 14, color: NAVY, minHeight: 64, textAlignVertical: 'top' },
  send: { marginTop: 14, backgroundColor: GOLD, borderRadius: 12, padding: 13, alignItems: 'center' },
  sendOff: { backgroundColor: '#E2E8F0' },
  sendText: { color: 'white', fontWeight: '800', fontSize: 15 },
})
