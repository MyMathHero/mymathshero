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
import { ScreenBackground } from '../../lib/ui'
import ParentTabBar from '../../components/ParentTabBar'
import ThemeToggle from '../../components/ThemeToggle'
import CharacterAvatar from '../../components/CharacterAvatar'
import NotificationBell from '../../components/NotificationBell'
import SupportSheet from '../../components/SupportSheet'
import { isCharacterId } from '../../lib/characterAvatars'

export default function ParentDashboard() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const [parentId, setParentId] = useState('')
  const [parentName, setParentName] = useState('')
  const [showSupport, setShowSupport] = useState(false)
  const [children, setChildren] = useState<any[]>([])
  const [activeChild, setActiveChild] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [insight, setInsight] = useState<string>('')
  const [insightLoading, setInsightLoading] = useState(false)
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
      if (kids.length > 0) {
        // Restore the previously-selected child (shared with Progress/Reports
        // tabs) or default to the first.
        const savedId = await SecureStore.getItemAsync('active_child_id')
        const restored = kids.find((k: any) => k.id === savedId) || kids[0]
        setActiveChild(restored)
      }
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

  // Refresh just the AI insight (lighter than a full reload).
  async function refreshInsight() {
    if (!activeChild?.id || !parentId || insightLoading) return
    setInsightLoading(true)
    try {
      const res = await parentAPI.insights(activeChild.id, parentId)
      setInsight(res?.data?.insight || '')
    } catch { /* keep previous */ }
    finally { setInsightLoading(false) }
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
    <ScreenBackground>
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
            <NotificationBell onOpenLink={(link) => { if (link === 'support') setShowSupport(true) }} />
            <ThemeToggle compact />
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
                onPress={() => { setActiveChild(c); SecureStore.setItemAsync('active_child_id', c.id).catch(() => {}) }}
              >
                {isCharacterId(c.avatar)
                  ? <CharacterAvatar id={c.avatar} size={28} />
                  : <Text style={styles.childEmoji}>{c.avatar || '🦊'}</Text>}
                <View>
                  <Text style={styles.childName}>{c.name}</Text>
                  <Text style={styles.childGrade}>Grade {c.grade}</Text>
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

          {/* Placement Report — AI estimate of the child's true working level. */}
          {!!activeChild?.placement?.rationale && (
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>🏆 Placement Report</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <View style={styles.placeChip}>
                  <Text style={styles.placeChipText}>
                    Enrolled: {activeChild.placement.enteredGrade === 0 ? 'Prep' : `Year ${activeChild.placement.enteredGrade}`}
                  </Text>
                </View>
                <View style={[styles.placeChip, activeChild.placement.estimatedGrade > activeChild.placement.enteredGrade && styles.placeChipUp]}>
                  <Text style={styles.placeChipText}>
                    Estimated: {activeChild.placement.estimatedGrade === 0 ? 'Prep' : `Year ${activeChild.placement.estimatedGrade}`}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardBody}>{activeChild.placement.rationale}</Text>
            </View>
          )}

          {/* AI Insights — timeline of a few cards */}
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={{ fontSize: 20 }}>🤖</Text>
              <Text style={styles.insightTitle}>Hero&apos;s Insights</Text>
              <TouchableOpacity onPress={refreshInsight} disabled={insightLoading} hitSlop={10} style={{ marginLeft: 'auto' }}>
                {insightLoading
                  ? <ActivityIndicator color="#C49A1A" size="small" />
                  : <Text style={styles.insightRefresh}>↻</Text>}
              </TouchableOpacity>
            </View>
            {(() => {
              const name = student?.name || 'Your child'
              const items: { icon: string; title: string; body: string }[] = [
                {
                  icon: '✦',
                  title: 'Hero says',
                  body: insight || `${name} is making great progress! Keep encouraging daily practice.`,
                },
                {
                  icon: '⚡',
                  title: 'This week',
                  body: (stats.totalQuestionsThisWeek || 0) > 0
                    ? `${stats.totalQuestionsThisWeek} questions answered with ${stats.accuracy || 0}% accuracy.`
                    : `No questions answered yet this week — a gentle nudge can help.`,
                },
                {
                  icon: '🏆',
                  title: 'Mastery',
                  body: (stats.mastered || 0) > 0
                    ? `${stats.mastered} skill${stats.mastered === 1 ? '' : 's'} mastered so far. Keep it up!`
                    : `No skills mastered yet — they're on the way there.`,
                },
              ]
              return items.map((it, i) => (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.timelineGutter}>
                    <View style={styles.timelineDot}><Text style={{ fontSize: 11 }}>{it.icon}</Text></View>
                    {i < items.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: i < items.length - 1 ? 14 : 0 }}>
                    <Text style={styles.timelineTitle}>{it.title}</Text>
                    <Text style={styles.insightText}>{it.body}</Text>
                  </View>
                </View>
              ))
            })()}
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
              Tap Progress below for detailed analytics.
            </Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      <SupportSheet visible={showSupport} onClose={() => setShowSupport(false)} />
      <ParentTabBar />
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loading: { flex: 1, backgroundColor: c.bgPrimary,
    alignItems: 'center', justifyContent: 'center' },
  loadingLogo: { fontSize: 32, fontWeight: '800', color: c.textPrimary },
  loadingText: { color: c.accentGold, marginTop: 12, fontWeight: '600' },

  header: { backgroundColor: 'transparent', padding: 20, paddingBottom: 12 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start' },
  eyebrow: { color: c.textSecondary, fontSize: 11,
    fontWeight: '700', letterSpacing: 1 },
  welcome: { color: c.textPrimary, fontWeight: '800', fontSize: 22, marginTop: 2, letterSpacing: -0.3 },
  welcomeSub: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
  logoutBtn: { borderWidth: 1, borderColor: c.cardBorder,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  logoutText: { color: c.textSecondary, fontSize: 12 },

  activeChildCard: { backgroundColor: c.bgCard,
    borderRadius: 16, padding: 14, marginTop: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: c.cardBorder,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  activeChildAvatar: { width: 48, height: 48, borderRadius: 24,
    backgroundColor: c.accentGold, alignItems: 'center', justifyContent: 'center' },
  activeChildName: { color: c.textPrimary, fontWeight: '800', fontSize: 16 },
  activeChildMeta: { color: c.accentGold, fontSize: 12, fontWeight: '600' },
  activeChildStreak: { color: c.textPrimary, fontWeight: '800', fontSize: 15 },
  activeChildStreakLabel: { color: c.textMuted, fontSize: 10 },

  childRow: { backgroundColor: 'transparent', paddingBottom: 12 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.bgCard, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: c.cardBorder },
  childChipActive: { borderColor: c.accentGold, backgroundColor: c.accentGoldLight },
  childEmoji: { fontSize: 22 },
  childName: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
  childGrade: { fontSize: 10, color: c.textSecondary },

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
  insightText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 21 },
  insightRefresh: { color: c.accentGold, fontSize: 20, fontWeight: '800' },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineGutter: { alignItems: 'center', width: 22 },
  timelineDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(196,154,26,0.25)',
    alignItems: 'center', justifyContent: 'center' },
  timelineLine: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 2 },
  timelineTitle: { color: c.accentGold, fontWeight: '800', fontSize: 12, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  cardSection: { backgroundColor: c.bgCard, borderRadius: 16, padding: 18,
    marginHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardSectionTitle: { fontSize: 16, fontWeight: '800',
    color: c.textPrimary, marginBottom: 16 },
  cardBody: { fontSize: 13, color: c.textSecondary, lineHeight: 20, marginBottom: 12 },
  cardFooter: { fontSize: 12, color: c.accentGold, fontWeight: '600' },
  placeChip: { backgroundColor: c.bgPrimary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  placeChipUp: { backgroundColor: c.accentGoldLight },
  placeChipText: { fontSize: 11, fontWeight: '700', color: c.textPrimary },

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
