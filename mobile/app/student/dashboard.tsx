import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as Haptics from 'expo-haptics'
import { studentAPI } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../lib/theme'
import HeroRobot from '../../components/HeroRobot'

export default function StudentDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const [student, setStudent] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const id = await SecureStore.getItemAsync('user_id')
      if (!id) {
        router.replace('/login')
        return
      }

      const res = await studentAPI.progress(id)
      const data = res?.data || {}
      setStudent(data.student || null)

      const mathsRecs = (data.recommendations || []).filter(
        (s: any) => s?.subject === 'Maths' || s?.subject === 'Mathematics'
      )
      setRecommendations(mathsRecs)
      setStats(data.stats || null)
    } catch (err) {
      console.error('Dashboard load error:', err)
      setStudent(null)
      setRecommendations([])
      setStats(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [])

  const weakestSkill = recommendations
    .filter(s => s.currentScore > 0)
    .sort((a, b) => a.currentScore - b.currentScore)[0] || null

  function pushPractice(skill: any, extra: Record<string, string> = {}) {
    if (!skill) return
    router.push({
      pathname: '/student/practice',
      params: {
        skillId: skill.id,
        skillName: skill.name,
        grade: String(student?.grade || 3),
        ...extra,
      },
    })
  }

  function openDailyPuzzle() {
    const hardest = [...recommendations].sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0))[0]
    pushPractice(hardest)
  }
  function openSpeedRound() {
    pushPractice(recommendations[0], { speedRound: 'true' })
  }
  function openHeroPick() {
    pushPractice(recommendations[0])
  }
  function openWeakSpot() {
    pushPractice(weakestSkill)
  }

  if (loading) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingLogo}>
          MyMaths<Text style={{ color: theme.colors.gold }}>Hero</Text>
        </Text>
        <ActivityIndicator color={theme.colors.gold} size="large" style={{ marginTop: 20 }} />
        <Text style={s.loadingText}>Loading Hero HQ...</Text>
      </View>
    )
  }

  const xpProgress = (student?.xp || 0) % 100
  const firstName = student?.name?.split(' ')[0] || 'Hero'

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* A) Full navy hero header */}
      <View style={s.header}>
        {/* Top row: logo + coins + streak */}
        <View style={s.topRow}>
          <Text style={s.brand}>
            MyMaths<Text style={{ color: theme.colors.gold }}>Hero</Text>
          </Text>
          <View style={s.topStats}>
            <Text style={s.coins}>🪙 {student?.coins || 0}</Text>
            <Text style={s.streak}>🔥 {student?.streak || 0}</Text>
          </View>
        </View>

        {/* Greeting + waving robot */}
        <View style={s.greetingRow}>
          <HeroRobot mood="waving" size={80} containerStyle="circle" />
          <View style={{ flex: 1 }}>
            <Text style={s.greetingHi}>Good day, Hero! 👋</Text>
            <Text style={s.greetingName}>{firstName}</Text>
            <Text style={s.greetingXp}>⚡ {student?.xp || 0} Hero Points</Text>
            <View style={s.xpBarBg}>
              <View style={[s.xpBarFill, { width: `${Math.min(100, xpProgress)}%` as any }]} />
            </View>
          </View>
        </View>
      </View>

      {/* B) Horizontal stats strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.statsStrip}
        contentContainerStyle={{ padding: 12, gap: 10 }}
      >
        {[
          { label: 'Mastered',  value: stats?.mastered || 0,                     emoji: '🏆', color: theme.colors.gold },
          { label: 'Accuracy',  value: `${stats?.accuracy || 0}%`,               emoji: '🎯', color: theme.colors.success },
          { label: 'Questions', value: stats?.totalQuestionsThisWeek || 0,       emoji: '📝', color: '#60A5FA' },
          { label: 'Sessions',  value: student?.sessions_completed || 0,         emoji: '📚', color: '#A78BFA' },
        ].map((tile, i) => (
          <View key={i} style={s.statTile}>
            <Text style={s.statTileEmoji}>{tile.emoji}</Text>
            <Text style={[s.statTileValue, { color: tile.color }]}>{tile.value}</Text>
            <Text style={s.statTileLabel}>{tile.label}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView
        style={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />
        }
      >
        {/* C) Today's Challenges — horizontal cards */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Today&apos;s Challenges ✦</Text>
          <Text style={s.sectionSub}>Complete to earn bonus Hero Points</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 16 }}
          >
            {/* Daily Puzzle (dark) */}
            <TouchableOpacity onPress={openDailyPuzzle} activeOpacity={0.85} style={[s.challenge, s.challengeDark]}>
              <Text style={s.challengeEmoji}>🧩</Text>
              <Text style={[s.challengeTitle, { color: theme.colors.gold }]}>Daily Puzzle</Text>
              <Text style={[s.challengeSub, { color: 'rgba(255,255,255,0.6)' }]}>
                New puzzle every day!
              </Text>
              <View style={s.pointsPill}>
                <Text style={[s.pointsText, { color: theme.colors.gold }]}>+20 pts</Text>
              </View>
            </TouchableOpacity>

            {/* Speed Round (gold) */}
            <TouchableOpacity onPress={openSpeedRound} activeOpacity={0.85} style={[s.challenge, s.challengeGold]}>
              <Text style={s.challengeEmoji}>⚡</Text>
              <Text style={[s.challengeTitle, { color: 'white' }]}>Speed Round</Text>
              <Text style={[s.challengeSub, { color: 'rgba(255,255,255,0.85)' }]}>
                5 questions fast!
              </Text>
              <View style={s.pointsPill}>
                <Text style={[s.pointsText, { color: 'white' }]}>+15 pts</Text>
              </View>
            </TouchableOpacity>

            {/* Hero's Pick (white) */}
            <TouchableOpacity onPress={openHeroPick} activeOpacity={0.85} style={[s.challenge, s.challengeWhite]}>
              <Text style={s.challengeEmoji}>🤖</Text>
              <Text style={[s.challengeTitle, { color: theme.colors.textPrimary }]}>
                Hero&apos;s Pick
              </Text>
              <Text style={[s.challengeSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {recommendations[0]?.name || 'AI selected'}
              </Text>
              <View style={s.pointsPill}>
                <Text style={[s.pointsText, { color: theme.colors.textPrimary }]}>+10 pts</Text>
              </View>
            </TouchableOpacity>

            {/* Weak Spot */}
            {weakestSkill && (
              <TouchableOpacity onPress={openWeakSpot} activeOpacity={0.85} style={[s.challenge, s.challengeWeak]}>
                <Text style={s.challengeEmoji}>🎯</Text>
                <Text style={[s.challengeTitle, { color: theme.colors.textPrimary }]}>Weak Spot</Text>
                <Text style={[s.challengeSub, { color: theme.colors.warning }]} numberOfLines={1}>
                  {weakestSkill.name}
                </Text>
                <View style={s.pointsPill}>
                  <Text style={[s.pointsText, { color: theme.colors.textPrimary }]}>+25 pts</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* D) Hero Missions with robot */}
        <View style={s.section}>
          <View style={s.missionsHeading}>
            <HeroRobot mood="thinking" size={36} containerStyle="card" />
            <Text style={s.sectionTitle}>Hero Missions ✦</Text>
          </View>
          <Text style={s.sectionSub}>AI-selected skills personalised for you</Text>

          {recommendations.length === 0 ? (
            <View style={s.emptyMissions}>
              <Text style={s.emptyText}>🎉 No new missions right now. Try again later!</Text>
            </View>
          ) : (
            recommendations.slice(0, 6).map((skill: any, i: number) => {
              const score = Math.round(skill.currentScore || 0)
              const ringBg = score >= 80 ? theme.colors.successLight
                : score >= 50 ? theme.colors.goldLight
                : theme.colors.background
              const ringBorder = score >= 80 ? theme.colors.success
                : score >= 50 ? theme.colors.gold
                : theme.colors.border
              const ringText = score >= 80 ? theme.colors.success
                : score >= 50 ? theme.colors.gold
                : theme.colors.textMuted
              const barColor = score >= 80 ? theme.colors.success : theme.colors.gold
              return (
                <TouchableOpacity
                  key={skill.id || i}
                  onPress={() => pushPractice(skill)}
                  activeOpacity={0.8}
                  style={s.missionRow}
                >
                  <View style={[s.scoreRing, { backgroundColor: ringBg, borderColor: ringBorder }]}>
                    <Text style={[s.scoreRingText, { color: ringText }]}>{score}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.missionName} numberOfLines={1}>{skill.name}</Text>
                    <View style={s.barOuter}>
                      <View style={[s.barInner, {
                        width: `${Math.min(100, score)}%` as any,
                        backgroundColor: barColor,
                      }]} />
                    </View>
                  </View>
                  <View style={s.missionCta}>
                    <Text style={s.missionCtaText}>
                      {score > 0 ? 'Continue' : 'Start'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom tab bar — haptic + gold active state */}
      <View style={s.tabBar}>
        {[
          { key: 'home',    label: 'Home',    emoji: '🏠', route: '/student/dashboard' },
          { key: 'league',  label: 'League',  emoji: '🏆', route: '/student/league' },
          { key: 'profile', label: 'Profile', emoji: '👤', route: '/student/profile' },
        ].map(tab => {
          const isActive = pathname === tab.route
            || (tab.key === 'home' && (pathname === '/student/dashboard' || pathname === '/'))
          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tab}
              onPress={async () => {
                try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
                if (!isActive) router.push(tab.route as any)
              }}
              activeOpacity={0.7}
            >
              {isActive && <View style={s.tabIndicator} />}
              <Text style={s.tabEmoji}>{tab.emoji}</Text>
              <Text style={[
                s.tabLabel,
                isActive && { color: theme.colors.gold, fontWeight: '800' },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loading: {
    flex: 1, backgroundColor: theme.colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingLogo: { fontSize: 32, fontWeight: '800', color: 'white' },
  loadingText: { color: theme.colors.gold, marginTop: 12, fontWeight: '600' },

  // Header
  header: { backgroundColor: theme.colors.navy, paddingTop: 8, paddingBottom: 20, paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand: { color: 'white', fontWeight: '800', fontSize: 20 },
  topStats: { flexDirection: 'row', gap: 16 },
  coins: { color: theme.colors.gold, fontWeight: '800', fontSize: 15 },
  streak: { color: '#FF6B35', fontWeight: '800', fontSize: 15 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  greetingHi: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  greetingName: { color: 'white', fontWeight: '800', fontSize: 22, marginTop: 2 },
  greetingXp: { color: theme.colors.gold, fontSize: 13, fontWeight: '600', marginTop: 2 },
  xpBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: theme.colors.gold, borderRadius: 3 },

  // Stats strip
  statsStrip: { backgroundColor: theme.colors.navyDark, flexGrow: 0 },
  statTile: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', minWidth: 80,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  statTileEmoji: { fontSize: 18 },
  statTileValue: { fontWeight: '800', fontSize: 16, marginTop: 2 },
  statTileLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 1 },

  // Scroll body
  scroll: { flex: 1 },
  section: { paddingTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4 },
  sectionSub: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 14 },

  // Challenges
  challenge: {
    width: 155, borderRadius: 18, padding: 18,
    borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  challengeDark: { backgroundColor: theme.colors.navy, borderColor: theme.colors.gold },
  challengeGold: { backgroundColor: theme.colors.gold, borderColor: theme.colors.gold },
  challengeWhite: { backgroundColor: 'white', borderColor: theme.colors.border },
  challengeWeak: { backgroundColor: theme.colors.goldLight, borderColor: theme.colors.warningLight },
  challengeEmoji: { fontSize: 36, marginBottom: 8 },
  challengeTitle: { fontWeight: '800', fontSize: 15, marginBottom: 4 },
  challengeSub: { fontSize: 12, marginBottom: 10 },
  pointsPill: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  pointsText: { fontSize: 11, fontWeight: '700' },

  // Missions
  missionsHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  emptyMissions: { padding: 24, alignItems: 'center' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  missionRow: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  scoreRing: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  scoreRingText: { fontSize: 14, fontWeight: '800' },
  missionName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  barOuter: { height: 6, backgroundColor: theme.colors.background, borderRadius: 3, overflow: 'hidden' },
  barInner: { height: '100%', borderRadius: 3 },
  missionCta: {
    backgroundColor: theme.colors.navy, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: theme.colors.gold,
  },
  missionCtaText: { color: 'white', fontWeight: '700', fontSize: 12 },

  // Bottom tab bar
  tabIndicator: {
    width: 32, height: 3,
    backgroundColor: theme.colors.gold,
    borderRadius: 2,
    marginBottom: 4,
  },
  tabBar: {
    flexDirection: 'row', backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingBottom: 20, paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
})
