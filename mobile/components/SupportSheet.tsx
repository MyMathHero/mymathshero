import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import api from '../lib/api'

const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'
const CATEGORIES: { value: string; label: string }[] = [
  { value: 'billing', label: '💳 Billing' },
  { value: 'technical', label: '🛠️ Technical' },
  { value: 'learning', label: '📚 Learning' },
  { value: 'account', label: '👤 Account' },
  { value: 'other', label: '💬 Other' },
]
const STATUS_COLOR: Record<string, string> = {
  open: '#2563EB', in_progress: GOLD, resolved: '#22C55E', closed: '#94A3B8',
}
const fmt = (d: any) => d ? new Date(d).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : ''

interface Props { visible: boolean; onClose: () => void }
type View_ = 'list' | 'new' | 'thread'

// Threaded support tickets for a logged-in parent/student. Calls the same
// /api/support the web uses; auth rides on the api client's Bearer/cookie.
export default function SupportSheet({ visible, onClose }: Props) {
  const [view, setView] = useState<View_>('list')
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<any | null>(null)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('technical')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/support')
      setTickets(Array.isArray(res.data?.tickets) ? res.data.tickets : [])
    } catch { setTickets([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (visible) { setView('list'); setError(''); loadList() }
  }, [visible, loadList])

  async function openThread(id: string) {
    setView('thread'); setActive({ id, loading: true }); setReply('')
    try {
      const res = await api.get(`/api/support?id=${encodeURIComponent(id)}`)
      setActive(res.data?.ticket || null)
    } catch { setError('Could not load ticket'); setView('list') }
  }

  async function createTicket() {
    if (!subject.trim() || !message.trim()) { setError('Add a subject and a message.'); return }
    setBusy(true); setError('')
    try {
      await api.post('/api/support', { subject: subject.trim(), category, message: message.trim() })
      setSubject(''); setMessage(''); setCategory('technical')
      await loadList(); setView('list')
    } catch { setError('Could not create ticket') } finally { setBusy(false) }
  }

  async function sendReply() {
    if (!reply.trim() || !active?.id) return
    setBusy(true)
    try {
      await api.post(`/api/support?id=${encodeURIComponent(active.id)}`, { message: reply.trim() })
      setReply(''); await openThread(active.id); loadList()
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  if (!visible) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            {view !== 'list' ? (
              <TouchableOpacity onPress={() => { setView('list'); setError('') }} style={s.iconBtn}>
                <Text style={s.iconBtnText}>←</Text>
              </TouchableOpacity>
            ) : <View style={{ width: 32 }} />}
            <Text style={s.headerTitle}>
              🎫 {view === 'new' ? 'New ticket' : view === 'thread' ? 'Ticket' : 'Help & Support'}
            </Text>
            <TouchableOpacity onPress={onClose} style={s.iconBtn}><Text style={s.iconBtnText}>✕</Text></TouchableOpacity>
          </View>

          {!!error && <Text style={s.error}>{error}</Text>}

          {/* LIST */}
          {view === 'list' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
              <TouchableOpacity onPress={() => { setView('new'); setError('') }} style={s.primaryBtn}>
                <Text style={s.primaryBtnText}>+ New support ticket</Text>
              </TouchableOpacity>
              {loading ? <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} />
                : tickets.length === 0 ? <Text style={s.empty}>No tickets yet. Need help? Open one above.</Text>
                : tickets.map(t => (
                  <TouchableOpacity key={t.id} onPress={() => openThread(t.id)} style={s.row}>
                    <View style={[s.dot, { backgroundColor: STATUS_COLOR[t.status] || '#94A3B8' }]} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {t.unreadForUser && <Text style={s.newBadge}>NEW</Text>}
                        <Text style={s.rowTitle} numberOfLines={1}>{t.subject}</Text>
                      </View>
                      <Text style={s.rowMeta}>{(t.status || '').replace('_', ' ')} · {fmt(t.updatedAt)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          )}

          {/* NEW */}
          {view === 'new' && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
                <Text style={s.label}>What's it about?</Text>
                <View style={s.chips}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity key={c.value} onPress={() => setCategory(c.value)}
                      style={[s.chip, category === c.value && s.chipOn]}>
                      <Text style={[s.chipText, category === c.value && s.chipTextOn]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.label}>Subject</Text>
                <TextInput value={subject} onChangeText={setSubject} maxLength={140} placeholder="Short summary"
                  placeholderTextColor="#94A3B8" style={s.input} />
                <Text style={s.label}>Message</Text>
                <TextInput value={message} onChangeText={setMessage} maxLength={4000} multiline numberOfLines={5}
                  placeholder="Tell us what's happening…" placeholderTextColor="#94A3B8"
                  style={[s.input, { height: 120, textAlignVertical: 'top' }]} />
                <TouchableOpacity onPress={createTicket} disabled={busy} style={[s.submitBtn, busy && { opacity: 0.6 }]}>
                  <Text style={s.submitBtnText}>{busy ? 'Sending…' : 'Submit ticket'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* THREAD */}
          {view === 'thread' && active && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} contentContainerStyle={{ padding: 14, gap: 10 }}>
                {active.loading ? <ActivityIndicator color={GOLD} /> : (
                  <>
                    <Text style={s.threadMeta}>
                      <Text style={{ fontWeight: '800', color: NAVY }}>{active.subject}</Text>
                      {'  ·  '}{(active.status || '').replace('_', ' ')}
                    </Text>
                    {(active.messages || []).map((m: any, i: number) => (
                      <View key={i} style={{ alignItems: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                        <View style={[s.bubble, { backgroundColor: m.from === 'user' ? GOLD : NAVY }]}>
                          <Text style={s.bubbleMeta}>{m.from === 'user' ? 'You' : (m.authorName || 'Support')} · {fmt(m.createdAt)}</Text>
                          <Text style={s.bubbleText}>{m.body}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
              {!active.loading && active.status !== 'closed' && (
                <View style={s.replyRow}>
                  <TextInput value={reply} onChangeText={setReply} placeholder="Reply…" placeholderTextColor="#94A3B8" style={[s.input, { flex: 1 }]} />
                  <TouchableOpacity onPress={sendReply} disabled={busy || !reply.trim()}
                    style={[s.sendBtn, (!reply.trim() || busy) && { backgroundColor: '#E2E8F0' }]}>
                    <Text style={s.sendBtnText}>→</Text>
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 22, borderTopRightRadius: 22, height: '90%', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: NAVY, padding: 14 },
  headerTitle: { color: 'white', fontWeight: '800', fontSize: 16 },
  iconBtn: { width: 32, height: 32, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: 'white', fontSize: 16 },
  error: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: 13, padding: 10 },
  primaryBtn: { backgroundColor: GOLD, borderRadius: 12, padding: 13, alignItems: 'center', marginBottom: 14 },
  primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginBottom: 8 },
  dot: { width: 9, height: 9, borderRadius: 999 },
  rowTitle: { fontWeight: '700', color: NAVY, flexShrink: 1 },
  rowMeta: { fontSize: 12, color: '#64748B', marginTop: 2, textTransform: 'capitalize' },
  newBadge: { backgroundColor: '#EF4444', color: 'white', fontSize: 10, fontWeight: '700', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  label: { fontSize: 13, fontWeight: '700', color: NAVY },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  chipTextOn: { color: 'white' },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 14, color: NAVY },
  submitBtn: { backgroundColor: NAVY, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  threadMeta: { fontSize: 12, color: '#64748B' },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 14 },
  bubbleMeta: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 3 },
  bubbleText: { color: 'white', fontSize: 14, lineHeight: 20 },
  replyRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: '#E2E8F0', paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  sendBtn: { backgroundColor: GOLD, borderRadius: 10, width: 48, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: 'white', fontSize: 22, fontWeight: '800' },
})
