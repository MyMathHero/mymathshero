import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, Image,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as Haptics from 'expo-haptics'
import api, { studentAPI } from '../../lib/api'
import AskHeroSheet from '../../components/AskHeroSheet'
import AskHeroIcon from '../../components/AskHeroIcon'
import FloatingTabBar from '../../components/FloatingTabBar'
import ReviewSurvey from '../../components/ReviewSurvey'
import { isJuniorGrade } from '../../lib/juniorMode'
import CharacterAvatar from '../../components/CharacterAvatar'
import { scheduleStreakReminder } from '../../lib/notifications'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '../../lib/theme'
import ThemeToggle from '../../components/ThemeToggle'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import { ScreenBackground, GlowBar, Card, StatPill } from '../../lib/ui'
import { LinearGradient } from 'expo-linear-gradient'
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
  icon?: 'askHero'
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
          title: 'Development Spot Alert!',
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
    icon: 'askHero',
    color: '#F5F3FF',
    borderColor: '#7C3AED',
  })
  return nudges
}

export default function StudentDashboard() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [student, setStudent] = useState<any>(null)
  const [showReview, setShowReview] = useState(false) // pre-launch review survey (#8)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [dailyTask, setDailyTask] = useState<any>(null)
  // Availability: "Available" (matchable in Challenge) vs "Busy studying".
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SkillCategoryKey | null>(null)

  // AI nudge banner
  const [heroNudge, setHeroNudge] = useState<NudgeMessage | null>(null)
  const nudgeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nudgeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nudgeCountRef = useRef(0)

  // Ask Hero (general mode) bottom sheet, gated by /hero-chat-status.
  const [showHeroSheet, setShowHeroSheet] = useState(false)

  useEffect(() => { loadData() }, [])

  // Presence heartbeat — keep this student "online" with their availability so
  // peers can (or can't) challenge them. Pings on mount + every 30s.
  async function sendPresence(isAvailable: boolean) {
    try {
      const id = await SecureStore.getItemAsync('user_id')
      if (id) await studentAPI.presence(id, isAvailable)
    } catch { /* best-effort */ }
  }
  function toggleAvailability() {
    setAvailable(prev => { const next = !prev; sendPresence(next); return next })
  }
  useEffect(() => {
    sendPresence(available)
    const t = setInterval(() => sendPresence(available), 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available])

  // Junior Mode (Prep–3): the Standard dashboard isn't age-appropriate — send the
  // youngest students to the Hero-first Junior home instead.
  useEffect(() => {
    if (student && isJuniorGrade(student.grade)) {
      router.replace('/student/junior')
    }
  }, [student?.grade])

  // Pre-launch review survey (report #8) — after the first session, then every
  // 10th, deduped per boundary via SecureStore.
  useEffect(() => {
    const sessions = student?.sessions_completed
    const sid = student?.id
    if (!sessions || !sid || (sessions !== 1 && sessions % 10 !== 0)) return
    let cancelled = false
    ;(async () => {
      try {
        const key = `mmh_studentReviewAt_${sid}`
        if (parseInt((await SecureStore.getItemAsync(key)) || '0', 10) === sessions) return
        setTimeout(async () => {
          if (cancelled) return
          setShowReview(true)
          await SecureStore.setItemAsync(key, String(sessions))
        }, 3000)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [student?.sessions_completed, student?.id])

  // Floating-button entry point — checks the plan/daily gate, then opens the
  // general-mode Ask Hero sheet. Fails open so Hero still works if the check
  // itself errors.
  async function openHeroFromDashboard() {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    try {
      const id = student?.id || (await SecureStore.getItemAsync('user_id')) || ''
      const res = await api.get(`/api/student/hero-chat-status?studentId=${id}`)
      const status = res.data
      if (!status.allowed && status.reason === 'upgrade') {
        Alert.alert(
          '💎 Premium Feature',
          'Ask Hero is available on the Premium plan. Upgrade to unlock unlimited AI tutoring!',
          [{ text: 'Maybe Later', style: 'cancel' }, { text: 'Upgrade', onPress: () => router.push('/parent/subscribe') }]
        )
        return
      }
      if (!status.allowed && status.reason === 'daily_limit') {
        Alert.alert(
          '🌟 Daily Limit Reached',
          "You've used all your Hero chats for today! Come back tomorrow 🌟 You've got this!",
          [{ text: 'OK' }]
        )
        return
      }
      // Consume one session (best-effort).
      try {
        await api.post('/api/student/hero-chat-status', { studentId: id })
      } catch {}
      setShowHeroSheet(true)
    } catch {
      setShowHeroSheet(true) // fail open
    }
  }

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

      // HERO Daily Task — gate categories + arcade until it's done.
      try {
        const dt = await studentAPI.dailyTask(id)
        setDailyTask(dt?.data?.task || null)
      } catch { /* non-fatal — leave unlocked if it can't load */ }
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
    if (dailyTaskLocked) {
      Alert.alert('🦸 HERO Daily Task', 'Finish today’s HERO task first to unlock freestyle practice and the arcade!')
      return
    }
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

  // Refresh the daily-task state each time the dashboard regains focus (e.g.
  // returning from a practice run that completed the task) so the gate updates.
  useFocusEffect(
    useCallback(() => {
      let active = true
      ;(async () => {
        const id = await SecureStore.getItemAsync('user_id')
        if (!id) return
        try {
          const dt = await studentAPI.dailyTask(id)
          if (active) setDailyTask(dt?.data?.task || null)
        } catch {}
      })()
      return () => { active = false }
    }, [])
  )

  const dailyTaskLocked = !!dailyTask && dailyTask.done !== true

  function openDailyTask() {
    if (!dailyTask?.skillId) return
    pushPractice(
      { id: dailyTask.skillId, name: dailyTask.skillName },
      { dailyTask: 'true', title: '🦸 HERO Daily Task' }
    )
  }

  // Guard freestyle entry points while the task is locked.
  function guardedOpen(fn: () => void) {
    if (dailyTaskLocked) {
      Alert.alert('🦸 HERO Daily Task', 'Finish today’s HERO task first to unlock freestyle practice and the arcade!')
      return
    }
    fn()
  }

  function openDailyPuzzle() {
    guardedOpen(() => {
      const hardest = [...recommendations].sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0))[0]
      pushPractice(hardest)
    })
  }
  function openSpeedRound() {
    guardedOpen(() => pushPractice(recommendations[0], { speedRound: 'true' }))
  }
  function openHeroPick() {
    guardedOpen(() => pushPractice(recommendations[0]))
  }
  function openWeakSpot() {
    guardedOpen(() => pushPractice(weakestSkill))
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
    <ScreenBackground>
    <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top']}>
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
          {heroNudge.icon === 'askHero' ? (
            <AskHeroIcon size={26} />
          ) : (
            <Text style={s.nudgeEmoji}>{heroNudge.emoji}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.nudgeTitle} numberOfLines={1}>{heroNudge.title}</Text>
            <Text style={s.nudgeMsg} numberOfLines={2}>{heroNudge.message}</Text>
          </View>
          <TouchableOpacity onPress={() => setHeroNudge(null)} hitSlop={10}>
            <Text style={s.nudgeClose}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* A) Header — brand + theme toggle, then avatar/greeting with coins+streak */}
      <View style={s.header}>
        {/* Top row: brand left, availability + theme toggle right */}
        <View style={s.topRow}>
          <Text style={s.brand}>
            MyMaths<Text style={{ color: colors.accentGold }}>Hero</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Available / Busy studying — controls Challenge matchmaking. */}
            <TouchableOpacity
              onPress={toggleAvailability}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: 'rgba(127,127,127,0.14)', borderRadius: 999,
                paddingHorizontal: 10, paddingVertical: 5,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: available ? '#34D399' : '#F59E0B' }} />
              <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700' }}>
                {available ? 'Available' : 'Busy'}
              </Text>
            </TouchableOpacity>
            <ThemeToggle compact />
          </View>
        </View>

        {/* Avatar + greeting; coins + streak pills sit under the toggle (right). */}
        <View style={s.greetingRow}>
          <TouchableOpacity onPress={() => router.push('/student/profile')} activeOpacity={0.85}>
            <View style={s.avatarRing}>
              {/* Uploaded profile photo (self-view) if set, else the avatar. */}
              {student?.profilePhoto
                ? <Image source={{ uri: student.profilePhoto }} style={{ width: 60, height: 60, borderRadius: 30 }} />
                : <CharacterAvatar id={student?.avatar} size={60} />}
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.greetingHi}>Good day, Hero! 👋</Text>
            <Text style={s.greetingName}>{firstName}</Text>
            <Text style={s.greetingXp}>⚡ {student?.xp || 0} Hero Points</Text>
          </View>
          <View style={s.heroStatsCol}>
            <View style={s.pill}>
              <Text style={s.pillText}>🪙 {student?.coins || 0}</Text>
            </View>
            <View style={s.pill}>
              <Text style={[s.pillText, { color: '#FF6B35' }]}>🔥 {student?.streak || 0}</Text>
            </View>
          </View>
        </View>
        <GlowBar progress={Math.min(100, xpProgress) / 100} height={6} style={{ marginTop: 12 }} />
      </View>

      {/* B) Three stat cards in a row (Mastered · Accuracy · Questions) */}
      <View style={s.statsRow}>
        {[
          { label: 'Mastered',  value: stats?.mastered || 0,               emoji: '🏆' },
          { label: 'Accuracy',  value: `${stats?.accuracy || 0}%`,         emoji: '🎯' },
          { label: 'Questions', value: stats?.totalQuestionsThisWeek || 0, emoji: '📋' },
        ].map((tile, i) => (
          <StatPill key={i} style={s.statTile}>
            <Text style={s.statTileEmoji}>{tile.emoji}</Text>
            <View style={s.statTileText}>
              <Text style={s.statTileValue} numberOfLines={1}>{tile.value}</Text>
              <Text style={s.statTileLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tile.label}</Text>
            </View>
          </StatPill>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />
        }
      >
        {/* HERO Daily Task — locks freestyle + arcade until completed */}
        {dailyTask && (
          <View style={{
            marginHorizontal: 16, marginTop: 12, borderRadius: 18, padding: 18,
            backgroundColor: dailyTaskLocked ? '#1B2B4B' : '#065F46',
            borderWidth: 2, borderColor: dailyTaskLocked ? theme.colors.gold : '#34D399',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 30 }}>🦸</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
                  {dailyTaskLocked ? "Today's HERO Task" : 'HERO Task complete! 🎉'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                  {dailyTaskLocked
                    ? `${dailyTask.skillName} · ${dailyTask.progress || 0}/${dailyTask.target}`
                    : 'Freestyle + arcade unlocked. Nice work!'}
                </Text>
              </View>
              {dailyTask.bonus > 0 && (
                <Text style={{ color: theme.colors.gold, fontWeight: '800', fontSize: 13 }}>+{dailyTask.bonus} 🪙</Text>
              )}
            </View>
            <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', marginBottom: dailyTaskLocked ? 12 : 0 }}>
              <View style={{
                height: '100%', borderRadius: 4,
                backgroundColor: dailyTaskLocked ? theme.colors.gold : '#34D399',
                width: `${Math.min(100, ((dailyTask.progress || 0) / (dailyTask.target || 1)) * 100)}%` as any,
              }} />
            </View>
            {dailyTaskLocked && (
              <TouchableOpacity onPress={openDailyTask} activeOpacity={0.85} style={{
                backgroundColor: theme.colors.gold, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
              }}>
                <Text style={{ color: '#1B2B4B', fontWeight: '800', fontSize: 14 }}>
                  {(dailyTask.progress || 0) > 0 ? 'Continue task →' : 'Start today’s task →'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* C) Today's Challenges — horizontal cards */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Today&apos;s Challenges ✦</Text>
          <Text style={s.sectionSub}>Complete to earn bonus Hero Points</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 16 }}
          >
            {/* Daily Puzzle */}
            <TouchableOpacity onPress={openDailyPuzzle} activeOpacity={0.85}>
              <LinearGradient colors={colors.challengeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.challenge}>
                <Text style={s.challengeEmoji}>🧩</Text>
                <Text style={s.challengeTitle}>Daily Puzzle</Text>
                <Text style={s.challengeSub}>New puzzle every day!</Text>
                <View style={s.pointsPill}>
                  <Text style={s.pointsText}>+20 pts</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Speed Round */}
            <TouchableOpacity onPress={openSpeedRound} activeOpacity={0.85}>
              <LinearGradient colors={colors.challengeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.challenge}>
                <Text style={s.challengeEmoji}>⚡</Text>
                <Text style={s.challengeTitle}>Speed Round</Text>
                <Text style={s.challengeSub}>5 questions fast!</Text>
                <View style={s.pointsPill}>
                  <Text style={s.pointsText}>+15 pts</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Hero's Pick */}
            <TouchableOpacity onPress={openHeroPick} activeOpacity={0.85}>
              <LinearGradient colors={colors.challengeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.challenge}>
                <Text style={s.challengeEmoji}>🤖</Text>
                <Text style={s.challengeTitle}>Hero&apos;s Pick</Text>
                <Text style={s.challengeSub} numberOfLines={1}>{recommendations[0]?.name || 'AI selected'}</Text>
                <View style={s.pointsPill}>
                  <Text style={s.pointsText}>+10 pts</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Monthly Review Exam */}
            <TouchableOpacity onPress={() => router.push('/student/monthly-exam')} activeOpacity={0.85}>
              <LinearGradient colors={['#7C2D12', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.challenge}>
                <Text style={s.challengeEmoji}>📅</Text>
                <Text style={s.challengeTitle}>Monthly Review</Text>
                <Text style={s.challengeSub} numberOfLines={1}>20-Q check-up</Text>
                <View style={s.pointsPill}>
                  <Text style={s.pointsText}>up to 100 🪙</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Development Spot */}
            {weakestSkill && (
              <TouchableOpacity onPress={openWeakSpot} activeOpacity={0.85}>
                <LinearGradient colors={colors.challengeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.challenge}>
                <Text style={s.challengeEmoji}>🎯</Text>
                <Text style={s.challengeTitle}>Development Spot</Text>
                <Text style={s.challengeSub} numberOfLines={1}>{weakestSkill.name}</Text>
                <View style={s.pointsPill}>
                  <Text style={s.pointsText}>+25 pts</Text>
                </View>
                </LinearGradient>
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
                    <Text style={s.missionCategory} numberOfLines={1}>
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
                    <View style={s.missionCtaWrap}>
                      <LinearGradient
                        colors={colors.ctaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.missionCta}
                      >
                        <Text style={s.missionCtaText} numberOfLines={1}>
                          {score > 0 ? 'Continue' : 'Start'}
                        </Text>
                      </LinearGradient>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })
          })()}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Ask Hero button — sits just above the docked bottom nav
          (72px tall + safe-area inset), so clear it with insets.bottom + 84. */}
      <TouchableOpacity
        onPress={openHeroFromDashboard}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 84,
          right: 18,
          zIndex: 100,
        }}
        activeOpacity={0.85}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Ask Hero"
      >
        <AskHeroIcon size={56} badge />
      </TouchableOpacity>

      <AskHeroSheet
        visible={showHeroSheet}
        onClose={() => setShowHeroSheet(false)}
        question={null}
        grade={parseInt(String(student?.grade || 3), 10)}
        studentName={student?.name || 'Hero'}
      />

      {/* Floating glassy bottom navigation */}
      <ReviewSurvey visible={showReview} variant="student" userId={student?.id} onClose={() => setShowReview(false)} />
      <FloatingTabBar />
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  loading: {
    flex: 1, backgroundColor: c.bgPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingLogo: { fontSize: 32, fontWeight: '800', color: c.textPrimary },
  loadingText: { color: c.accentGold, marginTop: 12, fontWeight: '600' },

  // Header — sits on the page bg (no navy block). Spec: 16px h-padding.
  header: { backgroundColor: 'transparent', paddingTop: 6, paddingBottom: 8, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand: { color: c.accentGold, fontWeight: '700', fontSize: 22, letterSpacing: -0.3 },
  topStats: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  // Coins + streak stacked under the toggle, on the right of the greeting.
  heroStatsCol: { gap: 6, alignItems: 'flex-end' },
  pill: {
    backgroundColor: c.bgCard, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: c.cardBorder,
  },
  pillText: { color: c.textPrimary, fontWeight: '700', fontSize: 13 },

  // Avatar + greeting row.
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarRing: {
    borderRadius: 999, padding: 2,
    borderWidth: 2, borderColor: c.accentGold,
  },
  greetingHi: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  greetingName: { color: c.textPrimary, fontWeight: '700', fontSize: 28, marginTop: 1, letterSpacing: -0.3 },
  greetingXp: { color: c.accentGold, fontSize: 14, fontWeight: '700', marginTop: 2 },

  // Three rounded-rectangle stat cards in a row (emoji left, value+label right).
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 20 },
  statTile: {
    flex: 1, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  statTileText: { flex: 1, minWidth: 0 },
  statTileEmoji: { fontSize: 22 },
  statTileValue: { fontWeight: '700', fontSize: 19, color: c.textPrimary },
  statTileLabel: { color: c.textSecondary, fontSize: 11, marginTop: 0 },

  // Scroll body — spec: 24px section spacing, 16px h-padding.
  scroll: { flex: 1 },
  section: { paddingTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary, marginBottom: 4, letterSpacing: -0.3 },
  sectionSub: { color: c.textSecondary, fontSize: 12, marginBottom: 14 },

  // Challenges — 160px cards: white/dark fill with a warm gold edge glow,
  // gold emoji, black/white title, grey sub, solid dark-gold "+pts" pill.
  challenge: {
    width: 160, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: c.cardBorder,
    shadowColor: c.accentGold, shadowOpacity: 0.18, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  challengeEmoji: { fontSize: 34, marginBottom: 10 },
  challengeTitle: { fontWeight: '700', fontSize: 16, marginBottom: 3, color: c.challengeText },
  challengeSub: { fontSize: 12, marginBottom: 12, color: c.challengeTextSub },
  pointsPill: { backgroundColor: '#9A7B1E', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  pointsText: { fontSize: 12, fontWeight: '700', color: '#FBF3DC' },

  // Missions
  missionsHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  emptyMissions: { padding: 24, alignItems: 'center', gap: 12 },
  emptyText: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
  startCatBtn: {
    backgroundColor: c.accentGold, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 12,
    shadowColor: c.glow, shadowOpacity: 0.6, shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }, elevation: 3,
  },
  startCatBtnText: { color: '#1B2B4B', fontWeight: '800', fontSize: 13 },
  missionRow: {
    backgroundColor: c.bgCard, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: c.cardBorder,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  scoreRing: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  scoreRingText: { fontSize: 18, fontWeight: '700' },
  missionName: { fontSize: 15, fontWeight: '700', color: c.textPrimary, marginBottom: 2 },
  missionCategory: { fontSize: 12, fontWeight: '600', marginBottom: 6, color: c.textSecondary },
  barOuter: { height: 6, backgroundColor: c.borderColor, borderRadius: 3, overflow: 'hidden' },
  barInner: { height: '100%', borderRadius: 3 },
  // Gold-gradient Continue button with a soft glow. flexShrink:0 keeps it from
  // being squeezed (so "Continue" never clips); the text column shrinks instead.
  missionCtaWrap: {
    borderRadius: 12, flexShrink: 0,
    shadowColor: c.accentGold, shadowOpacity: 0.55, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  missionCta: {
    borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  missionCtaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  examBtn: {
    backgroundColor: c.accentGoldLight, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: c.accentGold,
  },
  examBtnText: { color: c.accentGold, fontWeight: '700', fontSize: 13 },

  // Category filter pills — gold active (white text) / gold-border inactive.
  catPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 18, borderWidth: 1,
    borderColor: c.accentGold + '66', backgroundColor: 'transparent',
  },
  catPillActive: { backgroundColor: c.accentGold, borderColor: c.accentGold },
  catPillText: { fontSize: 12, fontWeight: '700', color: c.accentGold },
  catPillTextActive: { color: '#FFFFFF' },

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

})
