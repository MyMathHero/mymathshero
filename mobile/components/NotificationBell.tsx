import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native'
import api from '../lib/api'

const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'

function timeAgo(d: any) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Bell + unread badge + slide-up feed for parents. Polls /api/notifications.
// onOpenLink('support') lets the host open the SupportSheet on tap.
export default function NotificationBell({ onOpenLink }: { onOpenLink?: (link: string) => void }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications')
      setItems(Array.isArray(res.data?.notifications) ? res.data.notifications : [])
      setUnread(res.data?.unreadCount || 0)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  async function openFeed() {
    setOpen(true); setLoading(true)
    await load(); setLoading(false)
  }

  async function markAllRead() {
    setUnread(0); setItems(prev => prev.map(n => ({ ...n, read: true })))
    try { await api.post('/api/notifications', { action: 'readAll' }) } catch {}
  }

  async function tapItem(n: any) {
    if (!n.read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(u => Math.max(0, u - 1))
      try { await api.post('/api/notifications', { action: 'read', id: n.id }) } catch {}
    }
    if (n.link && onOpenLink) { setOpen(false); onOpenLink(n.link) }
  }

  return (
    <>
      <TouchableOpacity onPress={openFeed} style={s.bellBtn}>
        <Text style={{ fontSize: 18 }}>🔔</Text>
        {unread > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.header}>
              <Text style={s.headerTitle}>🔔 Notifications</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {unread > 0 && (
                  <TouchableOpacity onPress={markAllRead}><Text style={s.markRead}>Mark all read</Text></TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}><Text style={s.closeText}>✕</Text></TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
              {loading ? <ActivityIndicator color={GOLD} style={{ marginTop: 24 }} />
                : items.length === 0 ? <Text style={s.empty}>You&apos;re all caught up 🎉</Text>
                : items.map((n, i) => (
                  <TouchableOpacity key={n.id || i} onPress={() => tapItem(n)}
                    style={[s.row, !n.read && s.rowUnread]}>
                    <Text style={{ fontSize: 20 }}>{n.icon || '🔔'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{n.title}</Text>
                      {!!n.body && <Text style={s.rowBody}>{n.body}</Text>}
                      <Text style={s.rowTime}>{timeAgo(n.createdAt)}</Text>
                    </View>
                    {!n.read && <View style={s.dot} />}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

const s = StyleSheet.create({
  bellBtn: { width: 38, height: 38, borderRadius: 20, backgroundColor: 'rgba(196,154,26,0.15)', borderWidth: 1, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 999, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 22, borderTopRightRadius: 22, height: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: NAVY, padding: 14, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  headerTitle: { color: 'white', fontWeight: '800', fontSize: 16 },
  markRead: { color: GOLD, fontWeight: '700', fontSize: 12 },
  closeBtn: { width: 30, height: 30, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: 'white', fontSize: 15 },
  empty: { textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 28 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#F8FAFC' },
  rowUnread: { backgroundColor: 'rgba(196,154,26,0.1)' },
  rowTitle: { fontWeight: '700', color: NAVY, fontSize: 14 },
  rowBody: { color: '#64748B', fontSize: 13, marginTop: 2, lineHeight: 18 },
  rowTime: { color: '#94A3B8', fontSize: 11, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: GOLD, marginTop: 5 },
})
