import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as Haptics from 'expo-haptics'
import { studentAPI } from '../../lib/api'
import { scheduleStreakReminder } from '../../lib/notifications'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../lib/theme'
import ThemeToggle from '../../components/ThemeToggle'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import HeroRobot from '../../components/HeroRobot'
import {
  getSkillInfo, SKILL_CATEGORIES, SKILL_ID_MAP, type SkillCategoryKey,
} from '../../lib/skillNames'

interface NudgeMessage {
  emoji: string
  title: string
  message: string
  action: string
  skill?: any
  isExam?: boolean
  color: string
  borderColor: string
}

function buildNudges(
  currentStudent: any,
  recs: any[],
  currentStats: any
): NudgeMessage[] {
  const nudges: NudgeMessage[] = []
  if (recs.length > 0) {
    const sorted = [...recs].sort(
      (a, b) => (a.currentScore || 0) - (b.currentScore || 0)
    )
    const weakest = sorted[0]
    const strongest = sorted[sorted.length - 1]
    if (weakest) {
      const info = getSkillInfo(weakest.id || weakest.skillId)
      if (info) {
        nudges.push({
          emoji: '🎯',
          title: 'Weak Spot Alert!',
          message: `Your ${info.name} needs work (${Math.round(weakest.currentScore || 0)}/100). Let's improve it!`,
          action: 'Practice Now',
          skill: weakest,
          color: '#FEF3C7',
          borderColor: '#F59E0B',
        })
      }
    }
    const readyForExam = recs.find(
      s => (s.currentScore || 0) >= 70 && !s.mastered
    )
    if (readyForExam) {
      const info = getSkillInfo(readyForExam.id || readyForExam.skillId)
      if (info) {
        nudges.push({
          emoji: '🏆',
          title: 'Ready for Mastery Exam!',
          message: `${Math.round(readyForExam.currentScore)}/100 in ${info.name}. Take the exam to level up!`,
          action: 'Take Exam!',
          skill: readyForExam,
          isExam: true,
          color: '#DCFCE7',
          borderColor: '#22C55E',
        })
      }
    }
    if (strongest && (strongest.currentScore || 0) >= 80) {
      const info = getSkillInfo(strongest.id || strongest.skillId)
      if (info) {
        nudges.push({
          emoji: '⚡',
          title: "You're on fire!",
          message: `Amazing work on ${info.name}! ${Math.round(strongest.currentScore)}/100. Keep it up!`,
          action: 'Continue',
          skill: strongest,
          color: '#EFF6FF',
          borderColor: '#2563EB',
        })
      }
    }
  }
  if (currentStudent?.streak > 0) {
    nudges.push({
      emoji: '🔥',
      title: `${currentStudent.streak}-day streak!`,
      message: `Don't break your ${currentStudent.streak}-day streak — practise at least one skill today!`,
      action: 'Practice Now',
      skill: recs[0],
      color: '#FFF7ED',
      borderColor: '#EA580C',
    })
  }
  nudges.push({
    emoji: '🤖',
    title: 'Hero says...',
    message: `${currentStats?.totalQuestionsThisWeek || 0} questions this week! Every one makes you smarter. 💪`,
    action: "Let's Go!",
    skill: recs[0],
    color: '#F5F3FF',
    borderColor: '#7C3AED',
  })
  return nudges
}

export default function StudentDashboard() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const pathname = usePathname()
  const [student, setStudent] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SkillCategoryKey | null>(null)

  // AI nudge banner
  const [heroNudge, setHeroNudge] = useState<NudgeMessage | null>(null)
  const nudgeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nudgeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nudgeCountRef = useRef(0)

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

      // Schedule the 6pm local streak reminder (DAILY trigger — fires every day).
      // Wraps the call so a notification scheduling failure can't break the
      // dashboard render.
      if (data.student?.name) {
        const firstName = String(data.student.name).split(' ')[0]
        scheduleStreakReminder(firstName, data.student.streak || 0).catch(() => {})
      }

      // Maths only — strict guard so any e_*/s_* legacy entries are dropped.
      const mathsRecs = (data.recommendations || []).filter((s: any) => {
        const id = s?.id || s?.skillId || ''
        const subject = s?.subject || ''
        return id.startsWith('m_') || subject === 'Maths' || subject === 'Mathematics'
      })
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

  // Rotate the nudge banner every 2 minutes; auto-dismiss after 6s. Spec: simple useEffect timer.
  useEffect(() => {
    if (!student || recommendations.length === 0) return
    nudgeTimerRef.current = setInterval(() => {
      nudgeCountRef.current += 1
      const nudges = buildNudges(student, recommendations, stats)
      if (nudges.length === 0) return
      const next = nudges[nudgeCountRef.current % nudges.length]
      setHeroNudge(next)
      if (nudgeDismissRef.current) clearTimeout(nudgeDismissRef.current)
      nudgeDismissRef.current = setTimeout(() => setHeroNudge(null), 6000)
    }, 120000)
    return () => {
      if (nudgeTimerRef.current) clearInterval(nudgeTimerRef.current)
      if (nudgeDismissRef.current) clearTimeout(nudgeDismissRef.current)
    }
  }, [student?.id, recommendations.length, stats?.mastered])

  function openCategoryPractice(categoryKey: SkillCategoryKey) {
    // Find a SKILL_ID_MAP entry in this category, prefer the student's grade.
    const matchingIds = (Object.entries(SKILL_ID_MAP) as Array<[string, { category: SkillCategoryKey; name: string }]>)
      .filter(([, data]) => data.category === categoryKey)
      .map(([id]) => id)
    if (matchingIds.length === 0) return

    const gradePrefix = `m_${student?.grade || 3}_`
    const skillId = matchingIds.find(id => id.startsWith(gradePrefix)) || matchingIds[0]
    const info = getSkillInfo(skillId)
    if (!info) return

    pushPractice({ id: skillId, name: info.name, currentScore: 0, mastered: false })
  }

  function handleExamUnlock(skill: any) {
    const info = getSkillInfo(skill.id || skill.skillId)
    if (!info) return
    Alert.alert(
      `🏆 ${info.name} Mastery Exam`,
      'You\'ve scored 70+ on this skill — ready to prove mastery with harder questions?',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Start Exam',
          style: 'default',
          onPress: () => {
            pushPractice(skill, { mode: 'exam' })
          },
        },
      ]
    )
  }

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
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* AI Hero nudge banner — appears at top, auto-dismisses after 6s */}
      {heroNudge && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            const nudge = heroNudge
            setHeroNudge(null)
            if (!nudge?.skill) return
            if (nudge.isExam) handleExamUnlock(nudge.skill)
            else pushPractice(nudge.skill)
          }}
          style={[
            s.nudgeBanner,
            { backgroundColor: heroNudge.color, borderColor: heroNudge.borderColor },
          ]}
        >
          <Text style={s.nudgeEmoji}>{heroNudge.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.nudgeTitle} numberOfLines={1}>{heroNudge.title}</Text>
            <Text style={s.nudgeMsg} numberOfLines={2}>{heroNudge.message}</Text>
          </View>
          <TouchableOpacity onPress={() => setHeroNudge(null)} hitSlop={10}>
            <Text style={s.nudgeClose}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* A) Full navy hero header */}
      <View style={[s.header, { backgroundColor: colors.bgHeader }]}>
        {/* Top row: logo + coins + streak */}
        <View style={s.topRow}>
          <Text style={s.brand}>
            MyMaths<Text style={{ color: theme.colors.gold }}>Hero</Text>
          </Text>
          <View style={s.topStats}>
            <Text style={s.coins}>🪙 {student?.coins || 0}</Text>
            <Text style={s.streak}>🔥 {student?.streak || 0}</Text>
            <ThemeToggle compact />
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
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Today&apos;s Challenges ✦</Text>
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

          {/* Category filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingRight: 16 }}
            style={{ marginBottom: 12 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.8}
              style={[
                s.catPill,
                selectedCategory === null && s.catPillActive,
              ]}
            >
              <Text style={[s.catPillText, selectedCategory === null && s.catPillTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {(Object.entries(SKILL_CATEGORIES) as Array<[SkillCategoryKey, typeof SKILL_CATEGORIES[SkillCategoryKey]]>)
              .map(([key, cat]) => {
                const active = selectedCategory === key
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setSelectedCategory(active ? null : key)}
                    activeOpacity={0.8}
                    style={[
                      s.catPill,
                      active && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                  >
                    <Text style={[s.catPillText, active && s.catPillTextActive]}>
                      {cat.emoji}  {cat.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
          </ScrollView>

          {(() => {
            const filtered = selectedCategory
              ? recommendations.filter(s => {
                  const info = getSkillInfo(s.id || s.skillId)
                  return info?.category === selectedCategory
                })
              : recommendations.filter(s => getSkillInfo(s.id || s.skillId) !== null)

            // Empty category state — offer to start practice on a stock skill
            // for that category so the student isn't dead-ended.
            if (filtered.length === 0 && selectedCategory) {
              return (
                <View style={s.emptyMissions}>
                  <Text style={s.emptyText}>No missions yet in this category.</Text>
                  <TouchableOpacity
                    onPress={() => openCategoryPractice(selectedCategory)}
                    activeOpacity={0.8}
                    style={s.startCatBtn}
                  >
                    <Text style={s.startCatBtnText}>Start practising →</Text>
                  </TouchableOpacity>
                </View>
              )
            }
            if (filtered.length === 0) {
              return (
                <View style={s.emptyMissions}>
                  <Text style={s.emptyText}>🎉 No new missions right now. Try again later!</Text>
                </View>
              )
            }

            return filtered.slice(0, 6).map((skill: any, i: number) => {
              const info = getSkillInfo(skill.id || skill.skillId)
              if (!info) return null
              const score = Math.round(skill.currentScore || 0)
              const barColor = score >= 80 ? theme.colors.success : info.color
              const isReady = score >= 70 && !skill.mastered
              return (
                <TouchableOpacity
                  key={skill.id || i}
                  onPress={() => pushPractice(skill)}
                  activeOpacity={0.8}
                  style={[s.missionRow, { borderColor: info.lightColor }]}
                >
                  <View style={[
                    s.scoreRing,
                    { backgroundColor: info.lightColor, borderColor: info.color },
                  ]}>
                    <Text style={[s.scoreRingText, { color: info.color }]}>{info.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.missionName} numberOfLines={1}>{info.name}</Text>
                    <Text style={[s.missionCategory, { color: info.color }]} numberOfLines={1}>
                      {info.categoryLabel} · {score}/100
                    </Text>
                    <View style={s.barOuter}>
                      <View style={[s.barInner, {
                        width: `${Math.min(100, score)}%` as any,
                        backgroundColor: barColor,
                      }]} />
                    </View>
                  </View>
                  {isReady ? (
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleExamUnlock(skill) }}
                      activeOpacity={0.8}
                      style={s.examBtn}
                    >
                      <Text style={s.examBtnText}>🏆 Exam</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.missionCta}>
                      <Text style={s.missionCtaText}>
                        {score > 0 ? 'Continue' : 'Start'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })
          })()}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom tab bar — haptic + gold active state */}
      <View style={s.tabBar}>
        {[
          { key: 'home',    label: 'Home',    emoji: '🏠', route: '/student/dashboard' },
          { key: 'league',  label: 'League',  emoji: '🏆', route: '/student/league' },
          { key: 'arcade',  label: 'Arcade',  emoji: '🕹️', route: '/student/arcade' },
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  loading: {
    flex: 1, backgroundColor: c.bgHeader,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingLogo: { fontSize: 32, fontWeight: '800', color: 'white' },
  loadingText: { color: c.accentGold, marginTop: 12, fontWeight: '600' },

  // Header
  header: { backgroundColor: c.bgHeader, paddingTop: 8, paddingBottom: 20, paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand: { color: 'white', fontWeight: '800', fontSize: 20 },
  topStats: { flexDirection: 'row', gap: 16 },
  coins: { color: c.accentGold, fontWeight: '800', fontSize: 15 },
  streak: { color: '#FF6B35', fontWeight: '800', fontSize: 15 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  greetingHi: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  greetingName: { color: 'white', fontWeight: '800', fontSize: 22, marginTop: 2 },
  greetingXp: { color: c.accentGold, fontSize: 13, fontWeight: '600', marginTop: 2 },
  xpBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: c.accentGold, borderRadius: 3 },

  // Stats strip
  statsStrip: { backgroundColor: c.bgHeaderSecondary, flexGrow: 0 },
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
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.textPrimary, marginBottom: 4 },
  sectionSub: { color: c.textSecondary, fontSize: 13, marginBottom: 14 },

  // Challenges
  challenge: {
    width: 155, borderRadius: 18, padding: 18,
    borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  challengeDark: { backgroundColor: c.bgHeader, borderColor: c.accentGold },
  challengeGold: { backgroundColor: c.accentGold, borderColor: c.accentGold },
  challengeWhite: { backgroundColor: c.bgCard, borderColor: c.borderColor },
  challengeWeak: { backgroundColor: c.accentGoldLight, borderColor: c.wrongBg },
  challengeEmoji: { fontSize: 36, marginBottom: 8 },
  challengeTitle: { fontWeight: '800', fontSize: 15, marginBottom: 4 },
  challengeSub: { fontSize: 12, marginBottom: 10 },
  pointsPill: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  pointsText: { fontSize: 11, fontWeight: '700' },

  // Missions
  missionsHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  emptyMissions: { padding: 24, alignItems: 'center', gap: 12 },
  emptyText: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
  startCatBtn: {
    backgroundColor: c.bgHeader, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 12,
    borderWidth: 2, borderColor: c.accentGold,
  },
  startCatBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  missionRow: {
    backgroundColor: c.bgCard, borderRadius: 16, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: c.borderColor,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  scoreRing: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  scoreRingText: { fontSize: 22, fontWeight: '800' },
  missionName: { fontSize: 15, fontWeight: '700', color: c.textPrimary, marginBottom: 2 },
  missionCategory: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  barOuter: { height: 6, backgroundColor: c.bgPrimary, borderRadius: 3, overflow: 'hidden' },
  barInner: { height: '100%', borderRadius: 3 },
  missionCta: {
    backgroundColor: c.bgHeader, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: c.accentGold,
  },
  missionCtaText: { color: 'white', fontWeight: '700', fontSize: 12 },
  examBtn: {
    backgroundColor: c.bgHeader, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 2, borderColor: c.accentGold,
  },
  examBtnText: { color: c.accentGold, fontWeight: '800', fontSize: 12 },

  // Category filter pills
  catPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1.5,
    borderColor: c.borderColor, backgroundColor: c.bgCard,
  },
  catPillActive: { backgroundColor: c.bgHeader, borderColor: c.bgHeader },
  catPillText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  catPillTextActive: { color: 'white' },

  // Nudge banner
  nudgeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 12, marginTop: 8, marginBottom: 4,
    padding: 12, borderRadius: 14, borderWidth: 2,
  },
  nudgeEmoji: { fontSize: 24 },
  nudgeTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
  nudgeMsg: { fontSize: 12, color: '#334155', lineHeight: 16, marginTop: 2 },
  nudgeClose: { fontSize: 14, color: c.textMuted, paddingHorizontal: 4 },

  // Bottom tab bar
  tabIndicator: {
    width: 32, height: 3,
    backgroundColor: c.accentGold,
    borderRadius: 2,
    marginBottom: 4,
  },
  tabBar: {
    flexDirection: 'row', backgroundColor: c.bgCard,
    borderTopWidth: 1, borderTopColor: c.borderColor,
    paddingBottom: 20, paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 11, color: c.textMuted, fontWeight: '600' },
})
