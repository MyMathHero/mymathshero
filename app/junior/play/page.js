'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import RoboVideo from '@/components/RoboVideo'
import RewardBurst, { comboMessage } from '@/components/RewardBurst'
import VisualRender from '@/components/junior/VisualRender'
import HeroTutor from '@/components/HeroTutor'
import { heroSpeak, heroStop } from '@/lib/heroVoice'
import { getSkillInfo } from '@/lib/skillNames'

const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'

// Junior play loop (Prep–3): big visual questions, Hero reads everything aloud,
// tap to answer, spoken praise + reward burst, AI auto-advances. "Show me!"
// opens the whiteboard tutor. No reading required, no timer.
function JuniorPlayInner() {
  const router = useRouter()
  const params = useSearchParams()
  const world = params.get('world')

  const [me, setMe] = useState(null)
  const [skill, setSkill] = useState(null)       // { id, name }
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null)     // selected option
  const [correct, setCorrect] = useState(null)
  const [robot, setRobot] = useState('waving')
  const [reward, setReward] = useState(null)
  const [showTutor, setShowTutor] = useState(false)
  const [error, setError] = useState('')
  const comboRef = useRef(0)
  const bestRef = useRef(0)
  const busyRef = useRef(false)

  // Auth + first skill + questions.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me')
        if (!r.ok) { router.replace('/login'); return }
        const data = await r.json()
        if (!data.authenticated || data.user?.role !== 'student') { router.replace('/login'); return }
        setMe(data.user)
        await loadSkill(data.user.userId)
      } catch { setError('Something went wrong.') }
    })()
    return () => heroStop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pick a skill that ACTUALLY has junior questions for this world, then load
  // them. We must NOT pick from the student's recommendations — junior testers
  // are Grade 3+, so their recs are all m_3_* skills with zero junior stock,
  // which made every world dead-end on "Let's try a different game!". Instead we
  // ask the server which junior skills exist (optionally scoped to the world),
  // then try them in order until one yields visual questions.
  async function loadSkill(studentId) {
    try {
      const rr = await fetch(`/api/student/junior-skills${world ? `?world=${world}` : ''}`)
      const rd = await rr.json()
      let pool = (rd.skills || []).filter(s => s.id)
      if (!pool.length) {
        // World has no junior stock (money/times/fractions) — fall back to the
        // full junior list so the game still starts.
        const all = await (await fetch('/api/student/junior-skills')).json()
        pool = (all.skills || []).filter(s => s.id)
      }
      if (!pool.length) { setError("Let's try a different game!"); return }

      // Shuffle so repeated visits vary the skill, then try each until one loads.
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      for (const s of shuffled) {
        const loaded = await loadQuestions(s.id, studentId, s.name)
        if (loaded) return
      }
      setError("Let's try a different game!")
    } catch { setError('Could not start the game.') }
  }

  // Fetch junior questions for one skill. Returns true if it produced a usable
  // batch (and updated state), false so the caller can try the next skill.
  async function loadQuestions(skillId, studentId, skillName) {
    try {
      const res = await fetch(`/api/student/questions?skillId=${skillId}&studentId=${studentId}&mode=junior&limit=8`)
      const data = await res.json()
      const qs = (data.questions || []).filter(q => q.visual)
      if (!qs.length) return false
      setSkill({ id: skillId, name: skillName || getSkillInfo(skillId)?.name || 'Maths' })
      setQuestions(qs)
      setIndex(0)
      setPicked(null); setCorrect(null)
      setError('')
      return true
    } catch { return false }
  }

  // Narrate each question + its options as it appears.
  useEffect(() => {
    const q = questions[index]
    if (!q) return
    setRobot('talking')
    const say = q.narration || q.question || ''
    heroSpeak(say, () => setRobot('talking'), () => setRobot('idle'), me?.userId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questions])

  const q = questions[index]

  async function answer(opt) {
    if (busyRef.current || picked != null || !q) return
    busyRef.current = true
    setPicked(opt)
    heroStop()
    try {
      const res = await fetch('/api/student/answer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: me.userId, skillId: skill.id, questionId: q.questionId,
          answer: opt, timeTakenMs: 4000, hintUsed: false, difficulty: q.difficulty || 0.3,
        }),
      })
      const result = await res.json()
      const isCorrect = !!result.correct
      setCorrect(isCorrect)
      // Advance only AFTER Hero finishes speaking (so the praise isn't cut off).
      // onEnd fires when TTS completes; a safety timeout covers a silent/failed
      // TTS so the game never stalls. advanceOnce guards against double-firing.
      let advanced = false
      const advance = () => { if (advanced) return; advanced = true; next() }
      const speakThenAdvance = (text) =>
        heroSpeak(text, undefined, () => setTimeout(advance, 600), me.userId)

      if (isCorrect) {
        comboRef.current += 1
        const newBest = comboRef.current > bestRef.current
        if (newBest) bestRef.current = comboRef.current
        setRobot('happy')
        const msg = comboMessage(comboRef.current, { newBest })
        setReward({ id: Date.now(), xp: result.xpGained || 10, coins: result.coinsGained || 5, message: msg })
        speakThenAdvance(msg.replace(/[^\w !?,'-]/g, ''))
      } else {
        comboRef.current = 0
        setRobot('sad')
        speakThenAdvance(`Good try! The answer is ${result.correctAnswer}. Let's keep going!`)
      }
      // Safety net: if speech never ends (no key / blocked), advance anyway.
      setTimeout(advance, 7000)
    } catch {
      setTimeout(() => next(), 800)
    } finally {
      busyRef.current = false
    }
  }

  async function next() {
    heroStop()
    setPicked(null); setCorrect(null); setRobot('idle')
    if (index + 1 < questions.length) {
      setIndex(i => i + 1)
    } else if (me) {
      // AI picks the next skill + a fresh batch (Duolingo-style auto-advance).
      await loadSkill(me.userId)
    }
  }

  if (error) {
    return (
      <Shell>
        <RoboVideo src="/assets/robot/thinkinggotidearobo.MP4" width={140} loop card />
        <p style={{ color: NAVY, fontSize: 20, fontWeight: 800, marginTop: 8 }}>{error}</p>
        <BigBtn onClick={() => router.push('/student-dashboard')}>🏠 Home</BigBtn>
      </Shell>
    )
  }
  if (!q) {
    return <Shell><RoboVideo src="/assets/robot/robowalking.MP4" width={150} loop card /><p style={{ color: NAVY, fontWeight: 800, marginTop: 8 }}>Getting your game ready…</p></Shell>
  }

  const robotSrc = {
    talking: '/assets/robot/thinkinggotidearobo.MP4',
    happy: '/assets/robot/happyjumpingrobo.MP4',
    sad: '/assets/robot/sadrobo.MP4',
    idle: '/assets/robot/hero-robot.png',
    waving: '/assets/robot/wavingrobo.MP4',
  }[robot]

  return (
    <Shell>
      <RewardBurst burst={reward} />

      {/* Top bar: home + progress dots + Show me */}
      <div style={{ position: 'absolute', top: 14, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
        <button onClick={() => { heroStop(); router.push('/student-dashboard') }} aria-label="Home" style={iconBtn}>🏠</button>
        <div style={{ display: 'flex', gap: 6 }}>
          {questions.map((_, i) => (
            <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: i < index ? GOLD : i === index ? NAVY : '#CBD5E1' }} />
          ))}
        </div>
        <button onClick={() => { heroStop(); setShowTutor(true) }} style={{ ...iconBtn, width: 'auto', padding: '0 14px', fontSize: 16, fontWeight: 800 }}>👀 Show me</button>
      </div>

      {/* Hero — carded so the robot's white background reads as a clean framed
          portrait over the page gradient (matches welcome screen + mobile). */}
      <div style={{ marginTop: 36 }}>
        {robotSrc.endsWith('.png')
          ? <div style={{ background: 'white', borderRadius: 20, border: '2px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 8, display: 'inline-flex' }}>
              <img src={robotSrc} alt="Hero" style={{ width: 96, display: 'block' }} />
            </div>
          : <RoboVideo src={robotSrc} width={110} loop={robot === 'talking' || robot === 'waving'} card />}
      </div>

      {/* Prompt + replay */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 4px' }}>
        <h1 style={{ color: NAVY, fontSize: 24, fontWeight: 900, margin: 0, textAlign: 'center' }}>{q.question}</h1>
        <button onClick={() => heroSpeak(q.narration || q.question, undefined, undefined, me?.userId)} aria-label="Hear it again" style={{ ...iconBtn, fontSize: 18 }}>🔊</button>
      </div>

      {/* The visual */}
      <div style={{ background: 'white', borderRadius: 24, border: '3px solid #E2E8F0', padding: 18, margin: '8px 0 18px', minWidth: 280, maxWidth: 440, width: '92%', boxShadow: '0 8px 22px rgba(0,0,0,0.06)' }}>
        <VisualRender visual={q.visual} />
      </div>

      {/* Big answer buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: q.options.length > 3 ? '1fr 1fr' : `repeat(${q.options.length}, 1fr)`, gap: 12, width: '92%', maxWidth: 440 }}>
        {q.options.map((opt, i) => {
          const isPicked = picked === opt
          const showCorrect = picked != null && correct != null && (isPicked ? correct : false)
          let bg = 'white', bd = '#E2E8F0', col = NAVY
          if (picked != null) {
            if (isPicked && correct) { bg = '#ECFDF5'; bd = '#22C55E'; col = '#15803D' }
            else if (isPicked && !correct) { bg = '#FEF2F2'; bd = '#FCA5A5'; col = '#B91C1C' }
          }
          return (
            <button key={i} onClick={() => answer(opt)} disabled={picked != null} style={{
              background: bg, border: `3px solid ${bd}`, color: col, borderRadius: 20,
              padding: '20px 10px', fontSize: 30, fontWeight: 900,
              cursor: picked != null ? 'default' : 'pointer', transition: 'transform 0.1s',
            }}>
              {opt}{isPicked && correct ? ' ✅' : isPicked && correct === false ? ' ❌' : ''}
            </button>
          )
        })}
      </div>

      {showTutor && (
        <HeroTutor
          question={q.question}
          skillId={skill.id}
          skillName={skill.name}
          studentId={me?.userId}
          studentName={me?.name || 'friend'}
          grade={me?.grade ?? 0}
          questionId={q.questionId}
          onClose={() => setShowTutor(false)}
        />
      )}
    </Shell>
  )
}

const iconBtn = {
  background: 'white', border: '2px solid #E2E8F0', borderRadius: 16, width: 44, height: 44,
  fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

function Shell({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #EAF3FF 0%, #FFF6E5 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      padding: '16px 12px 40px', position: 'relative', fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>{children}</div>
  )
}
function BigBtn({ children, onClick }) {
  return <button onClick={onClick} style={{ marginTop: 16, background: GOLD, color: 'white', border: 'none', borderRadius: 20, padding: '14px 36px', fontSize: 20, fontWeight: 900, cursor: 'pointer' }}>{children}</button>
}

export default function JuniorPlayPage() {
  return (
    <Suspense fallback={<Shell><p style={{ color: NAVY, fontWeight: 800 }}>Loading…</p></Shell>}>
      <JuniorPlayInner />
    </Suspense>
  )
}
