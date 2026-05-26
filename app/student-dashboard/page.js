'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import RoboVideo from '@/components/RoboVideo'
import { Calculator, BookOpen, FlaskConical, Flame, Star, Zap, Trophy, Target, Award, ChevronRight, X, CheckCircle2, XCircle, Lightbulb, ArrowRight, Rocket, Coins, ShoppingBag, Crown, Gift, Clock, Play, ChevronDown, Medal, Users, School, MapPin, Sparkles } from 'lucide-react'

const STUDENT_ID = 'student_test_001'

const subjects = [
  { id: 'maths', name: 'Maths', emoji: '🔢', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'english', name: 'English', emoji: '📖', gradient: 'from-purple-500 to-fuchsia-600' },
  { id: 'science', name: 'Science', emoji: '🔬', gradient: 'from-emerald-500 to-teal-600' },
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

  // ── Data state ─────────────────────────────────────────────────────────────
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [skillsBySubject, setSkillsBySubject] = useState({ maths: [], english: [], science: [] })
  const [strandsBySubject, setStrandsBySubject] = useState({ maths: [], english: [], science: [] })
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

  const questionStartTimeRef = useRef(null)
  const [authStudentId, setAuthStudentId] = useState(STUDENT_ID)

  // Live question timer (seconds), separate from the start-time ref above.
  const [questionTimer, setQuestionTimer] = useState(0)
  const timerRef = useRef(null)

  // Anti-cheat: when the student leaves the tab during a question, force a new question.
  const [cheatWarning, setCheatWarning] = useState(false)
  const [questionSwitched, setQuestionSwitched] = useState(false)

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

      setStudent(data.student)
      setTotalXp(data.student.xp || 0)
      setCoins(data.student.coins || 0)
      setStreak(data.student.streak || 0)
      setLongestStreak(data.student.longestStreak || 0)
      setStats(data.stats || { mastered: 0, inProgress: 0, accuracy: 0 })
      setGiftMilestone(data.giftMilestone || { target: 5, completed: 0, achieved: false })
      setWeeklyActivity(data.weeklyActivity || [])
      setSkillsBySubject(groupRecommendationsBySubject(data.recommendations || []))
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
        const res = await fetch(`/api/student/questions?skillId=${practiceModal.skillId}&limit=1`)
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.questions?.length > 0) {
          const q = data.questions[0]
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
  const openPractice = async (skill) => {
    setPracticeLoading(true)
    setAnswerState(null)
    setShowHint(false)
    setHintLoading(false)
    setAiHint(null)
    setShowSteps(false)
    setShowCelebration(false)

    try {
      const res = await fetch(`/api/student/questions?skillId=${skill.id}&limit=1`)
      const data = await res.json()

      if (!res.ok || !data.questions || data.questions.length === 0) {
        setPracticeModal({ skillId: skill.id, skillName: skill.name, empty: true })
        return
      }

      const q = data.questions[0]
      setPracticeModal({
        skillId: skill.id,
        skillName: skill.name,
        questionId: q.questionId || q.id,
        question: q.question,
        options: q.options,
        hint: q.hint,
        steps: q.steps,
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

      {/* Game HUD */}
      <div className="bg-[#1B2B4B] border-b-4 border-[#C49A1A] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#C49A1A] flex items-center justify-center text-2xl sm:text-3xl shadow-lg border-2 border-white/20">{student?.avatar || '🦊'}</div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">Hero HQ — Hi {student?.name || 'Alex'}! 👋</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/60 font-medium">Lvl {level}</span>
                  <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#C49A1A] rounded-full" style={{ width: `${levelProgress}%` }} /></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#C49A1A] text-[#1B2B4B] shadow-lg"><span className="text-base">🔥</span><span className="text-sm font-bold">{streak}</span></div>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#C49A1A] text-white shadow-lg" title="Hero Points"><span className="text-base">⚡</span><span className="text-sm font-bold">{totalXp.toLocaleString()}</span></div>
              {/* Feature 1: Coin counter */}
              <button onClick={() => setShowShop(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg hover:scale-105 transition-transform">
                <Coins size={16} /><span className="text-sm font-bold">{coins}</span>
              </button>
              {/* Feature 8: Avatar Customisation Button */}
              <button onClick={() => router.push('/avatar-customisation')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:scale-105 transition-transform" title="Customise Avatar">
                <Sparkles size={16} />
              </button>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg"><span className="text-base">👑</span><span className="text-sm font-bold">#3</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <div className="w-full lg:w-56 flex-shrink-0">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">🎮 Subjects</h3>
            <div className="space-y-2">
              {subjects.map(sub => (
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
            <div className="flex items-center gap-3 mb-1"><h2 className="text-lg font-bold text-navy">Hero Missions for You</h2><span className="text-xl">{currentSubject?.emoji}</span></div>
            <p className="text-sm text-gray-500 mb-5">AI-selected skills Hero picked just for you</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {currentSkills.length === 0 ? (
                <div className="col-span-3 text-center py-10 text-gray-400 text-sm">
                  <span className="text-3xl block mb-2">🎉</span>
                  You&apos;ve mastered all {currentSubject?.name} skills available for now!
                </div>
              ) : currentSkills.map((skill, i) => {
                const SubjectIcon = subjectIcons[activeSubject]
                return (
                  <button key={skill.id || i} onClick={() => openPractice(skill)} className={`relative rounded-2xl p-5 border-2 transition-all duration-300 text-left group hover:scale-[1.02] hover:shadow-lg ${skill.status === 'Almost There!' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-400' : skill.status === 'Continue' ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-400' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400'}`}>
                    <div className={`w-10 h-10 rounded-xl ${subjectIconBgs[activeSubject]} flex items-center justify-center mb-3`}><SubjectIcon size={20} className={subjectIconColors[activeSubject]} /></div>
                    <h3 className="font-bold text-navy text-sm mb-1">{skill.name}</h3>
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-3 ${skill.status === 'New' ? 'bg-blue-500 text-white' : skill.status === 'Continue' ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'}`}>
                      {skill.status === 'New' ? '✨ New' : skill.status === 'Continue' ? '🔄 Continue' : '🏆 Almost!'}
                    </span>
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">SmartScore</span><span className="font-bold text-navy">{skill.score}/100</span></div>
                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${skill.score >= 70 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : skill.score >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`} style={{ width: `${skill.score}%` }} /></div>
                    <div className="flex items-center gap-1 text-xs text-electric font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-2">Play! <ArrowRight size={12} /></div>
                  </button>
                )
              })}
            </div>
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
                <div className="text-center py-8">
                  <span className="text-5xl block mb-4">📚</span>
                  <h3 className="text-lg font-bold text-navy mb-2">No questions yet!</h3>
                  <p className="text-sm text-gray-500 mb-4">Questions for this skill haven&apos;t been added yet.</p>
                  <button onClick={closePractice} className="px-6 py-3 rounded-xl bg-electric text-white font-bold text-sm">Back to Skills</button>
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
                            else if (isAnswerWrong) { btnClass = 'bg-red-50 border-red-300 text-red-500'; letterBg = 'bg-red-400 text-white' }
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

                      {!answerState && (
                        <button
                          onClick={fetchHint}
                          disabled={hintLoading}
                          className="w-full flex items-center justify-center gap-2 mb-4 bg-[#1B2B4B] text-white border-2 border-[#C49A1A] rounded-xl px-6 py-3 font-bold text-sm disabled:opacity-60 hover:bg-[#0f1d3a] transition-colors"
                        >
                          {hintLoading ? (
                            <><span style={{ display:'inline-block', width:14, height:14, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />Asking Hero…</>
                          ) : (
                            <><span className="text-white">Ask</span> <span className="text-[#C49A1A]">Hero</span> <span className="text-[#C49A1A]">✦✦</span></>
                          )}
                        </button>
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
                        <div className={`rounded-xl p-4 mb-4 ${answerState?.correct ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-200'}`}>
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
                              <div className="flex items-center gap-2"><span className="text-2xl">🤔</span><div><div className="font-extrabold text-red-600">Not quite!</div><div className="text-red-500 text-xs">Keep trying!</div></div></div>
                              <div className="text-red-500 text-xl font-extrabold">{answerState.delta}</div>
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
                      {showResult && (
                        <button onClick={closePractice} className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg ${answerState?.correct ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 'bg-[#1B2B4B] text-white'}`}>
                          {answerState?.correct ? '🚀 Next Question!' : '💪 Try Another!'} <ArrowRight size={16} />
                        </button>
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
