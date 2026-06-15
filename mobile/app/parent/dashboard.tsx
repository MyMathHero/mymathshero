import { useState, useEffect, useCallback, useMemo} from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { parentAPI } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import CharacterAvatar from '../../components/CharacterAvatar'
import { isCharacterId } from '../../lib/characterAvatars'

export default function ParentDashboard() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const [parentId, setParentId] = useState('')
  const [parentName, setParentName] = useState('')
  const [children, setChildren] = useState<any[]>([])
  const [activeChild, setActiveChild] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [insight, setInsight] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadParent() }, [])

  useEffect(() => {
    if (activeChild?.id && parentId) loadChildData(activeChild.id)
  }, [activeChild?.id, parentId])

  async function loadParent() {
    try {
      const id = await SecureStore.getItemAsync('user_id')
      const name = (await SecureStore.getItemAsync('user_name')) || 'Parent'
      if (!id) {
        router.replace('/login')
        return
      }
      setParentId(id)
      setParentName(name)

      const res = await parentAPI.children(id)
      const kids = res?.data?.children || []
      setChildren(kids)
      if (kids.length > 0) setActiveChild(kids[0])
      else setLoading(false)
    } catch (err) {
      // Network failure — don't kick the user back to login just because
      // the API hiccupped. Only redirect if there's no auth at all.
      console.error('Parent dashboard load error:', err)
      try {
        const token = await SecureStore.getItemAsync('auth_token')
        if (!token) {
          router.replace('/login')
          return
        }
      } catch {}
      setLoading(false)
    }
  }

  async function loadChildData(studentId: string) {
    setLoading(true)
    try {
      const [progRes, insRes] = await Promise.all([
        parentAPI.progress(studentId, parentId),
        parentAPI.insights(studentId, parentId).catch(() => null),
      ])
      setProgress(progRes.data)
      setInsight(insRes?.data?.insight || '')
    } catch {
      // leave previous data on transient failure
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (activeChild?.id) loadChildData(activeChild.id)
    else setRefreshing(false)
  }, [activeChild?.id, parentId])

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        await SecureStore.deleteItemAsync('auth_token')
        await SecureStore.deleteItemAsync('user_role')
        await SecureStore.deleteItemAsync('user_id')
        await SecureStore.deleteItemAsync('user_name')
        router.replace('/login')
      }}
    ])
  }

  const student = progress?.student
  const stats = progress?.stats || {}
  const skillTree = progress?.skillTree || []
  const mathsSkills = skillTree.filter(
    (s: any) => s.subject === 'Maths' || s.subject === 'Mathematics'
  )
  const totalWeek = (progress?.weeklyActivity || [])
    .reduce((a: number, d: any) => a + d.questions, 0)

  function heatColor(score: number) {
    if (score >= 80) return '#22C55E'
    if (score >= 50) return '#C49A1A'
    return '#CBD5E1'
  }

  if (loading && !progress) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>
          MyMaths<Text style={{ color: '#C49A1A' }}>Hero</Text>
        </Text>
        <ActivityIndicator color="#C49A1A" size="large" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Loading Parent Hub...</Text>
      </View>
    )
  }

  const statTiles = [
    { label: 'Questions', value: stats.totalQuestionsThisWeek ?? totalWeek, emoji: '📝', color: '#2563EB' },
    { label: 'Accuracy',  value: `${stats.accuracy || 0}%`,                emoji: '🎯', color: '#22C55E' },
    { label: 'Mastered',  value: stats.mastered || 0,                     emoji: '🏆', color: '#C49A1A' },
    { label: 'Sessions',  value: student?.sessions_completed || 0,        emoji: '📚', color: '#8B5CF6' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.eyebrow}>PARENT HUB</Text>
            <Text style={styles.welcome}>Welcome back</Text>
            {parentName ? <Text style={styles.welcomeSub}>{parentName}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push('/parent/account')}
              style={{
                backgroundColor: 'rgba(196,154,26,0.15)',
                borderWidth: 1, borderColor: '#C49A1A',
                borderRadius: 20, paddingHorizontal: 14,
                paddingVertical: 7,
                flexDirection: 'row', alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 16 }}>👤</Text>
              <Text style={{ color: '#C49A1A', fontWeight: '700',
                fontSize: 13 }}>
                Account
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Child card */}
        {activeChild && (
          <View style={styles.activeChildCard}>
            {isCharacterId(activeChild.avatar) ? (
              <CharacterAvatar id={activeChild.avatar} size={48} />
            ) : (
              <View style={styles.activeChildAvatar}>
                <Text style={{ fontSize: 24 }}>{activeChild.avatar || '🧒'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.activeChildName}>{activeChild.name}</Text>
              <Text style={styles.activeChildMeta}>
                Grade {activeChild.grade} · Maths
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.activeChildStreak}>
                🔥 {student?.streak ?? activeChild?.streak ?? 0}
              </Text>
              <Text style={styles.activeChildStreakLabel}>streak</Text>
            </View>
          </View>
        )}
      </View>

      {/* Child selector (only shown when more than one) */}
      {children.length > 1 && (
        <View style={styles.childRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
            {children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childChip, activeChild?.id === c.id && styles.childChipActive]}
                onPress={() => setActiveChild(c)}
              >
                {isCharacterId(c.avatar)
                  ? <CharacterAvatar id={c.avatar} size={28} />
                  : <Text style={styles.childEmoji}>{c.avatar || '🦊'}</Text>}
                <View>
                  <Text style={[styles.childName, activeChild?.id === c.id && { color: 'white' }]}>{c.name}</Text>
                  <Text style={[styles.childGrade, activeChild?.id === c.id && { color: 'rgba(255,255,255,0.8)' }]}>Grade {c.grade}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {children.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>👨‍👩‍👧</Text>
          <Text style={styles.emptyText}>No children added yet.</Text>
          <Text style={styles.emptySub}>
            Add a child from your account on mymathshero.com.au to get started.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C49A1A" />}
        >
          {/* Stats tiles */}
          <View style={styles.statsGrid}>
            {statTiles.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* AI Insight */}
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={{ fontSize: 20 }}>🤖</Text>
              <Text style={styles.insightTitle}>Hero&apos;s Daily Insight</Text>
            </View>
            <Text style={styles.insightText}>
              {insight || `${student?.name || 'Your child'} is making great progress! Keep encouraging daily practice.`}
            </Text>
          </View>

          {/* Maths Skills Overview */}
          {mathsSkills.length > 0 && (
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>📊 Maths Skills Overview</Text>
              {mathsSkills.slice(0, 6).map((skill: any) => {
                const score = Math.round(skill.score || 0)
                const color = heatColor(score)
                return (
                  <View key={skill.id} style={{ marginBottom: 12 }}>
                    <View style={styles.skillHeaderRow}>
                      <Text style={styles.skillNameText} numberOfLines={1}>
                        {skill.name || skill.skillId}
                      </Text>
                      <Text style={[styles.skillScoreText, { color }]}>
                        {score}/100
                      </Text>
                    </View>
                    <View style={styles.skillBarOuter}>
                      <View style={[styles.skillBarInner, {
                        width: `${score}%` as any,
                        backgroundColor: color,
                      }]} />
                    </View>
                  </View>
                )
              })}
              <View style={styles.legendRow}>
                {[
                  { color: '#22C55E', label: 'Mastered' },
                  { color: '#C49A1A', label: 'Progressing' },
                  { color: '#CBD5E1', label: 'Needs work' },
                ].map((l, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={styles.legendLabel}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Hero Report */}
          <View style={styles.cardSection}>
            <Text style={styles.cardSectionTitle}>📧 Hero Report</Text>
            <Text style={styles.cardBody}>
              Weekly progress reports are sent to your email
              automatically every Sunday.
            </Text>
            <Text style={styles.cardFooter}>
              For detailed analytics visit mymathshero.com.au
            </Text>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  loading: { flex: 1, backgroundColor: c.bgHeader,
    alignItems: 'center', justifyContent: 'center' },
  loadingLogo: { fontSize: 32, fontWeight: '800', color: 'white' },
  loadingText: { color: c.accentGold, marginTop: 12, fontWeight: '600' },

  header: { backgroundColor: c.bgHeader, padding: 20, paddingBottom: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start' },
  eyebrow: { color: 'rgba(255,255,255,0.6)', fontSize: 11,
    fontWeight: '700', letterSpacing: 1 },
  welcome: { color: 'white', fontWeight: '800', fontSize: 22, marginTop: 2 },
  welcomeSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  logoutBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  logoutText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  activeChildCard: { backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, padding: 14, marginTop: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(196,154,26,0.3)' },
  activeChildAvatar: { width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#C49A1A', alignItems: 'center', justifyContent: 'center' },
  activeChildName: { color: 'white', fontWeight: '800', fontSize: 16 },
  activeChildMeta: { color: c.accentGold, fontSize: 12, fontWeight: '600' },
  activeChildStreak: { color: 'white', fontWeight: '800', fontSize: 15 },
  activeChildStreakLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },

  childRow: { backgroundColor: c.bgHeader, paddingBottom: 12 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'transparent' },
  childChipActive: { borderColor: '#C49A1A', backgroundColor: 'rgba(196,154,26,0.25)' },
  childEmoji: { fontSize: 22 },
  childName: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  childGrade: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },

  scroll: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 17, fontWeight: '700', color: c.textPrimary, marginTop: 12 },
  emptySub: { fontSize: 13, color: c.textSecondary, textAlign: 'center', marginTop: 6 },

  statsGrid: { flexDirection: 'row', gap: 10, padding: 16 },
  statCard: { flex: 1, backgroundColor: c.bgCard, borderRadius: 12,
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 10, color: c.textMuted, marginTop: 2, textAlign: 'center' },

  insightCard: { backgroundColor: c.bgHeader, borderRadius: 16, padding: 18,
    marginHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#C49A1A' },
  insightHeader: { flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10 },
  insightTitle: { color: c.accentGold, fontWeight: '800', fontSize: 14 },
  insightText: { color: 'white', fontSize: 14, lineHeight: 22 },

  cardSection: { backgroundColor: c.bgCard, borderRadius: 16, padding: 18,
    marginHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardSectionTitle: { fontSize: 16, fontWeight: '800',
    color: c.textPrimary, marginBottom: 16 },
  cardBody: { fontSize: 13, color: c.textSecondary, lineHeight: 20, marginBottom: 12 },
  cardFooter: { fontSize: 12, color: c.accentGold, fontWeight: '600' },

  skillHeaderRow: { flexDirection: 'row',
    justifyContent: 'space-between', marginBottom: 4 },
  skillNameText: { fontSize: 13, fontWeight: '600', color: c.textPrimary, flex: 1 },
  skillScoreText: { fontSize: 12, fontWeight: '800', marginLeft: 8 },
  skillBarOuter: { height: 8, backgroundColor: c.bgPrimary,
    borderRadius: 4, overflow: 'hidden' },
  skillBarInner: { height: '100%', borderRadius: 4 },

  legendRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: c.textSecondary },
})
