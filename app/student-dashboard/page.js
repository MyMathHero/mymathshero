'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import RoboVideo from '@/components/RoboVideo'
import AskHero from '@/components/AskHero'
import { useFeatureFlags } from '@/lib/useFeatureFlags'
import { getSkillInfo, SKILL_CATEGORIES, SKILL_ID_MAP } from '@/lib/skillNames'
import { Analytics } from '@/lib/analytics'
import { Calculator, BookOpen, FlaskConical, Flame, Star, Zap, Trophy, Target, Award, ChevronRight, X, CheckCircle2, XCircle, Lightbulb, ArrowRight, Rocket, Coins, ShoppingBag, Crown, Gift, Clock, Play, ChevronDown, Medal, Users, School, MapPin, Sparkles } from 'lucide-react'

const STUDENT_ID = 'student_test_001'

const subjects = [
  { id: 'maths', name: 'Maths', emoji: '🔢', gradient: 'from-blue-500 to-indigo-600' },
  // English/Science hidden until their flags are on (englishEnabled / scienceEnabled).
  { id: 'english', name: 'English', emoji: '📖', gradient: 'from-purple-500 to-fuchsia-600', flag: 'englishEnabled' },
  { id: 'science', name: 'Science', emoji: '🔬', gradient: 'from-emerald-500 to-teal-600', flag: 'scienceEnabled' },
]

const subjectIcons = { maths: Calculator, english: BookOpen, science: FlaskConical }
const subjectIconColors = { maths: 'text-blue-600', english: 'text-purple-600', science: 'text-emerald-600' }
const subjectIconBgs = { maths: 'bg-blue-100', english: 'bg-purple-100', science: 'bg-emerald-100' }

// Feature 1: Avatar Shop Items
const shopItems = [
  { id: 1, name: 'Cool Sunglasses', emoji: '😎', cost: 50, category: 'Accessories', owned: true },
  { id: 2, name: 'Wizard Hat', emoji: '🧙', cost: 100, category: 'Hats', owned: false },
  { id: 3, name: 'Space Background', emoji: '🌌', cost: 150, category: 'Backgrounds', owned: false },
  { id: 4, name: 'Crown', emoji: '👑', cost: 200, category: 'Hats', owned: false },
  { id: 5, name: 'Rainbow Trail', emoji: '🌈', cost: 100, category: 'Effects', owned: true },
  { id: 6, name: 'Pirate Hat', emoji: '🏴‍☠️', cost: 75, category: 'Hats', owned: false },
  { id: 7, name: 'Ocean Background', emoji: '🌊', cost: 150, category: 'Backgrounds', owned: false },
  { id: 8, name: 'Super Cape', emoji: '🦸', cost: 200, category: 'Accessories', owned: false },
]

const leaderboardTabs = [
  { label: 'My Grade', type: 'grade' },
  { label: 'My School', type: 'school' },
  { label: 'All Time', type: 'grade', period: 'alltime' },
]

const ALL_BADGES = [
  { id: 'first_login',    name: 'First Steps',       emoji: '👟', description: 'Logged in for the first time',   color: 'from-green-400 to-emerald-500' },
  { id: 'streak_3',       name: 'On Fire!',           emoji: '🔥', description: '3 day streak',                  color: 'from-orange-400 to-red-500' },
  { id: 'streak_5',       name: 'Week Warrior',       emoji: '⚡', description: '5 day streak',                  color: 'from-yellow-400 to-orange-500' },
  { id: 'mastered_1',     name: 'First Master',       emoji: '🏆', description: 'Mastered your first skill',     color: 'from-amber-400 to-yellow-500' },
  { id: 'mastered_5',     name: 'Skill Champion',     emoji: '🌟', description: 'Mastered 5 skills',             color: 'from-blue-400 to-indigo-500' },
  { id: 'mastered_10',    name: 'Knowledge Expert',   emoji: '🎓', description: 'Mastered 10 skills',            color: 'from-purple-400 to-fuchsia-500' },
  { id: 'questions_50',   name: 'Question Crusher',   emoji: '💪', description: 'Answered 50 questions',         color: 'from-teal-400 to-cyan-500' },
  { id: 'questions_100',  name: 'Century Club',       emoji: '💯', description: 'Answered 100 questions',        color: 'from-pink-400 to-rose-500' },
  { id: 'accuracy_80',    name: 'Sharp Mind',         emoji: '🧠', description: '80% accuracy in a session',    color: 'from-violet-400 to-purple-500' },
  { id: 'gift_earned',    name: 'Gift Winner',        emoji: '🎁', description: 'Completed 5 sessions',          color: 'from-red-400 to-pink-500' },
]

const todaysGoals = [
  { text: 'Master 1 skill', completed: false, emoji: '🎯', reward: '+50 Hero Points' },
  { text: 'Answer 10 questions', completed: true, emoji: '⚡', reward: '+30 Hero Points' },
  { text: 'Maintain streak', completed: true, emoji: '🔥', reward: '+20 Hero Points' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function mapSkillStatus(score) {
  if (score === 0) return 'New'
  if (score >= 70) return 'Almost There!'
  return 'Continue'
}

function groupRecommendationsBySubject(recommendations) {
  return {
    maths: recommendations
      .filter(r => r.subject === 'Maths')
      .slice(0, 3)
      .map(r => ({ id: r.id, name: r.name, score: r.currentScore, status: mapSkillStatus(r.currentScore) })),
    english: recommendations
      .filter(r => r.subject === 'English')
      .slice(0, 3)
      .map(r => ({ id: r.id, name: r.name, score: r.currentScore, status: mapSkillStatus(r.currentScore) })),
    science: recommendations
      .filter(r => r.subject === 'Science')
      .slice(0, 3)
      .map(r => ({ id: r.id, name: r.name, score: r.currentScore, status: mapSkillStatus(r.currentScore) })),
  }
}

function buildStrandsBySubject(strandBreakdown) {
  const result = { maths: [], english: [], science: [] }
  Object.entries(strandBreakdown || {}).forEach(([name, data]) => {
    const entry = { name, score: data.average }
    if (data.subject === 'Maths') result.maths.push(entry)
    else if (data.subject === 'English') result.english.push(entry)
    else if (data.subject === 'Science') result.science.push(entry)
  })
  return result
}

// ── Leaderboard row ─────────────────────────────────────────────────────────

function LeaderboardRow({ entry }) {
  const rankStyle =
    entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
    entry.rank === 2 ? 'bg-gray-100 text-gray-600' :
    entry.rank === 3 ? 'bg-orange-50 text-orange-600' :
    'bg-gray-50 text-gray-400'
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${entry.isCurrentStudent ? 'bg-electric/5 border border-electric/20' : 'hover:bg-gray-50'}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${rankStyle}`}>
        {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : entry.rank}
      </span>
      <span className="text-lg flex-shrink-0">{entry.avatar || '🦊'}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-semibold truncate block ${entry.isCurrentStudent ? 'text-electric' : 'text-navy'}`}>
          {entry.name}{entry.isCurrentStudent ? ' (You)' : ''}
        </span>
      </div>
      <span className="text-xs font-bold text-gray-500 flex-shrink-0">{(entry.xp || 0).toLocaleString()} Hero Points</span>
    </div>
  )
}

// ── Confetti ────────────────────────────────────────────────────────────────

function ConfettiParticle({ index, total }) {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#34D399', '#F472B6', '#60A5FA', '#FBBF24']
  const emojis = ['⭐', '🌟', '✨', '🎉', '🎊', '💫', '🏆', '❤️']
  const angle = (index / total) * 360
  const dist = 80 + Math.random() * 120
  const x = Math.cos((angle * Math.PI) / 180) * dist
  const y = Math.sin((angle * Math.PI) / 180) * dist
  const useEmoji = index % 3 === 0
  const delay = Math.random() * 0.3
  const size = 8 + Math.random() * 12
  return (
    <div className="absolute pointer-events-none" style={{ left: '50%', top: '50%', animation: `confetti-burst 0.8s ease-out ${delay}s forwards`, '--tx': `${x}px`, '--ty': `${y}px`, '--rot': `${Math.random() * 720}deg`, zIndex: 200 }}>
      {useEmoji ? <span style={{ fontSize: `${size + 4}px` }}>{emojis[index % emojis.length]}</span> : <div style={{ width: `${size}px`, height: `${size}px`, backgroundColor: colors[index % colors.length], borderRadius: index % 2 === 0 ? '50%' : '2px' }} />}
    </div>
  )
}

function CelebrationOverlay({ show }) {
  const [particles, setParticles] = useState([])
  useEffect(() => { if (show) setParticles(Array.from({ length: 30 }, (_, i) => i)) }, [show])
  if (!show) return null
  return <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">{particles.map(i => <ConfettiParticle key={i} index={i} total={particles.length} />)}</div>
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const router = useRouter()
  const { flags } = useFeatureFlags()
  const visibleSubjects = subjects.filter(s => !s.flag || flags[s.flag])

  // ── Data state ─────────────────────────────────────────────────────────────
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [skillsBySubject, setSkillsBySubject] = useState({ maths: [], english: [], science: [] })
  const [strandsBySubject, setStrandsBySubject] = useState({ maths: [], english: [], science: [] })
  // Raw recommendation objects ({ id, name, currentScore, difficulty, subject, ... }) — powers Hero Challenges.
  const [recommendations, setRecommendations] = useState([])
  const [weeklyActivity, setWeeklyActivity] = useState([])
  const [stats, setStats] = useState({ mastered: 0, inProgress: 0, accuracy: 0 })
  const [giftMilestone, setGiftMilestone] = useState({ target: 5, completed: 0, achieved: false })
  const [badges, setBadges] = useState(ALL_BADGES.map(b => ({ ...b, earned: false, earnedAt: null })))
  const [badgeCelebration, setBadgeCelebration] = useState([]) // queue of badge objects to toast
  const [streakToast, setStreakToast] = useState(null) // { message } or null
  const [streak, setStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeSubject, setActiveSubject] = useState('maths')

  // If the active subject gets hidden by a feature flag, fall back to Maths.
  useEffect(() => {
    if (!visibleSubjects.some(s => s.id === activeSubject)) {
      setActiveSubject('maths')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags])

  const [practiceModal, setPracticeModal] = useState(null)
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [answerState, setAnswerState] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)
  const [aiHint, setAiHint] = useState(null) // { text, source }
  const [showSteps, setShowSteps] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [totalXp, setTotalXp] = useState(0)
  const [coins, setCoins] = useState(0)
  const [showShop, setShowShop] = useState(false)
  const [shopOwnedItems, setShopOwnedItems] = useState(shopItems.filter(i => i.owned).map(i => i.id))
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState(0)
  const [leaderboard, setLeaderboard] = useState({ leaderboard: [], currentStudentRow: null, currentStudentRank: null, daysUntilReset: 0, lastChampion: null })
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [rightTab, setRightTab] = useState('progress')
  // Main bottom-nav tab (home / league / badges / profile).
  const [activeTab, setActiveTab] = useState('home')

  // Speed Round mode — null when inactive, else { count, total, startTime, correct, finished, elapsedSec }
  const [speedRound, setSpeedRound] = useState(null)

  const questionStartTimeRef = useRef(null)
  const [authStudentId, setAuthStudentId] = useState(STUDENT_ID)

  // Subscription plan (from parent, source of truth) — gates Premium features.
  const [studentPlan, setStudentPlan] = useState('free')

  // Live question timer (seconds), separate from the start-time ref above.
  const [questionTimer, setQuestionTimer] = useState(0)
  const timerRef = useRef(null)

  // Anti-cheat: when the student leaves the tab during a question, force a new question.
  const [cheatWarning, setCheatWarning] = useState(false)
  const [questionSwitched, setQuestionSwitched] = useState(false)

  // Ask Hero AI tutor panel state
  const [showAskHero, setShowAskHero] = useState(false)
  const [askHeroAttempts, setAskHeroAttempts] = useState(1)

  // Session feedback popup — fires every 5 completed sessions, max once per count
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)

  // Hero Missions category filter (null = show all)
  const [selectedCategory, setSelectedCategory] = useState(null)

  // Skill mastery exam — { skill, phase, questions?, timeLimit?, timeLeft?, currentIndex?, answers?, passMark?, result? }
  const [examModal, setExamModal] = useState(null)
  const examTimerRef = useRef(null)

  // AI nudge popup (rotates every 2 minutes)
  const [heroNudge, setHeroNudge] = useState(null)
  const nudgeTimerRef = useRef(null)
  const nudgeCountRef = useRef(0)

  // ── Fetch progress on mount ─────────────────────────────────────────────────
  useEffect(() => {
    async function initDashboard() {
      try {
        const res = await fetch('/api/auth/me')
        // /api/auth/me returns 401 for unauthenticated; treat that as the demo path.
        const auth = res.ok
          ? await res.json()
          : { authenticated: false }

        if (auth.authenticated && auth.user?.role === 'student' && auth.user?.userId) {
          setAuthStudentId(auth.user.userId)
          await fetchProgress(auth.user.userId)
          return
        }
        if (auth.authenticated && auth.user?.role === 'parent') {
          window.location.href = '/parent-dashboard'
          return
        }
        if (auth.authenticated && auth.user?.role === 'teacher') {
          window.location.href = '/teacher-dashboard'
          return
        }
        // Unauthenticated — keep marketing demo working.
        setAuthStudentId(STUDENT_ID)
        await fetchProgress(STUDENT_ID)
      } catch {
        setAuthStudentId(STUDENT_ID)
        await fetchProgress(STUDENT_ID)
      }
    }
    initDashboard()
  }, [])

  async function fetchProgress(studentId = authStudentId) {
    try {
      const res = await fetch(`/api/student/progress?studentId=${studentId}`)
      const data = await res.json()
      if (!res.ok) return

      // Subscription gate: if the parent's access is blocked, send to /subscribe.
      // Only applies to real authenticated students, never the marketing demo.
      if (studentId !== STUDENT_ID && data.student?.accessBlocked) {
        window.location.href = '/subscribe'
        return
      }

      setStudent(data.student)
      setStudentPlan(data.student.plan || 'free')
      setTotalXp(data.student.xp || 0)
      setCoins(data.student.coins || 0)
      setStreak(data.student.streak || 0)
      setLongestStreak(data.student.longestStreak || 0)
      setStats(data.stats || { mastered: 0, inProgress: 0, accuracy: 0 })
      setGiftMilestone(data.giftMilestone || { target: 5, completed: 0, achieved: false })
      setWeeklyActivity(data.weeklyActivity || [])
      // Maths-only — defence in depth (API already filters), drop any leaked e_/s_.
      const mathsRecs = (data.recommendations || []).filter(s => {
        const id = s.id || s.skillId || ''
        const subject = s.subject || ''
        return id.startsWith('m_') || subject === 'Maths' || subject === 'Mathematics'
      })
      setSkillsBySubject(groupRecommendationsBySubject(mathsRecs))
      setRecommendations(mathsRecs)
      setStrandsBySubject(buildStrandsBySubject(data.strandBreakdown || {}))

      // Merge real earned badges with the full badge definitions
      const earnedMap = {}
      ;(data.recentBadges || []).forEach(b => { earnedMap[b.badgeId] = b.earnedAt })
      setBadges(ALL_BADGES.map(b => ({ ...b, earned: !!earnedMap[b.id], earnedAt: earnedMap[b.id] ?? null })))
    } catch (e) {
      console.error('Failed to load progress:', e)
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch leaderboard ─────────────────────────────────────────────────────
  const fetchLeaderboard = async (tabIndex = activeLeaderboardTab) => {
    const tab = leaderboardTabs[tabIndex]
    const period = tab.period || 'monthly'
    setLeaderboardLoading(true)
    try {
      const res = await fetch(`/api/student/leaderboard?studentId=${authStudentId}&type=${tab.type}&period=${period}`)
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data)
      }
    } catch (e) {
      console.error('Leaderboard fetch failed:', e)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  useEffect(() => { fetchLeaderboard(activeLeaderboardTab) }, [activeLeaderboardTab])

  // Session feedback popup — show once per 5th-session boundary, never more
  // than once per count even if the dashboard remounts. localStorage stores
  // the last count we asked for so we don't pester the student again.
  useEffect(() => {
    const sessions = student?.sessions_completed
    if (!sessions || sessions <= 0 || sessions % 5 !== 0) return
    try {
      const key = `mmh_lastFeedbackAt_${authStudentId}`
      const lastAsked = parseInt(localStorage.getItem(key) || '0', 10)
      if (lastAsked === sessions) return
      const timer = setTimeout(() => {
        setShowFeedback(true)
        localStorage.setItem(key, String(sessions))
      }, 2000)
      return () => clearTimeout(timer)
    } catch {
      // localStorage blocked (private window) — silently skip the dedupe.
    }
  }, [student?.sessions_completed, authStudentId])

  async function submitFeedback() {
    if (feedbackSubmitting) return
    setFeedbackSubmitting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authStudentId,
          role: 'student',
          type: 'session',
          rating: feedbackRating,
          message: feedbackMsg.trim() || null,
          context: { page: 'student-dashboard', sessions: student?.sessions_completed },
          platform: 'web',
        }),
      })
    } catch {
      // Swallow — feedback is fire-and-forget; never show an error toast for it.
    } finally {
      setShowFeedback(false)
      setFeedbackRating(0)
      setFeedbackMsg('')
      setFeedbackSubmitting(false)
    }
  }

  // Hero AI nudge — rotate a motivational popup every 2 minutes while the tab is visible.
  useEffect(() => {
    if (!student || !recommendations?.length) return
    nudgeTimerRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        nudgeCountRef.current += 1
        const nudge = getHeroNudge(student, recommendations, stats)
        if (nudge) {
          setHeroNudge(nudge)
          setTimeout(() => setHeroNudge(null), 8000)
        }
      }
    }, 120000)
    return () => {
      if (nudgeTimerRef.current) {
        clearInterval(nudgeTimerRef.current)
        nudgeTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, recommendations.length, stats?.mastered])

  // ── Anti-cheat: tab/visibility switch during a live question ─────────────
  useEffect(() => {
    if (!practiceModal?.questionId || answerState) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCheatWarning(true)
        setQuestionSwitched(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [practiceModal?.questionId, answerState])

  // When the student comes back from a tab switch, swap in a fresh question for the same skill.
  useEffect(() => {
    if (!questionSwitched || !practiceModal?.skillId || answerState) return
    let cancelled = false
    ;(async () => {
      try {
        const grade = student?.grade ?? 3
        const currentQid = practiceModal.questionId
        const res = await fetch(`/api/student/questions?skillId=${practiceModal.skillId}&studentId=${authStudentId}&grade=${grade}&limit=10`)
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.questions?.length > 0) {
          // Prefer a question that differs from the current one
          const q = data.questions.find(
            x => (x.questionId || x.id) !== currentQid
          ) || data.questions[0]
          setPracticeModal(prev => prev ? ({
            ...prev,
            questionId: q.questionId || q.id,
            question: q.question,
            options: q.options,
            hint: q.hint,
            steps: q.steps,
          }) : prev)
          setShowHint(false)
          setAiHint(null)
          questionStartTimeRef.current = Date.now()
          if (timerRef.current) clearInterval(timerRef.current)
          setQuestionTimer(0)
          timerRef.current = setInterval(() => {
            setQuestionTimer(prev => prev + 1)
          }, 1000)
        }
      } finally {
        if (!cancelled) setQuestionSwitched(false)
      }
    })()
    return () => { cancelled = true }
  }, [questionSwitched, practiceModal?.skillId, answerState])

  // ── Dev panel handlers (only used when student.isDev) ─────────────────────
  const handleResetData = async () => {
    if (!authStudentId) return
    await fetch(`/api/admin/reset-student?studentId=${authStudentId}`, { method: 'POST' })
    await fetchProgress(authStudentId)
  }

  const handleSimulate10 = async () => {
    if (!authStudentId) return
    // Get one skill from current subject, then loop POST /api/student/answer
    try {
      const r = await fetch(`/api/student/recommendations?studentId=${authStudentId}`)
      const recs = await r.json()
      const skill = recs?.recommendations?.[0]
      if (!skill?.id) return
      const qr = await fetch(`/api/student/questions?skillId=${skill.id}&limit=1`)
      const qd = await qr.json()
      const q = qd?.questions?.[0]
      if (!q) return
      for (let i = 0; i < 10; i++) {
        await fetch('/api/student/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: authStudentId,
            skillId: skill.id,
            questionId: q.questionId || q.id,
            answer: q.options?.[0],
            timeTakenMs: 8000,
            hintUsed: false,
            difficulty: 0.5,
          }),
        })
      }
      await fetchProgress(authStudentId)
    } catch (e) { console.error('simulate failed:', e) }
  }

  const handleAwardAllBadges = async () => {
    if (!authStudentId) return
    await fetch(`/api/admin/award-all-badges?studentId=${authStudentId}`, { method: 'POST' })
    await fetchProgress(authStudentId)
  }

  const handleTriggerGift = async () => {
    if (!authStudentId) return
    await fetch(`/api/admin/trigger-quest?studentId=${authStudentId}`, { method: 'POST' })
    await fetchProgress(authStudentId)
  }

  // ── Open practice — fetch questions from API ───────────────────────────────
  const openPractice = async (skill, opts = {}) => {
    Analytics.skillStarted(skill?.id, skill?.name)
    setPracticeLoading(true)
    setAnswerState(null)
    setShowHint(false)
    setHintLoading(false)
    setAiHint(null)
    setShowSteps(false)
    setShowCelebration(false)
    // Initialise (or clear) Speed Round mode for this session.
    setSpeedRound(opts.speedRound
      ? { count: 0, total: 5, startTime: Date.now(), correct: 0, finished: false, elapsedSec: 0 }
      : null)

    const grade = student?.grade ?? 3

    try {
      // Pull a wider pool so questions vary (server randomizes + excludes mastered).
      const limit = opts.speedRound ? 5 : 10
      const res = await fetch(`/api/student/questions?skillId=${skill.id}&studentId=${authStudentId}&grade=${grade}&limit=${limit}`)
      const data = await res.json()

      if (!res.ok || !data.questions || data.questions.length === 0) {
        setPracticeModal({ skillId: skill.id, skillName: skill.name, empty: true })
        return
      }

      const q = data.questions[0]
      setPracticeModal({
        skillId: skill.id,
        skillName: opts.title || skill.name,
        questionId: q.questionId || q.id,
        question: q.question,
        options: q.options,
        hint: q.hint,
        steps: q.steps,
        speedRound: !!opts.speedRound,
      })
      questionStartTimeRef.current = Date.now()
      // Start the visible per-question timer
      if (timerRef.current) clearInterval(timerRef.current)
      setQuestionTimer(0)
      timerRef.current = setInterval(() => {
        setQuestionTimer(prev => prev + 1)
      }, 1000)
    } catch (e) {
      console.error('Failed to load question:', e)
    } finally {
      setPracticeLoading(false)
    }
  }

  // ── Handle answer — POST to API, get back correct/incorrect ───────────────
  const handleAnswer = async (optionIndex) => {
    if (answerState) return // already answered
    if (!practiceModal?.questionId) return
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    const selectedOption = practiceModal.options[optionIndex]
    setAnswerState({ selected: optionIndex, loading: true })

    try {
      const timeTakenMs = questionTimer > 0
        ? questionTimer * 1000
        : (questionStartTimeRef.current ? Date.now() - questionStartTimeRef.current : 15000)

      const res = await fetch('/api/student/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: authStudentId,
          skillId: practiceModal.skillId,
          questionId: practiceModal.questionId,
          answer: selectedOption,
          timeTakenMs,
          hintUsed: showHint,
          difficulty: 0.5,
        }),
      })
      const result = await res.json()

      Analytics.questionAnswered(!!result.correct, practiceModal.skillId, student?.grade)
      if (result.mastered) {
        Analytics.skillMastered(practiceModal.skillId, practiceModal.skillName, student?.grade)
      }

      const correctIndex = result.correctAnswer
        ? practiceModal.options.indexOf(result.correctAnswer)
        : -1

      setAnswerState({
        selected: optionIndex,
        loading: false,
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        correctIndex,
        delta: result.delta,
        xpGained: result.xpGained,
        coinsGained: result.coinsGained,
        scoreAfter: result.scoreAfter,
      })

      if (result.correct) {
        setShowCelebration(true)
        setTotalXp(prev => prev + (result.xpGained || 10))
        setCoins(prev => prev + (result.coinsGained || 5))
      }
      if (result.newBadges?.length) {
        setBadgeCelebration(result.newBadges)
        setBadges(prev => prev.map(b => {
          const earned = result.newBadges.find(nb => nb.id === b.id)
          return earned ? { ...b, earned: true, earnedAt: new Date().toISOString() } : b
        }))
      }
      if (result.streakUpdate?.changed) {
        const { streak: newStreak, extended, reset } = result.streakUpdate
        setStreak(newStreak)
        if (newStreak > longestStreak) setLongestStreak(newStreak)
        if (extended) {
          setStreakToast({ message: `🔥 Streak extended! ${newStreak} days in a row!` })
        } else if (reset) {
          setStreakToast({ message: `Streak reset. Start a new streak today! 💪` })
        }
        setTimeout(() => setStreakToast(null), 3500)
      }

      // ── Speed Round: auto-advance through 5 questions, then show the result ──
      if (speedRound && !speedRound.finished) {
        const newCount = speedRound.count + 1
        const newCorrect = speedRound.correct + (result.correct ? 1 : 0)
        if (newCount >= speedRound.total) {
          const elapsedSec = Math.max(1, Math.round((Date.now() - speedRound.startTime) / 1000))
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
          // Bonus reward for completing the speed round.
          setCoins(prev => prev + 5)
          setSpeedRound({ ...speedRound, count: newCount, correct: newCorrect, finished: true, elapsedSec })
        } else {
          setSpeedRound({ ...speedRound, count: newCount, correct: newCorrect })
          setTimeout(() => { handleNextQuestion() }, 1500)
        }
      }
    } catch (e) {
      console.error('Failed to submit answer:', e)
      setAnswerState({ selected: optionIndex, loading: false, correct: false, correctIndex: -1, delta: 0 })
    }
  }

  const closePractice = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setQuestionTimer(0)
    setCheatWarning(false)
    setQuestionSwitched(false)
    setPracticeModal(null)
    setAnswerState(null)
    setShowHint(false)
    setHintLoading(false)
    setAiHint(null)
    setShowSteps(false)
    setShowCelebration(false)
    setSpeedRound(null)
  }

  // Load the next question for the SAME skill without closing the modal.
  // Prefers a question different from the current one so it doesn't repeat.
  const handleNextQuestion = async () => {
    if (!practiceModal?.skillId) { closePractice(); return }
    const skillId = practiceModal.skillId
    const currentQid = practiceModal.questionId
    const grade = student?.grade ?? 3

    // Reset per-question UI state immediately.
    setAnswerState(null)
    setShowHint(false)
    setHintLoading(false)
    setAiHint(null)
    setShowSteps(false)
    setShowCelebration(false)

    try {
      const res = await fetch(`/api/student/questions?skillId=${skillId}&studentId=${authStudentId}&grade=${grade}&limit=10`)
      const data = await res.json()
      if (res.ok && data.questions?.length > 0) {
        const next = data.questions.find(q => (q.questionId || q.id) !== currentQid) || data.questions[0]
        setPracticeModal(prev => prev ? ({
          ...prev,
          questionId: next.questionId || next.id,
          question: next.question,
          options: next.options,
          hint: next.hint,
          steps: next.steps,
        }) : prev)
        // Restart the per-question timer.
        questionStartTimeRef.current = Date.now()
        if (timerRef.current) clearInterval(timerRef.current)
        setQuestionTimer(0)
        setCheatWarning(false)
        timerRef.current = setInterval(() => {
          setQuestionTimer(prev => prev + 1)
        }, 1000)
      }
    } catch {
      // On failure, leave the modal open with state reset so the student can retry.
    }
  }

  // ── Today's Hero Challenges — activity launchers ──────────────────────────
  // Lowest-scoring started skill (score > 0), used by the Weak Spot Trainer.
  const weakestSkill = recommendations
    .filter(s => (s.currentScore ?? 0) > 0)
    .sort((a, b) => (a.currentScore ?? 0) - (b.currentScore ?? 0))[0] || null

  function openDailyPuzzle() {
    // Pick the hardest recommended skill so the "puzzle" feels like a challenge.
    const hardSkill = [...recommendations].sort((a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0))[0]
    if (hardSkill) openPractice(hardSkill, { title: '🧩 Daily Puzzle', fallbackToSubject: true })
  }

  function openSpeedRound() {
    const skill = recommendations[0]
    if (skill) openPractice(skill, { speedRound: true, title: '⚡ Speed Round' })
  }

  function openHeroPick() {
    const skill = recommendations[0]
    if (skill) openPractice(skill)
  }

  function openWeakSpot() {
    if (weakestSkill) openPractice(weakestSkill)
  }

  const fetchHint = async () => {
    if (!practiceModal) return
    setHintLoading(true)
    setShowHint(true)
    try {
      const res = await fetch('/api/student/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: authStudentId,
          skillId: practiceModal.skillId,
          questionId: practiceModal.questionId,
          question: practiceModal.question,
          attemptNumber: 1,
          behaviour: 'unknown',
        }),
      })
      const data = await res.json()
      if (res.ok && data.hint) {
        setAiHint({ text: data.hint, source: data.source })
      } else {
        setAiHint({ text: practiceModal.hint || "Think carefully — you've got this!", source: 'fallback' })
      }
    } catch {
      setAiHint({ text: practiceModal.hint || "Think carefully — you've got this!", source: 'fallback' })
    } finally {
      setHintLoading(false)
    }
  }

  // Click a category card. If recommendations include a skill in that
  // category, just filter the list. If not, open practice on the most
  // age-appropriate skill from SKILL_ID_MAP so the student isn't stuck on a
  // "tap to start" dead end.
  function handleCategoryClick(categoryKey) {
    setSelectedCategory(categoryKey)

    const catSkills = recommendations.filter(s => {
      const info = getSkillInfo(s.id || s.skillId)
      return info && info.category === categoryKey
    })

    if (catSkills.length > 0) return

    const matchingSkillIds = Object.entries(SKILL_ID_MAP)
      .filter(([, data]) => data.category === categoryKey)
      .map(([id]) => id)

    if (matchingSkillIds.length === 0) return

    // Prefer a skill at the student's grade; otherwise grab any.
    const gradePrefix = `m_${student?.grade || 3}_`
    const gradeSkill = matchingSkillIds.find(id => id.startsWith(gradePrefix))
      || matchingSkillIds[0]

    const info = getSkillInfo(gradeSkill)
    if (!info) return

    openPractice({
      id: gradeSkill,
      skillId: gradeSkill,
      name: info.name,
      currentScore: 0,
      mastered: false,
    })
  }

  // ── Skill Mastery Exam ────────────────────────────────────────────────────
  function openSkillExam(skill) {
    Analytics.examStarted(skill?.id || skill?.skillId)
    setExamModal({ skill, phase: 'loading' })
    fetchExamQuestions(skill)
  }

  async function fetchExamQuestions(skill) {
    try {
      const skillId = skill.id || skill.skillId
      const res = await fetch(
        `/api/student/skill-exam?skillId=${encodeURIComponent(skillId)}&studentId=${encodeURIComponent(authStudentId)}`
      )
      const data = await res.json()
      if (!data.eligible) {
        setExamModal(null)
        setStreakToast({
          message: `Practice more to unlock the ${getSkillInfo(skillId)?.name || 'this'} exam! Score needed: 70+`,
        })
        setTimeout(() => setStreakToast(null), 4000)
        return
      }
      setExamModal({
        skill,
        questions: data.questions,
        timeLimit: data.timeLimit,
        timeLeft: data.timeLimit,
        currentIndex: 0,
        answers: [],
        phase: 'intro',
        passMark: data.passMark,
      })
    } catch {
      setExamModal(null)
    }
  }

  function startExamTimer() {
    if (examTimerRef.current) clearInterval(examTimerRef.current)
    examTimerRef.current = setInterval(() => {
      setExamModal(prev => {
        if (!prev || prev.phase !== 'exam') {
          clearInterval(examTimerRef.current)
          return prev
        }
        if (prev.timeLeft <= 1) {
          clearInterval(examTimerRef.current)
          // Submit on next tick to avoid setState-in-setState.
          setTimeout(() => submitExam(prev.answers, prev), 0)
          return { ...prev, timeLeft: 0 }
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 }
      })
    }, 1000)
  }

  async function submitExam(answers, snapshot) {
    if (examTimerRef.current) {
      clearInterval(examTimerRef.current)
      examTimerRef.current = null
    }
    const current = snapshot || examModal
    if (!current) return
    setExamModal(prev => prev ? ({ ...prev, phase: 'loading' }) : prev)
    try {
      const res = await fetch('/api/student/skill-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: authStudentId,
          skillId: current.skill.id || current.skill.skillId,
          answers,
          totalQuestions: current.questions?.length || answers.length,
          timeTakenSeconds: (current.timeLimit || 300) - (current.timeLeft || 0),
        }),
      })
      const result = await res.json()
      setExamModal(prev => prev ? ({ ...prev, phase: 'result', result }) : prev)
      const examSkillId = current.skill.id || current.skill.skillId
      if (result?.passed) {
        Analytics.examPassed(examSkillId, result.score)
        setTotalXp(prev => prev + (result.xpEarned || 50))
        setCoins(prev => prev + (result.coinsEarned || 20))
      } else if (typeof result?.score === 'number') {
        Analytics.examFailed(examSkillId, result.score)
      }
    } catch {
      setExamModal(null)
    }
  }

  // ── AI Hero Nudge ─────────────────────────────────────────────────────────
  function getHeroNudge(currentStudent, recs, currentStats) {
    const nudges = []
    if (recs?.length > 0) {
      const sorted = [...recs].sort((a, b) => (a.currentScore || 0) - (b.currentScore || 0))
      const weakest = sorted[0]
      const strongest = sorted[sorted.length - 1]

      if (weakest) {
        const info = getSkillInfo(weakest.id || weakest.skillId)
        if (info) {
          nudges.push({
            emoji: '🎯',
            title: 'Weak Spot Alert!',
            message: `Your ${info.name} needs work (score: ${Math.round(weakest.currentScore || 0)}/100). Let's improve it now!`,
            action: 'Practice Now',
            skill: weakest,
            color: '#FEF3C7',
            borderColor: '#F59E0B',
          })
        }
      }
      // Exam nudge is Premium-only — Skill Mastery Exams are gated.
      const readyForExam = studentPlan === 'premium'
        ? recs.find(s => (s.currentScore || 0) >= 70 && !s.mastered)
        : null
      if (readyForExam) {
        const info = getSkillInfo(readyForExam.id || readyForExam.skillId)
        if (info) {
          nudges.push({
            emoji: '🏆',
            title: 'Ready for Mastery Exam!',
            message: `You've scored ${Math.round(readyForExam.currentScore)}/100 in ${info.name}. Take the mastery exam to level up!`,
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
            message: `Amazing work on ${info.name}! You're at ${Math.round(strongest.currentScore)}/100. Keep it up Hero!`,
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
        message: `You're on a ${currentStudent.streak}-day learning streak! Don't break it — practice at least one skill today!`,
        action: 'Practice Now',
        skill: recs?.[0],
        color: '#FFF7ED',
        borderColor: '#EA580C',
      })
    }
    nudges.push({
      emoji: '🤖',
      title: 'Hero says...',
      message: `You've answered ${currentStats?.totalQuestions || 0} questions total! Every question makes you smarter. Keep going! 💪`,
      action: "Let's Go!",
      skill: recs?.[0],
      color: '#F5F3FF',
      borderColor: '#7C3AED',
    })
    return nudges.length > 0 ? nudges[nudgeCountRef.current % nudges.length] : null
  }

  const buyItem = (item) => {
    if (coins >= item.cost && !shopOwnedItems.includes(item.id)) {
      setCoins(prev => prev - item.cost)
      setShopOwnedItems(prev => [...prev, item.id])
    }
  }

  const showResult = answerState && !answerState.loading

  const currentSkills = skillsBySubject[activeSubject] || []
  const currentSubject = subjects.find(s => s.id === activeSubject)
  const currentStrands = strandsBySubject[activeSubject] || []
  const level = student?.level || 1
  const levelProgress = ((totalXp % 500) / 500) * 100

  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const daysUntilReset = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24))

  // Weekly chart data from API
  const weeklyChartData = weeklyActivity.length > 0
    ? weeklyActivity.map(a => ({ d: a.day.charAt(0), v: a.questions }))
    : [{ d: 'M', v: 0 }, { d: 'T', v: 0 }, { d: 'W', v: 0 }, { d: 'T', v: 0 }, { d: 'F', v: 0 }, { d: 'S', v: 0 }, { d: 'S', v: 0 }]
  const maxWeeklyV = Math.max(...weeklyChartData.map(d => d.v), 1)

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F0F4F8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <img
          src="/assets/logos/logo-icon.png"
          alt="MyMathsHero"
          style={{ width: 80, animation: 'pulse 1.5s infinite' }}
        />
        <p style={{ color: '#1B2B4B', fontWeight: 600 }}>Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <style jsx global>{`
        @keyframes confetti-burst { 0% { transform: translate(-50%,-50%) scale(0) rotate(0deg); opacity: 1; } 100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(var(--rot)); opacity: 0; } }
        @keyframes celebrate-bounce { 0%,100% { transform: scale(1); } 30% { transform: scale(1.3); } 60% { transform: scale(0.95); } }
        @keyframes xp-float { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
        @keyframes pop-in { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .celebrate-bounce { animation: celebrate-bounce 0.6s ease-in-out; }
        .xp-float { animation: xp-float 1.5s ease-out forwards; }
        .pop-in { animation: pop-in 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
        .shimmer-bg { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); background-size: 200% 100%; animation: shimmer 2s infinite; }
      `}</style>

      {/* A) Sticky top header bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#1B2B4B',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}>
        <img src="/assets/logos/logo-icon.png"
          style={{ height: 36 }} alt="MyMathsHero" />
        <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0 }}>
            {student?.name?.split(' ')[0] || 'Hero'}&apos;s Hero HQ
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <p style={{ color: '#C49A1A', fontSize: 11, margin: 0 }}>Level {level} Hero</p>
            {/* Plan badge — shows the student their current plan */}
            <span style={{
              background: studentPlan === 'premium' ? '#1B2B4B' : '#F0F4F8',
              color: studentPlan === 'premium' ? '#C49A1A' : '#94A3B8',
              border: studentPlan === 'premium' ? '1px solid #C49A1A' : '1px solid #E2E8F0',
              borderRadius: 10, padding: '3px 10px',
              fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
            }}>
              {studentPlan === 'premium' ? '⭐ Premium' : '📚 Standard'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Coin counter — preserved as a button so it opens the shop */}
          <button
            onClick={() => setShowShop(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'center' }}
            title="Open Avatar Shop"
          >
            <p style={{ color: '#C49A1A', fontWeight: 800, fontSize: 14, margin: 0 }}>
              🪙 {coins}
            </p>
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#FF6B35', fontWeight: 800, fontSize: 14, margin: 0 }}>
              🔥 {streak}
            </p>
          </div>
          {/* Avatar customisation — preserve existing affordance */}
          <button
            onClick={() => router.push('/avatar-customisation')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            title="Customise Avatar"
          >
            <Sparkles size={18} color="#C49A1A" />
          </button>
        </div>
      </div>

      {/* B) Hero stats bar */}
      <div style={{
        background: 'linear-gradient(135deg, #1B2B4B 0%, #2D4A7A 100%)',
        padding: '16px 20px',
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
      }}>
        {[
          { label: 'Hero Points', value: (totalXp || 0).toLocaleString(), emoji: '⚡' },
          { label: 'Mastered', value: stats?.mastered ?? 0, emoji: '🏆' },
          { label: 'Accuracy', value: `${stats?.accuracy ?? 0}%`, emoji: '🎯' },
          { label: 'Sessions', value: student?.sessions_completed ?? 0, emoji: '📚' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '10px 16px',
            minWidth: 90,
            textAlign: 'center',
            border: '1px solid rgba(196,154,26,0.3)',
            flexShrink: 0,
          }}>
            <p style={{ fontSize: 20, margin: '0 0 2px' }}>{s.emoji}</p>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>{s.value}</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* C) Subject tabs (only renders on Home) */}
      {activeTab === 'home' && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '16px 20px 8px',
          background: 'white',
          borderBottom: '1px solid #E2E8F0',
          overflowX: 'auto',
        }}>
          {visibleSubjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => setActiveSubject(sub.id)}
              style={{
                background: activeSubject === sub.id ? '#1B2B4B' : '#F0F4F8',
                color: activeSubject === sub.id ? 'white' : '#64748B',
                border: 'none',
                borderRadius: 20,
                padding: '8px 20px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              {sub.emoji} {sub.name}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'home' && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ paddingBottom: 96 }}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <div className="w-full lg:w-56 flex-shrink-0">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">🎮 Subjects</h3>
            <div className="space-y-2">
              {visibleSubjects.map(sub => (
                <button key={sub.id} onClick={() => setActiveSubject(sub.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSubject === sub.id ? `bg-gradient-to-r ${sub.gradient} text-white shadow-lg` : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-gray-200'}`}>
                  <span className="text-xl">{sub.emoji}</span>{sub.name}{activeSubject === sub.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              ))}
            </div>
            {/* Feature 7: Milestone Card */}
            <div className="mt-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border-2 border-amber-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2"><Gift size={18} className="text-[#C49A1A]" /><span className="font-bold text-[#1B2B4B] text-sm">Hero Quest!</span></div>
              <p className="text-xs text-[#1B2B4B] mb-3">Complete 5 Hero Missions to earn a surprise! 🎁</p>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-3 bg-amber-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all" style={{ width: `${(giftMilestone.completed / giftMilestone.target) * 100}%` }} /></div>
                <span className="text-xs font-bold text-amber-700">{giftMilestone.completed}/{giftMilestone.target}</span>
              </div>
              {giftMilestone.achieved ? (
                <>
                  <div className="flex justify-center mt-2">
                    <RoboVideo src="/assets/robot/flyrunrobo.MP4" width={180} loop={false} />
                  </div>
                  <p className="text-center text-xs font-bold text-amber-700 mt-1">You did it!</p>
                  <button onClick={() => setShowMilestoneModal(true)} className="w-full mt-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white py-2 rounded-xl text-xs font-bold">🎉 Claim Reward!</button>
                </>
              ) : (
                <p className="text-[10px] text-amber-600 mt-1">{giftMilestone.target - giftMilestone.completed} more sessions to go!</p>
              )}
            </div>
            {/* Level card */}
            <div className="mt-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2"><Rocket size={16} /><span className="font-bold text-sm">Level {level}</span></div>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mb-1.5"><div className="h-full bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full shimmer-bg" style={{ width: `${levelProgress}%` }} /></div>
              <p className="text-[10px] text-white/70">{500 - (totalXp % 500)} Hero Points to Level {level + 1}</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* === HERO MISSIONS SECTION === */}
            <div style={{
              background: 'white',
              borderRadius: 20,
              padding: 24,
              border: '1px solid #E2E8F0',
              marginBottom: 24,
            }}>
              {/* Section header */}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800,
                    color: '#1B2B4B', margin: '0 0 4px' }}>
                    Hero Missions ✦
                  </h2>
                  <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
                    AI-selected skills personalised for you
                  </p>
                </div>
                <select
                  value={selectedCategory || 'all'}
                  onChange={e => setSelectedCategory(
                    e.target.value === 'all' ? null : e.target.value
                  )}
                  style={{
                    border: '1px solid #E2E8F0', borderRadius: 8,
                    padding: '6px 12px', fontSize: 13,
                    color: '#1B2B4B', background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Categories</option>
                  {Object.entries(SKILL_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.emoji} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recommended skills (AI-selected) */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: 12 }}>
                  🤖 Recommended for you
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recommendations
                    .filter(skill => getSkillInfo(skill.id || skill.skillId) !== null)
                    .filter(skill => {
                      if (!selectedCategory) return true
                      const info = getSkillInfo(skill.id || skill.skillId)
                      return info && info.category === selectedCategory
                    })
                    .slice(0, 5)
                    .map((skill, i) => {
                      const info = getSkillInfo(skill.id || skill.skillId)
                      if (!info) return null
                      const score = Math.round(skill.currentScore || 0)
                      const isReady = score >= 70

                      return (
                        <div key={skill.id || i} style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 16px', borderRadius: 14,
                          border: `1px solid ${info.lightColor}`,
                          background: info.lightColor,
                          cursor: 'pointer',
                        }}
                        onClick={() => openPractice(skill)}
                        >
                          {/* Category icon */}
                          <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: info.color, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 22, flexShrink: 0,
                          }}>
                            {info.emoji}
                          </div>

                          {/* Skill info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex',
                              alignItems: 'center', gap: 8,
                              marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700,
                                color: '#1B2B4B', fontSize: 15 }}>
                                {info.name}
                              </span>
                              <span style={{
                                background: info.color, color: 'white',
                                fontSize: 10, fontWeight: 700,
                                padding: '2px 8px', borderRadius: 10,
                              }}>
                                {info.categoryLabel}
                              </span>
                              {skill.mastered && (
                                <span style={{ fontSize: 14 }}>✅</span>
                              )}
                            </div>
                            <div style={{ height: 6,
                              background: 'rgba(0,0,0,0.08)',
                              borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 3,
                                width: `${score}%`,
                                background: score >= 80 ? '#22C55E'
                                  : score >= 50 ? info.color : '#E2E8F0',
                                transition: 'width 0.5s ease',
                              }} />
                            </div>
                          </div>

                          {/* Score */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 800,
                              color: info.color }}>{score}</div>
                            <div style={{ fontSize: 10, color: '#94A3B8' }}>
                              /100
                            </div>
                          </div>

                          {/* Exam unlock button — Premium only */}
                          {isReady && !skill.mastered && (
                            studentPlan === 'premium' ? (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  openSkillExam(skill)
                                }}
                                style={{
                                  background: '#1B2B4B', color: '#C49A1A',
                                  border: '2px solid #C49A1A',
                                  borderRadius: 10, padding: '6px 12px',
                                  fontSize: 12, fontWeight: 700,
                                  cursor: 'pointer', whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                🏆 Take Exam!
                              </button>
                            ) : (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  window.location.href = '/subscribe'
                                }}
                                style={{
                                  background: '#F0F4F8',
                                  border: '1px dashed #CBD5E1',
                                  borderRadius: 12, padding: '6px 12px',
                                  color: '#94A3B8', fontWeight: 600,
                                  fontSize: 12, cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  whiteSpace: 'nowrap', flexShrink: 0,
                                }}
                              >
                                🏆 Mastery Exam
                                <span style={{
                                  background: '#E2E8F0', color: '#94A3B8',
                                  borderRadius: 8, padding: '2px 8px',
                                  fontSize: 10, fontWeight: 800,
                                }}>
                                  PREMIUM
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      )
                    })}
                  {recommendations.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 24,
                      color: '#94A3B8', fontSize: 13 }}>
                      <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>🎉</span>
                      You&apos;ve mastered all available skills for now!
                    </div>
                  )}
                </div>
              </div>

              {/* ALL CATEGORIES BROWSER */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: 14 }}>
                  📚 All Maths Categories
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 10,
                }}>
                  {Object.entries(SKILL_CATEGORIES).map(([key, cat]) => {
                    const catSkills = recommendations.filter(s => {
                      const info = getSkillInfo(s.id || s.skillId)
                      return info?.category === key
                    })
                    const avgScore = catSkills.length > 0
                      ? Math.round(catSkills.reduce(
                          (sum, s) => sum + (s.currentScore || 0), 0
                        ) / catSkills.length)
                      : 0
                    const masteredCount = catSkills.filter(s => s.mastered).length

                    return (
                      <div
                        key={key}
                        onClick={() => handleCategoryClick(key)}
                        style={{
                          background: selectedCategory === key
                            ? cat.lightColor : 'white',
                          border: `2px solid ${selectedCategory === key
                            ? cat.color : '#E2E8F0'}`,
                          borderRadius: 14, padding: 14,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 28, marginBottom: 6 }}>
                          {cat.emoji}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700,
                          color: '#1B2B4B', marginBottom: 4 }}>
                          {cat.label}
                        </div>
                        {catSkills.length > 0 ? (
                          <>
                            <div style={{ height: 4, background: '#F0F4F8',
                              borderRadius: 2, overflow: 'hidden',
                              marginBottom: 4 }}>
                              <div style={{
                                height: '100%', width: `${avgScore}%`,
                                background: cat.color, borderRadius: 2,
                              }} />
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>
                              {masteredCount}/{catSkills.length} mastered
                            </div>
                          </>
                        ) : (
                          <div style={{
                            fontSize: 11, color: '#C49A1A',
                            fontWeight: 700, marginTop: 4,
                          }}>
                            Tap to start →
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Today's Hero Challenges */}
            {recommendations.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-navy mb-1">Today&apos;s Hero Challenges</h2>
                <p className="text-sm text-gray-500 mb-4">Special activities to keep learning fun</p>

                {/* A) Daily Maths Puzzle */}
                <div style={{
                  background: 'linear-gradient(135deg, #1B2B4B, #2D4A7A)',
                  borderRadius: 16, padding: 20,
                  border: '2px solid #C49A1A',
                  marginBottom: 12, cursor: 'pointer',
                }} onClick={openDailyPuzzle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 32 }}>🧩</span>
                    <div>
                      <p style={{ color: '#C49A1A', fontWeight: 800, fontSize: 16, margin: 0 }}>Daily Maths Puzzle</p>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>New puzzle every day — can you solve it?</p>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#C49A1A', fontSize: 20 }}>→</span>
                  </div>
                </div>

                {/* B) Speed Round */}
                <div style={{
                  background: 'white', borderRadius: 16, padding: 20,
                  border: '2px solid #E2E8F0', marginBottom: 12, cursor: 'pointer',
                }} onClick={openSpeedRound}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 32 }}>⚡</span>
                    <div>
                      <p style={{ color: '#1B2B4B', fontWeight: 800, fontSize: 16, margin: 0 }}>Speed Round</p>
                      <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>5 questions — beat your best time!</p>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#C49A1A', fontSize: 20 }}>→</span>
                  </div>
                </div>

                {/* C) Hero's Pick */}
                <div style={{
                  background: '#FFFBEB', borderRadius: 16, padding: 20,
                  border: '2px solid #C49A1A', marginBottom: 12, cursor: 'pointer',
                }} onClick={openHeroPick}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 32 }}>🤖</span>
                    <div>
                      <p style={{ color: '#1B2B4B', fontWeight: 800, fontSize: 16, margin: 0 }}>Hero&apos;s Pick</p>
                      <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>Hero thinks you should practise this today</p>
                      <p style={{ color: '#C49A1A', fontSize: 12, fontWeight: 700, margin: 0 }}>{recommendations[0]?.name || 'Loading...'}</p>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#C49A1A', fontSize: 20 }}>→</span>
                  </div>
                </div>

                {/* D) Weak Spot Trainer */}
                {weakestSkill && (
                  <div style={{
                    background: 'white', borderRadius: 16, padding: 20,
                    border: '2px solid #E2E8F0', marginBottom: 12, cursor: 'pointer',
                  }} onClick={openWeakSpot}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 32 }}>🎯</span>
                      <div>
                        <p style={{ color: '#1B2B4B', fontWeight: 800, fontSize: 16, margin: 0 }}>Weak Spot Trainer</p>
                        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>Level up your weakest skill</p>
                        <p style={{ color: '#EF4444', fontSize: 12, fontWeight: 700, margin: 0 }}>
                          {weakestSkill.name} — Score: {Math.round(weakestSkill.currentScore)}/100
                        </p>
                      </div>
                      <span style={{ marginLeft: 'auto', color: '#C49A1A', fontSize: 20 }}>→</span>
                    </div>
                  </div>
                )}

                {/* HERO VOUCHERS */}
                <div
                  onClick={() => router.push('/vouchers')}
                  style={{
                    background: 'linear-gradient(135deg, #1B2B4B, #2D4A7A)',
                    border: '2px solid #C49A1A',
                    borderRadius: 16, padding: 20,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 32 }}>🎟️</span>
                    <div>
                      <p style={{ color: '#C49A1A', fontWeight: 800, fontSize: 16, margin: 0 }}>Hero Vouchers</p>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>Redeem points for Hero Arcade Credits</p>
                      <p style={{ color: '#C49A1A', fontSize: 12, fontWeight: 700, margin: 0 }}>
                        ⚡ {(totalXp || 0).toLocaleString()} pts available
                      </p>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#C49A1A', fontSize: 20 }}>→</span>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Missions */}
            <div className="bg-white rounded-2xl p-5 border-2 border-dashed border-electric/30 shadow-sm mb-6">
              <h3 className="font-bold text-navy text-sm mb-3">🎯 Today&apos;s Missions</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {todaysGoals.map((goal, i) => (
                  <div key={i} className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-xl border-2 ${goal.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <span className="text-2xl">{goal.emoji}</span>
                    <div className="flex-1"><span className={`text-xs font-bold ${goal.completed ? 'text-green-700 line-through' : 'text-gray-700'}`}>{goal.text}</span><div className={`text-[10px] font-semibold ${goal.completed ? 'text-green-500' : 'text-gray-400'}`}>{goal.reward}</div></div>
                    {goal.completed && <span className="text-lg">✅</span>}
                  </div>
                ))}
              </div>
            </div>
            {/* Leaderboard */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                  <Trophy size={16} className="text-[#C49A1A]" />
                  {leaderboardTabs[activeLeaderboardTab]?.period === 'alltime' ? 'All-Time Hero League' : 'Monthly Hero League'}
                </h3>
                {leaderboardTabs[activeLeaderboardTab]?.period !== 'alltime' && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Clock size={12} />
                    <span>Resets in {leaderboard.daysUntilReset}d</span>
                  </div>
                )}
              </div>

              {/* Last month's champion */}
              {leaderboard.lastChampion && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                  <span className="text-base">{leaderboard.lastChampion.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-amber-700">Last Month's Champion 🏆</span>
                    <p className="text-xs text-amber-800 font-semibold truncate">{leaderboard.lastChampion.name}</p>
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold">{leaderboard.lastChampion.xp.toLocaleString()} Hero Points</span>
                </div>
              )}

              {/* Tab switcher */}
              <div className="flex gap-1 mb-4 overflow-x-auto">
                {leaderboardTabs.map((tab, i) => (
                  <button key={i} onClick={() => setActiveLeaderboardTab(i)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${activeLeaderboardTab === i ? 'bg-electric text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Current student rank pill */}
              {leaderboard.currentStudentRank && (
                <div className="text-center text-[11px] text-gray-400 mb-3">
                  Your rank: <span className="font-bold text-electric">#{leaderboard.currentStudentRank}</span>
                  {leaderboard.totalInCohort ? ` of ${leaderboard.totalInCohort}` : ''}
                </div>
              )}

              {/* Rows */}
              {leaderboardLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-electric border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.currentStudentRank && leaderboard.currentStudentRank <= 3 && (
                    <div className="flex justify-center mb-2">
                      <img
                        src="/assets/robot/HeroEnjoying.png"
                        alt="Hero celebrating"
                        style={{ width: 100, mixBlendMode: 'multiply' }}
                      />
                    </div>
                  )}
                  {leaderboard.leaderboard.map((entry, i) => (
                    <LeaderboardRow key={i} entry={entry} />
                  ))}

                  {/* Gap indicator if current student is out of top 10 */}
                  {leaderboard.currentStudentRow && (
                    <>
                      <div className="text-center text-[10px] text-gray-300 py-1">• • •</div>
                      <LeaderboardRow entry={leaderboard.currentStudentRow} />
                    </>
                  )}

                  {leaderboard.leaderboard.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">No activity this month yet. Start practising!</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-5">
            {/* Tab switcher */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[{id:'progress',label:'📊 Progress'},{id:'strands',label:'📈 Strands'},{id:'badges',label:'🏅 Hero Badges'}].map(t => (
                <button key={t.id} onClick={() => setRightTab(t.id)} className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${rightTab === t.id ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}>{t.label}</button>
              ))}
            </div>

            {rightTab === 'progress' && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-navy text-sm mb-4">My Progress</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200"><div className="text-2xl font-extrabold text-green-600">{stats.mastered}</div><div className="text-[10px] text-green-600 font-bold">Mastered 🏆</div></div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200"><div className="text-2xl font-extrabold text-blue-600">{stats.inProgress}</div><div className="text-[10px] text-blue-600 font-bold">In Progress 📈</div></div>
                </div>
                <div className="flex gap-3 mb-5">
                  <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
                    <div className="text-2xl font-extrabold text-orange-500">{streak}</div>
                    <div className="text-[10px] text-orange-500 font-bold">Current 🔥</div>
                  </div>
                  <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center border border-amber-200">
                    <div className="text-2xl font-extrabold text-amber-600">{longestStreak}</div>
                    <div className="text-[10px] text-amber-600 font-bold">Best streak ⚡</div>
                  </div>
                </div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">🗓️ This Week</h4>
                <div className="flex items-end justify-between gap-1.5 h-20">
                  {weeklyChartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className={`w-full rounded-lg min-h-[4px] ${d.v >= 10 ? 'bg-gradient-to-t from-green-400 to-emerald-300' : d.v >= 5 ? 'bg-gradient-to-t from-amber-400 to-yellow-300' : d.v > 0 ? 'bg-gradient-to-t from-blue-300 to-blue-200' : 'bg-gray-200'}`} style={{ height: `${(d.v / maxWeeklyV) * 55}px` }} />
                      <span className="text-[9px] font-bold text-gray-400">{d.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feature 5: Strand Breakdown */}
            {rightTab === 'strands' && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-navy text-sm mb-1">{currentSubject?.emoji} {currentSubject?.name} Strands</h3>
                <p className="text-[10px] text-gray-400 mb-4">Detailed skill breakdown</p>
                {currentStrands.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No strand data yet — start practising!</p>
                ) : (
                  <div className="space-y-3">
                    {currentStrands.map((strand, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{strand.name}</span>
                          <span className={`text-[11px] font-bold ${strand.score >= 70 ? 'text-green-600' : strand.score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{strand.score}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${strand.score >= 70 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : strand.score >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`} style={{ width: `${strand.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {rightTab === 'badges' && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-navy text-sm">🏅 Hero Badges</h3>
                  <span className="text-xs text-gray-400">{badges.filter(b => b.earned).length}/{badges.length} earned</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {badges.map((badge) => (
                    <div key={badge.id} className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${badge.earned ? 'hover:scale-105 cursor-default' : 'opacity-40 grayscale'}`}>
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-1.5 shadow-md ${badge.earned ? `bg-gradient-to-br ${badge.color} ring-2 ring-white border border-[#C49A1A]` : 'bg-gray-200'}`}>
                        {badge.earned ? badge.emoji : '🔒'}
                      </div>
                      <span className="text-[10px] font-bold text-navy leading-tight">{badge.name}</span>
                      {badge.earned && badge.earnedAt
                        ? <span className="text-[8px] text-emerald-500 mt-0.5">{new Date(badge.earnedAt).toLocaleDateString('en-AU', { day:'numeric', month:'short' })}</span>
                        : <span className="text-[8px] text-gray-400 mt-0.5 leading-tight">{badge.description}</span>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* League tab — focused leaderboard view */}
      {activeTab === 'league' && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 96px' }}>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy text-base flex items-center gap-2">
                <Trophy size={18} className="text-[#C49A1A]" />
                {leaderboardTabs[activeLeaderboardTab]?.period === 'alltime' ? 'All-Time Hero League' : 'Monthly Hero League'}
              </h3>
              {leaderboardTabs[activeLeaderboardTab]?.period !== 'alltime' && (
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <Clock size={12} />
                  <span>Resets in {leaderboard.daysUntilReset}d</span>
                </div>
              )}
            </div>

            {leaderboard.lastChampion && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                <span className="text-base">{leaderboard.lastChampion.avatar}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-amber-700">Last Month&apos;s Champion 🏆</span>
                  <p className="text-xs text-amber-800 font-semibold truncate">{leaderboard.lastChampion.name}</p>
                </div>
                <span className="text-[10px] text-amber-600 font-bold">{leaderboard.lastChampion.xp.toLocaleString()} Hero Points</span>
              </div>
            )}

            <div className="flex gap-1 mb-4 overflow-x-auto">
              {leaderboardTabs.map((tab, i) => (
                <button key={i} onClick={() => setActiveLeaderboardTab(i)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${activeLeaderboardTab === i ? 'bg-electric text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {leaderboard.currentStudentRank && (
              <div className="text-center text-[11px] text-gray-400 mb-3">
                Your rank: <span className="font-bold text-electric">#{leaderboard.currentStudentRank}</span>
                {leaderboard.totalInCohort ? ` of ${leaderboard.totalInCohort}` : ''}
              </div>
            )}

            {leaderboardLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-electric border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.currentStudentRank && leaderboard.currentStudentRank <= 3 && (
                  <div className="flex justify-center mb-2">
                    <img src="/assets/robot/HeroEnjoying.png" alt="Hero celebrating" style={{ width: 100, mixBlendMode: 'multiply' }} />
                  </div>
                )}
                {leaderboard.leaderboard.map((entry, i) => (
                  <LeaderboardRow key={i} entry={entry} />
                ))}
                {leaderboard.currentStudentRow && (
                  <>
                    <div className="text-center text-[10px] text-gray-300 py-1">• • •</div>
                    <LeaderboardRow entry={leaderboard.currentStudentRow} />
                  </>
                )}
                {leaderboard.leaderboard.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">No activity this month yet. Start practising!</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Badges tab — focused badge grid */}
      {activeTab === 'badges' && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 96px' }}>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy text-base">🏅 Hero Badges</h3>
              <span className="text-xs text-gray-400">{badges.filter(b => b.earned).length}/{badges.length} earned</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {badges.map((badge) => (
                <div key={badge.id} className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${badge.earned ? 'hover:scale-105 cursor-default' : 'opacity-40 grayscale'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-1.5 shadow-md ${badge.earned ? `bg-gradient-to-br ${badge.color} ring-2 ring-white border border-[#C49A1A]` : 'bg-gray-200'}`}>
                    {badge.earned ? badge.emoji : '🔒'}
                  </div>
                  <span className="text-[11px] font-bold text-navy leading-tight">{badge.name}</span>
                  {badge.earned && badge.earnedAt
                    ? <span className="text-[9px] text-emerald-500 mt-0.5">{new Date(badge.earnedAt).toLocaleDateString('en-AU', { day:'numeric', month:'short' })}</span>
                    : <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">{badge.description}</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile tab — student info + logout */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 96px' }}>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm" style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: '#FFFBEB', border: '3px solid #C49A1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 56, margin: '0 auto 16px',
            }}>{student?.avatar || '🦊'}</div>
            <h2 style={{ color: '#1B2B4B', fontWeight: 800, fontSize: 22, margin: '0 0 4px' }}>
              {student?.name || 'Hero'}
            </h2>
            <p style={{ color: '#C49A1A', fontWeight: 700, fontSize: 14, margin: 0 }}>
              Grade {student?.grade ?? '—'} · Level {level} Hero
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
            {[
              { label: 'Hero Points', value: (totalXp || 0).toLocaleString(), emoji: '⚡' },
              { label: 'Coins', value: coins, emoji: '🪙' },
              { label: 'Streak', value: `${streak}🔥`, emoji: '🔥' },
              { label: 'Mastered', value: stats?.mastered ?? 0, emoji: '🏆' },
              { label: 'Accuracy', value: `${stats?.accuracy ?? 0}%`, emoji: '🎯' },
              { label: 'Sessions', value: student?.sessions_completed ?? 0, emoji: '📚' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-3 border border-gray-100" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, margin: '0 0 2px' }}>{s.emoji}</p>
                <p style={{ color: '#1B2B4B', fontWeight: 800, fontSize: 18, margin: 0 }}>{s.value}</p>
                <p style={{ color: '#64748B', fontSize: 11, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/avatar-customisation')}
            style={{
              width: '100%', background: 'white', color: '#1B2B4B',
              border: '2px solid #C49A1A', borderRadius: 12,
              padding: '12px 16px', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', marginBottom: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Sparkles size={16} /> Customise Avatar
          </button>

          <button
            onClick={async () => {
              try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
              window.location.href = '/login'
            }}
            style={{
              width: '100%', background: '#1B2B4B', color: 'white',
              border: '2px solid #C49A1A', borderRadius: 12,
              padding: '12px 16px', fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </div>
      )}

      {/* Streak Toast */}
      {streakToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] pop-in">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 whitespace-nowrap">
            {streakToast.message}
          </div>
        </div>
      )}

      {/* Badge Earned Toast */}
      {badgeCelebration.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setBadgeCelebration([])}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-xs w-full mx-4 text-center pop-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <CelebrationOverlay show />
            <div className="flex justify-center mb-2">
              <RoboVideo src="/assets/robot/happyjumpingrobo.MP4" width={160} loop={false} />
            </div>
            <div className="text-6xl mb-3" style={{ animation: 'celebrate-bounce 0.6s ease infinite alternate' }}>
              {badgeCelebration[0].emoji}
            </div>
            <div className="text-xs font-bold text-electric uppercase tracking-widest mb-1">New Badge Unlocked!</div>
            <h2 className="text-xl font-extrabold text-navy mb-1">{badgeCelebration[0].name}</h2>
            <p className="text-sm text-gray-500 mb-6">{badgeCelebration[0].description}</p>
            {badgeCelebration.length > 1 && (
              <p className="text-xs text-gray-400 mb-4">+{badgeCelebration.length - 1} more badge{badgeCelebration.length > 2 ? 's' : ''}!</p>
            )}
            <button
              onClick={() => setBadgeCelebration([])}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-electric to-blue-400 text-white font-bold text-sm shadow-lg"
            >
              Awesome! 🎉
            </button>
          </div>
        </div>
      )}

      {/* Practice Loading Overlay */}
      {practiceLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-xl">
            <RoboVideo src="/assets/robot/robowalking.MP4" width={120} loop={true} />
            <p className="text-sm font-medium text-gray-600">Loading question...</p>
          </div>
        </div>
      )}

      {/* Practice Modal */}
      {practiceModal && !practiceLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closePractice}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full relative pop-in overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {showCelebration && <CelebrationOverlay show={showCelebration} />}
            <div className={`h-2 bg-gradient-to-r ${currentSubject?.gradient || 'from-blue-500 to-indigo-600'}`} />
            <div className="p-6 sm:p-8">
              <button onClick={closePractice} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl z-50"><X size={18} className="text-gray-400" /></button>

              {/* Empty state */}
              {practiceModal.empty ? (
                <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
                  <h3 style={{ color: '#1B2B4B', fontWeight: 800,
                    fontSize: 20, marginBottom: 8 }}>
                    Hero is preparing questions!
                  </h3>
                  <p style={{ color: '#64748B', fontSize: 14,
                    marginBottom: 8, lineHeight: 1.6 }}>
                    Questions for this skill are being prepared by Hero.
                    Please try another skill for now.
                  </p>
                  <p style={{ color: '#C49A1A', fontSize: 13,
                    fontWeight: 600, marginBottom: 24 }}>
                    Check back in a few minutes!
                  </p>
                  <button
                    onClick={closePractice}
                    style={{
                      background: '#1B2B4B', color: 'white',
                      border: '2px solid #C49A1A',
                      borderRadius: 12, padding: '12px 32px',
                      fontWeight: 700, fontSize: 15,
                      cursor: 'pointer', width: '100%',
                    }}
                  >
                    Try Another Skill
                  </button>
                </div>
              ) : speedRound?.finished ? (
                <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                  <div className="flex justify-center mb-2">
                    <RoboVideo src="/assets/robot/happyjumpingrobo.MP4" width={160} loop={false} />
                  </div>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
                  <h3 style={{ color: '#1B2B4B', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                    Speed Round Complete!
                  </h3>
                  <p style={{ color: '#64748B', fontSize: 15, marginBottom: 6, lineHeight: 1.5 }}>
                    You answered {speedRound.total} questions in {speedRound.elapsedSec} seconds!
                  </p>
                  <p style={{ color: '#1B2B4B', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                    {speedRound.correct} of {speedRound.total} correct
                  </p>
                  <p style={{ color: '#C49A1A', fontSize: 14, fontWeight: 800, marginBottom: 24 }}>
                    +5 bonus coins earned! 🪙
                  </p>
                  <button
                    onClick={closePractice}
                    style={{
                      background: '#1B2B4B', color: 'white',
                      border: '2px solid #C49A1A',
                      borderRadius: 12, padding: '12px 32px',
                      fontWeight: 700, fontSize: 15,
                      cursor: 'pointer', width: '100%',
                    }}
                  >
                    Done!
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-lg ${subjectIconBgs[activeSubject]} flex items-center justify-center`}>
                        {(() => { const Icon = subjectIcons[activeSubject]; return <Icon size={18} className={subjectIconColors[activeSubject]} /> })()}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-white text-xs font-bold bg-gradient-to-r ${currentSubject?.gradient}`}>{practiceModal.skillName}</span>
                      <div style={{
                        marginLeft: 'auto',
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#F0F4F8', borderRadius: 8, padding: '4px 12px',
                        border: '1px solid #E2E8F0',
                      }}>
                        <span style={{ fontSize: 18 }}>⏱️</span>
                        <span style={{
                          fontFamily: 'monospace', fontSize: 20,
                          fontWeight: 700, color: questionTimer > 60 ? '#ef4444' : '#1B2B4B',
                        }}>
                          {String(Math.floor(questionTimer / 60)).padStart(2, '0')}:
                          {String(questionTimer % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                    {cheatWarning && (
                      <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl p-3 mb-3 text-sm font-medium">
                        ⚠️ You left the page! Here&apos;s a new question.
                        <button
                          onClick={() => setCheatWarning(false)}
                          className="ml-2 text-xs underline text-amber-700"
                        >dismiss</button>
                      </div>
                    )}
                    <h3 className="text-xl font-extrabold text-navy">{practiceModal.question}</h3>
                  </div>

                  {!showSteps && (
                    <>
                      <div className="space-y-2.5 mb-5">
                        {(practiceModal.options || []).map((opt, i) => {
                          const letters = ['A', 'B', 'C', 'D']
                          const isSelected = answerState?.selected === i
                          const isAnswerCorrect = showResult && i === answerState?.correctIndex
                          const isAnswerWrong = showResult && isSelected && !answerState?.correct
                          let btnClass = 'bg-gray-50 border-gray-200 hover:border-electric hover:bg-electric/5 text-gray-700'
                          let letterBg = 'bg-gray-200 text-gray-600'
                          if (answerState?.loading && isSelected) {
                            btnClass = 'bg-blue-50 border-blue-300 text-blue-700'; letterBg = 'bg-blue-400 text-white'
                          } else if (showResult) {
                            if (isAnswerCorrect) { btnClass = 'bg-green-50 border-green-400 text-green-700 font-bold scale-[1.01] shadow-md'; letterBg = 'bg-green-500 text-white' }
                            else if (isAnswerWrong) { btnClass = 'bg-amber-50 border-amber-300 text-amber-600'; letterBg = 'bg-amber-400 text-white' }
                            else { btnClass = 'bg-gray-50 border-gray-100 text-gray-300'; letterBg = 'bg-gray-100 text-gray-300' }
                          }
                          return (
                            <button key={i} onClick={() => handleAnswer(i)} disabled={!!answerState} className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${btnClass}`}>
                              <span className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${letterBg}`}>{answerState?.loading && isSelected ? '⏳' : letters[i]}</span>
                                <span className="flex-1">{opt}</span>
                                {showResult && isAnswerCorrect && <span className="text-lg celebrate-bounce">✅</span>}
                                {showResult && isAnswerWrong && <span className="text-lg">❌</span>}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {questionTimer >= 60 && !answerState && !showAskHero && studentPlan === 'premium' && (
                        <div style={{
                          background: '#FFFBEB',
                          border: '1px solid #C49A1A',
                          borderRadius: 10,
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>🤖</span>
                            <span style={{ color: '#1B2B4B', fontSize: 14, fontWeight: 600 }}>
                              Looks like you might be stuck. Want help?
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              Analytics.askHeroOpened(practiceModal?.skillId)
                              setShowAskHero(true)
                              setAskHeroAttempts(prev => prev + 1)
                            }}
                            style={{
                              background: '#C49A1A', color: 'white',
                              border: 'none', borderRadius: 8,
                              padding: '6px 14px', fontWeight: 700,
                              fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            Ask Hero
                          </button>
                        </div>
                      )}
                      {!answerState && (
                        studentPlan === 'premium' ? (
                          <button
                            onClick={() => {
                              Analytics.askHeroOpened(practiceModal?.skillId)
                              setShowAskHero(true)
                              setAskHeroAttempts(prev => prev + 1)
                            }}
                            style={{
                              display: 'flex', alignItems: 'center',
                              gap: 8, background: '#1B2B4B', color: 'white',
                              border: '2px solid #C49A1A', borderRadius: 12,
                              padding: '10px 20px', fontWeight: 700,
                              fontSize: 15, cursor: 'pointer',
                              width: '100%', justifyContent: 'center',
                              marginBottom: 12,
                            }}
                          >
                            <span>🤖</span>
                            <span>Ask <span style={{ color: '#C49A1A' }}>Hero</span> ✦✦</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => { window.location.href = '/subscribe' }}
                            style={{
                              display: 'flex', alignItems: 'center',
                              gap: 8, background: 'linear-gradient(135deg, #1B2B4B, #2D4A7A)',
                              border: '2px solid #C49A1A', borderRadius: 14,
                              padding: '12px 20px', color: 'white', fontWeight: 700,
                              fontSize: 14, cursor: 'pointer',
                              width: '100%', justifyContent: 'center',
                              marginBottom: 12,
                            }}
                          >
                            🤖 Ask Hero
                            <span style={{
                              background: '#C49A1A', color: '#1B2B4B',
                              borderRadius: 10, padding: '2px 8px',
                              fontSize: 11, fontWeight: 900,
                            }}>
                              PREMIUM
                            </span>
                          </button>
                        )
                      )}
                      {showHint && !answerState && (
                        <div className="border border-[#C49A1A] bg-amber-50 rounded-xl p-4 mb-3 text-sm text-[#1B2B4B] font-medium flex items-start gap-2">
                          {hintLoading ? (
                            <div className="flex-1 flex flex-col items-center gap-2">
                              <RoboVideo src="/assets/robot/thinkinggotidearobo.MP4" width={120} loop={true} />
                              <span className="text-xs font-bold">Hero is thinking…</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-xl flex-shrink-0">✦</span>
                              <span>
                                {aiHint?.text || practiceModal.hint || 'Think carefully — you\'ve got this!'}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {showResult && (
                        <div className={`rounded-xl p-4 mb-4 ${answerState?.correct ? 'bg-green-50 border-2 border-green-300' : 'bg-amber-50 border-2 border-amber-300'}`}>
                          <div className="flex justify-center mb-2">
                            <RoboVideo
                              src={answerState?.correct ? '/assets/robot/happyjumpingrobo.MP4' : '/assets/robot/sadrobo.MP4'}
                              width={150}
                              loop={false}
                            />
                          </div>
                          {answerState?.correct ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><span className="text-3xl celebrate-bounce">🎉</span><div><div className="font-extrabold text-green-700">Well done!</div><div className="text-green-600 text-xs">You nailed it!</div></div></div>
                              <div className="text-right"><div className="text-green-700 text-xl font-extrabold">{answerState.delta > 0 ? '+' : ''}{answerState.delta}</div><div className="text-[#C49A1A] font-bold text-xs xp-float">+{answerState.xpGained} Hero Points  +{answerState.coinsGained} 🪙</div></div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><span className="text-2xl">🤔</span><div><div className="font-extrabold text-amber-700">Why don&apos;t we try this way?</div><div className="text-amber-600 text-xs">Keep trying!</div></div></div>
                              <div className="text-amber-600 text-xl font-extrabold">{answerState.delta}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Feature 6: Show Me How button on wrong answer */}
                      {showResult && !answerState?.correct && practiceModal.steps?.length > 0 && (
                        <button onClick={() => setShowSteps(true)} className="w-full mb-3 py-3 rounded-xl border-2 border-[#C49A1A] text-[#1B2B4B] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#C49A1A]/10 transition-colors">
                          <Lightbulb size={16} /> Show Me How
                        </button>
                      )}
                      {/* Speed round auto-advances, so hide the manual button until it finishes. */}
                      {showResult && !(speedRound && !speedRound.finished) && !(speedRound && speedRound.finished) && (
                        <button onClick={handleNextQuestion} className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg ${answerState?.correct ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 'bg-[#1B2B4B] text-white'}`}>
                          {answerState?.correct ? '🚀 Next Question!' : '💪 Try Another!'} <ArrowRight size={16} />
                        </button>
                      )}
                      {/* Speed Round progress indicator while active. */}
                      {speedRound && !speedRound.finished && (
                        <p className="text-center text-xs font-bold text-[#C49A1A] mt-2">
                          ⚡ Question {Math.min(speedRound.count + 1, speedRound.total)} of {speedRound.total} — next one loads automatically!
                        </p>
                      )}
                    </>
                  )}

                  {/* Feature 6: Step-by-Step Solution */}
                  {showSteps && (
                    <div>
                      <div className="bg-[#1B2B4B] rounded-xl p-8 mb-5 flex flex-col items-center justify-center border-2 border-[#C49A1A]">
                        <div className="w-14 h-14 rounded-full bg-[#C49A1A] flex items-center justify-center mb-3 hover:bg-[#C49A1A]/80 cursor-pointer transition-colors">
                          <Play size={24} className="text-white ml-1" />
                        </div>
                        <p className="text-white/60 text-xs font-medium">Watch tutorial video</p>
                      </div>
                      <h4 className="font-bold text-[#1B2B4B] text-base mb-4">Step-by-Step Solution</h4>
                      <div className="space-y-3 mb-5">
                        {(practiceModal.steps || []).map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-[#C49A1A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{i + 1}</div>
                            <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setShowSteps(false)} className="w-full py-3.5 rounded-xl bg-[#1B2B4B] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
                        Got it! Try Again <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature 1: Avatar Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowShop(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative pop-in overflow-hidden max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="h-2 bg-gradient-to-r from-yellow-400 to-amber-500" />
            <div className="p-6">
              <button onClick={() => setShowShop(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl z-50"><X size={18} className="text-gray-400" /></button>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2"><ShoppingBag size={20} className="text-amber-600" /><h3 className="text-lg font-extrabold text-navy">Avatar Shop</h3></div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm"><Coins size={14} />{coins}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {shopItems.map((item) => {
                  const owned = shopOwnedItems.includes(item.id)
                  return (
                    <div key={item.id} className={`rounded-xl p-4 border-2 transition-all text-center ${owned ? 'border-green-300 bg-green-50' : coins >= item.cost ? 'border-gray-200 bg-white hover:border-electric' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                      <span className={`text-4xl block mb-2 ${!owned && coins < item.cost ? 'grayscale' : ''}`}>{item.emoji}</span>
                      <p className="text-xs font-bold text-navy mb-0.5">{item.name}</p>
                      <p className="text-[10px] text-gray-400 mb-2">{item.category}</p>
                      {owned ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full"><CheckCircle2 size={10} />Owned</span>
                      ) : (
                        <button onClick={() => buyItem(item)} disabled={coins < item.cost} className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${coins >= item.cost ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                          <Coins size={10} className="inline mr-1" />{item.cost} coins
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature 7: Milestone Celebration Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowMilestoneModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full relative pop-in overflow-hidden text-center p-8" onClick={e => e.stopPropagation()}>
            <CelebrationOverlay show={true} />
            <span className="text-6xl block mb-4 celebrate-bounce">🎉</span>
            <h3 className="text-2xl font-extrabold text-navy mb-2">You did it!</h3>
            <p className="text-gray-500 mb-4">You completed 5 Hero Missions! Your teacher will be in touch about your reward 🎁</p>
            <button onClick={() => setShowMilestoneModal(false)} className="bg-gradient-to-r from-amber-400 to-orange-500 text-white py-3 px-8 rounded-xl font-bold text-sm shadow-lg">Awesome! 🚀</button>
          </div>
        </div>
      )}

      {/* Ask Hero AI tutor panel */}
      {showAskHero && practiceModal && (
        <AskHero
          question={practiceModal.question}
          skillId={practiceModal.skillId || 'm_3_multiply100'}
          skillName={practiceModal.skillName}
          studentId={authStudentId || 'student_test_001'}
          questionId={practiceModal.questionId}
          onClose={() => setShowAskHero(false)}
          behaviour={answerState ? 'conceptual_gap' : 'confused'}
          attemptNumber={askHeroAttempts}
        />
      )}

      {/* Dev Mode Panel — only visible for isDev students */}
      {student?.isDev && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16,
          background: '#1B2B4B', color: 'white',
          borderRadius: 12, padding: 16, zIndex: 1000,
          border: '2px solid #C49A1A', minWidth: 200,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <p style={{ color: '#C49A1A', fontWeight: 700, margin: 0 }}>
            🔧 Dev Mode
          </p>
          <button onClick={handleResetData} style={devBtnStyle}>Reset My Data</button>
          <button onClick={handleSimulate10} style={devBtnStyle}>Simulate 10 Questions</button>
          <button onClick={handleAwardAllBadges} style={devBtnStyle}>Award All Badges</button>
          <button onClick={handleTriggerGift} style={devBtnStyle}>Trigger Hero Quest</button>
        </div>
      )}

      {/* SKILL MASTERY EXAM MODAL */}
      {examModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 200, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'white', borderRadius: 24,
            padding: 32, maxWidth: 560, width: '100%',
            maxHeight: '90vh', overflowY: 'auto',
            border: '3px solid #C49A1A',
          }}>
            {examModal.phase === 'loading' && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 48 }}>🤖</div>
                <p style={{ fontWeight: 700, color: '#1B2B4B' }}>
                  Preparing your exam...
                </p>
              </div>
            )}

            {examModal.phase === 'intro' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
                  <h2 style={{ fontSize: 24, fontWeight: 800,
                    color: '#1B2B4B', marginBottom: 8 }}>
                    Mastery Exam!
                  </h2>
                  <p style={{ color: '#64748B', fontSize: 15 }}>
                    {getSkillInfo(examModal.skill.id || examModal.skill.skillId)?.name || examModal.skill.name}
                  </p>
                </div>

                <div style={{ background: '#F0F4F8', borderRadius: 14,
                  padding: 20, marginBottom: 24 }}>
                  {[
                    `📝 ${examModal.questions?.length || 10} questions`,
                    `⏱️ ${(examModal.timeLimit || 300) / 60} minute time limit`,
                    `✅ Score 70% or higher to master this skill`,
                    `⚡ Earn 50 Hero Points + 20 coins if you pass!`,
                  ].map((item, i) => (
                    <p key={i} style={{ margin: '6px 0',
                      fontSize: 14, color: '#1B2B4B',
                      fontWeight: 600 }}>{item}</p>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setExamModal(null)}
                    style={{ flex: 1, padding: 14,
                      background: 'white', border: '2px solid #E2E8F0',
                      borderRadius: 12, fontWeight: 700,
                      cursor: 'pointer', color: '#64748B' }}
                  >
                    Not Yet
                  </button>
                  <button
                    onClick={() => {
                      setExamModal(prev => prev ? ({ ...prev, phase: 'exam' }) : prev)
                      startExamTimer()
                    }}
                    style={{ flex: 2, padding: 14,
                      background: '#1B2B4B', border: '2px solid #C49A1A',
                      borderRadius: 12, fontWeight: 800,
                      cursor: 'pointer', color: 'white',
                      fontSize: 16 }}
                  >
                    🚀 Start Exam!
                  </button>
                </div>
              </>
            )}

            {examModal.phase === 'exam' && examModal.questions && (
              <>
                <div style={{ display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontWeight: 800, fontSize: 14,
                    color: '#1B2B4B' }}>
                    Question {examModal.currentIndex + 1}/{examModal.questions.length}
                  </span>
                  <span style={{
                    fontWeight: 800, fontSize: 16,
                    color: examModal.timeLeft < 60 ? '#EF4444' : '#1B2B4B',
                    fontFamily: 'monospace',
                  }}>
                    ⏱️ {Math.floor((examModal.timeLeft || 0) / 60)}:
                    {String((examModal.timeLeft || 0) % 60).padStart(2, '0')}
                  </span>
                </div>

                <div style={{ height: 6, background: '#F0F4F8',
                  borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: '#C49A1A',
                    width: `${(examModal.currentIndex /
                      examModal.questions.length) * 100}%`,
                    transition: 'width 0.3s',
                  }} />
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: 16,
                  padding: 20, marginBottom: 20,
                  border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: 18, fontWeight: 700,
                    color: '#1B2B4B', lineHeight: 1.5, margin: 0 }}>
                    {examModal.questions[examModal.currentIndex]?.question}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {examModal.questions[examModal.currentIndex]?.options?.map((opt, i) => (
                    <button key={i}
                      onClick={() => {
                        const newAnswers = [...examModal.answers, {
                          questionId: examModal.questions[examModal.currentIndex].questionId,
                          answer: opt,
                        }]
                        if (examModal.currentIndex < examModal.questions.length - 1) {
                          setExamModal(prev => prev ? ({
                            ...prev,
                            answers: newAnswers,
                            currentIndex: prev.currentIndex + 1,
                          }) : prev)
                        } else {
                          submitExam(newAnswers, { ...examModal, answers: newAnswers })
                        }
                      }}
                      style={{
                        padding: '14px 18px', textAlign: 'left',
                        background: 'white', border: '2px solid #E2E8F0',
                        borderRadius: 12, fontWeight: 600,
                        fontSize: 15, cursor: 'pointer',
                        color: '#1B2B4B',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <span style={{ width: 28, height: 28,
                        borderRadius: 8, background: '#F0F4F8',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 800,
                        fontSize: 13, flexShrink: 0 }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {examModal.phase === 'result' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 64, marginBottom: 12 }}>
                    {examModal.result?.passed ? '🎉' : '💪'}
                  </div>
                  <h2 style={{ fontSize: 28, fontWeight: 800,
                    color: '#1B2B4B', marginBottom: 8 }}>
                    {examModal.result?.passed
                      ? 'Skill Mastered!'
                      : 'Keep Practising!'}
                  </h2>
                  <div style={{ fontSize: 48, fontWeight: 800,
                    color: examModal.result?.passed ? '#22C55E' : '#C49A1A' }}>
                    {examModal.result?.score}%
                  </div>
                  <p style={{ color: '#64748B', marginTop: 8 }}>
                    {examModal.result?.correct}/{examModal.result?.total} correct
                  </p>
                </div>

                {examModal.result?.passed && (
                  <div style={{ background: '#DCFCE7',
                    borderRadius: 14, padding: 16,
                    textAlign: 'center', marginBottom: 20,
                    border: '1px solid #22C55E' }}>
                    <p style={{ fontWeight: 800, color: '#166534',
                      fontSize: 16, margin: 0 }}>
                      🏆 +50 Hero Points · 🪙 +20 Coins earned!
                    </p>
                  </div>
                )}

                {!examModal.result?.passed && (
                  <div style={{ background: '#FFFBEB',
                    borderRadius: 14, padding: 16,
                    marginBottom: 20,
                    border: '1px solid #C49A1A' }}>
                    <p style={{ fontWeight: 700, color: '#1B2B4B',
                      fontSize: 14, margin: 0 }}>
                      🤖 Hero says: Keep practising this skill to
                      improve your score. You need 70% to master it.
                      You can do it! 💪
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setExamModal(null)
                    fetchProgress(authStudentId)
                  }}
                  style={{ width: '100%', padding: 16,
                    background: '#1B2B4B', color: 'white',
                    border: '2px solid #C49A1A', borderRadius: 14,
                    fontWeight: 800, fontSize: 16, cursor: 'pointer' }}
                >
                  {examModal.result?.passed
                    ? 'Continue to Next Skill →'
                    : 'Keep Practising 💪'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* HERO AI NUDGE POPUP */}
      {heroNudge && (
        <div style={{
          position: 'fixed',
          bottom: 96, right: 24,
          zIndex: 300,
          maxWidth: 320,
          background: heroNudge.color,
          border: `2px solid ${heroNudge.borderColor}`,
          borderRadius: 20,
          padding: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          animation: 'slideInRight 0.4s ease',
        }}>
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(120%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <button
            onClick={() => setHeroNudge(null)}
            style={{ position: 'absolute', top: 10, right: 12,
              background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 16, color: '#94A3B8' }}
          >✕</button>
          <div style={{ display: 'flex', gap: 10,
            alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>{heroNudge.emoji}</span>
            <div>
              <p style={{ fontWeight: 800, color: '#1B2B4B',
                fontSize: 15, margin: '0 0 4px' }}>
                {heroNudge.title}
              </p>
              <p style={{ color: '#334155', fontSize: 13,
                lineHeight: 1.5, margin: 0 }}>
                {heroNudge.message}
              </p>
            </div>
          </div>
          {heroNudge.skill && (
            <button
              onClick={() => {
                setHeroNudge(null)
                if (heroNudge.isExam) {
                  openSkillExam(heroNudge.skill)
                } else {
                  openPractice(heroNudge.skill)
                }
              }}
              style={{
                width: '100%', padding: '10px 16px',
                background: '#1B2B4B', color: 'white',
                border: `2px solid ${heroNudge.borderColor}`,
                borderRadius: 10, fontWeight: 700,
                fontSize: 14, cursor: 'pointer',
              }}
            >
              {heroNudge.action} →
            </button>
          )}
        </div>
      )}

      {/* SESSION FEEDBACK MODAL — every 5 sessions */}
      {showFeedback && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'white', borderRadius: 24,
            padding: 32, maxWidth: 420, width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <p style={{ fontSize: 48, marginBottom: 8 }}>🤖</p>
            <h2 style={{ fontSize: 22, fontWeight: 800,
              color: '#1B2B4B', marginBottom: 8 }}>
              How is Hero helping you?
            </h2>
            <p style={{ color: '#64748B', fontSize: 14,
              marginBottom: 24 }}>
              Your feedback helps us make MyMathsHero better!
            </p>

            <div style={{ display: 'flex', gap: 8,
              justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star}
                  onClick={() => setFeedbackRating(star)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  style={{
                    fontSize: 36, background: 'none',
                    border: 'none', cursor: 'pointer',
                    opacity: star <= feedbackRating ? 1 : 0.3,
                    transform: star <= feedbackRating ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.1s',
                  }}>
                  ⭐
                </button>
              ))}
            </div>

            <textarea
              placeholder="Tell us what you think... (optional)"
              value={feedbackMsg}
              onChange={e => setFeedbackMsg(e.target.value.slice(0, 2000))}
              style={{
                width: '100%', padding: 12,
                border: '1.5px solid #E2E8F0',
                borderRadius: 12, fontSize: 14,
                resize: 'none', height: 80,
                color: '#1B2B4B', marginBottom: 16,
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setShowFeedback(false)
                  setFeedbackRating(0)
                  setFeedbackMsg('')
                }}
                disabled={feedbackSubmitting}
                style={{ flex: 1, padding: 14,
                  background: 'white',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 12, fontWeight: 600,
                  cursor: 'pointer', color: '#64748B' }}>
                Skip
              </button>
              <button
                onClick={submitFeedback}
                disabled={feedbackRating === 0 || feedbackSubmitting}
                style={{ flex: 2, padding: 14,
                  background: feedbackRating > 0 ? '#1B2B4B' : '#E2E8F0',
                  border: feedbackRating > 0 ? '2px solid #C49A1A' : 'none',
                  borderRadius: 12, fontWeight: 800,
                  cursor: feedbackRating > 0 ? 'pointer' : 'default',
                  color: feedbackRating > 0 ? 'white' : '#94A3B8' }}>
                {feedbackSubmitting ? 'Sending…' : 'Send Feedback ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F) Bottom navigation bar */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'white',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        padding: '10px 0 20px',
        zIndex: 50,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        {[
          { emoji: '🏠', label: 'Home', tab: 'home' },
          { emoji: '🏆', label: 'League', tab: 'league' },
          // Hero Arcade — only shown when the arcadeEnabled flag is on.
          ...(flags.arcadeEnabled ? [{ emoji: '🕹️', label: 'Arcade', href: '/arcade' }] : []),
          { emoji: '🎖️', label: 'Badges', tab: 'badges' },
          { emoji: '👤', label: 'Profile', tab: 'profile' },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => item.href ? router.push(item.href) : setActiveTab(item.tab)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '4px 0',
            }}
          >
            <span style={{ fontSize: 22 }}>{item.emoji}</span>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: activeTab === item.tab ? '#C49A1A' : '#94A3B8',
            }}>
              {item.label}
            </span>
            {activeTab === item.tab && (
              <div style={{
                width: 4, height: 4,
                borderRadius: '50%',
                background: '#C49A1A',
              }} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

const devBtnStyle = {
  background: '#C49A1A',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'left',
}
