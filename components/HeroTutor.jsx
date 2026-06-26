'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import RoboVideo from './RoboVideo'
import AskHero from './AskHero'
import Manipulative from './manipulatives/Manipulative'
import { heroSpeak, heroStop } from '@/lib/heroVoice'

// Robot mood → asset. Mirrors AskHero's ROBOT_STATES so the character is consistent.
const ROBOT = {
  idle:     { type: 'img', src: '/assets/robot/hero-robot.png' },
  thinking: { type: 'video', src: '/assets/robot/thinkinggotidearobo.MP4', loop: true },
  talking:  { type: 'video', src: '/assets/robot/thinkinggotidearobo.MP4', loop: true },
  happy:    { type: 'video', src: '/assets/robot/happyjumpingrobo.MP4', loop: false },
  waving:   { type: 'video', src: '/assets/robot/wavingrobo.MP4', loop: true },
}

const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'

/**
 * Full-screen, voice-guided AI tutor. Two tabs:
 *   • "Teach Me" — animated whiteboard lesson (steps revealed one at a time with
 *     synced voice), fetched from /api/student/lesson.
 *   • "Ask Hero" — the existing chat (rendered embedded).
 * Closing returns to the EXACT question (parent keeps practiceModal mounted).
 */
export default function HeroTutor({
  question, skillId, skillName, studentId, studentName = 'Hero',
  grade = 3, questionId, onClose,
}) {
  const general = !question
  // Default to Teach Me when there's a question to teach; otherwise chat.
  const [tab, setTab] = useState(general ? 'ask' : 'teach')
  const [robotMood, setRobotMood] = useState('waving')
  const [isMuted, setIsMuted] = useState(false)
  const mutedRef = useRef(false)
  useEffect(() => { mutedRef.current = isMuted }, [isMuted])

  // ── Lesson state ──────────────────────────────────────────────────────────
  const [lesson, setLesson] = useState(null)
  const [loadingLesson, setLoadingLesson] = useState(false)
  const [lessonError, setLessonError] = useState('')
  const [stepIndex, setStepIndex] = useState(0)   // last revealed step
  const [playing, setPlaying] = useState(false)
  const playingRef = useRef(false)
  useEffect(() => { playingRef.current = playing }, [playing])

  const fetchLesson = useCallback(async () => {
    if (general || lesson || loadingLesson) return
    setLoadingLesson(true); setLessonError(''); setRobotMood('thinking')
    try {
      const res = await fetch('/api/student/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText: question, questionId, skillId, studentId, grade }),
      })
      const data = await res.json()
      if (data?.upgrade) { setLessonError(data.message || 'Teach Me is a Premium feature 💎'); setRobotMood('idle'); return }
      if (!data?.lesson?.steps?.length) { setLessonError("I couldn't build a lesson right now."); setRobotMood('idle'); return }
      setLesson(data.lesson)
      setStepIndex(0)
      setPlaying(true) // auto-start the lesson
    } catch {
      setLessonError("I had trouble connecting. Try again! 🤖")
      setRobotMood('idle')
    } finally {
      setLoadingLesson(false)
    }
  }, [general, lesson, loadingLesson, question, questionId, skillId, studentId, grade])

  // Fetch the lesson the first time the Teach Me tab is shown.
  useEffect(() => {
    if (tab === 'teach') fetchLesson()
  }, [tab, fetchLesson])

  // Speak the current step; advance on speech end while playing.
  const speakStep = useCallback((idx) => {
    if (!lesson) return
    const step = lesson.steps[idx]
    if (!step) return
    const advance = () => {
      if (!playingRef.current) { setRobotMood('idle'); return }
      if (idx + 1 < lesson.steps.length) {
        setStepIndex(idx + 1)
        // speakStep for the next index fires from the stepIndex effect below.
      } else {
        setPlaying(false)
        setRobotMood('happy')
      }
    }
    if (mutedRef.current || !step.say) {
      setRobotMood('talking')
      // No voice — hold the step briefly so the writing animates, then advance.
      const t = setTimeout(advance, Math.min(4500, 1200 + (step.write?.length || 0) * 40))
      return () => clearTimeout(t)
    }
    setRobotMood('talking')
    heroSpeak(step.say, () => setRobotMood('talking'), advance, studentId)
  }, [lesson, studentId])

  // Whenever the revealed step changes while playing, narrate it.
  useEffect(() => {
    if (tab !== 'teach' || !lesson || !playing) return
    const cleanup = speakStep(stepIndex)
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, playing, lesson, tab])

  useEffect(() => () => heroStop(), [])

  function handleClose() { heroStop(); onClose?.() }
  function toggleMute() { if (!isMuted) heroStop(); setIsMuted(m => !m) }

  function play() { if (lesson) { setPlaying(true) } }
  function pause() { heroStop(); setPlaying(false); setRobotMood('idle') }
  function nextStep() {
    if (!lesson) return
    heroStop()
    setStepIndex(i => Math.min(lesson.steps.length - 1, i + 1))
  }
  function prevStep() {
    if (!lesson) return
    heroStop()
    setStepIndex(i => Math.max(0, i - 1))
  }
  function replay() { heroStop(); setStepIndex(0); setPlaying(true) }

  const robot = ROBOT[robotMood] || ROBOT.idle
  const speaking = robotMood === 'talking'
  const visibleSteps = lesson ? lesson.steps.slice(0, stepIndex + 1) : []

  // General mode (the floating "Ask Hero" with no question to teach) renders as a
  // small rounded chat widget docked bottom-right — like a normal site chatbot,
  // NOT full-screen. Teach-me mode (a real question) stays full-screen so the
  // whiteboard lesson has room.
  const shellStyle = general
    ? {
        position: 'fixed', bottom: 24, right: 24, zIndex: 3000,
        width: 'min(400px, calc(100vw - 32px))',
        height: 'min(620px, calc(100vh - 48px))',
        background: NAVY, display: 'flex', flexDirection: 'column',
        borderRadius: 20, overflow: 'hidden',
        border: `2px solid ${GOLD}`,
        boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
      }
    : { position: 'fixed', inset: 0, zIndex: 3000, background: NAVY, display: 'flex', flexDirection: 'column' }

  return (
    <div style={shellStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');
        @keyframes htPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(1.06)} }
        @keyframes htWrite { from{clip-path:inset(0 100% 0 0);opacity:.3} to{clip-path:inset(0 0 0 0);opacity:1} }
        @keyframes htFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Top band: robot + title + controls + X (compact in the small widget) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: general ? 10 : 14, padding: general ? '12px 14px' : '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ position: 'relative', width: general ? 44 : 72, height: general ? 44 : 72, flexShrink: 0 }}>
          {speaking && <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `3px solid ${GOLD}`, animation: 'htPulse 1s infinite' }} />}
          {robot.type === 'video'
            ? <RoboVideo src={robot.src} width={general ? 44 : 72} loop={robot.loop} />
            : <img src={robot.src} alt="Hero" style={{ width: general ? 44 : 72, mixBlendMode: 'multiply' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: general ? 15 : 18, margin: 0 }}>
            {general ? <>Ask <span style={{ color: GOLD }}>Hero</span> ✦</> : <>Hero is teaching <span style={{ color: GOLD }}>✦</span></>}
          </p>
          <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {speaking ? '🔊 Speaking…' : (skillName || 'Your AI Maths Tutor')}
          </p>
        </div>
        <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'} style={iconBtn(isMuted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)')}>
          {isMuted ? '🔇' : '🔊'}
        </button>
        <button onClick={handleClose} aria-label="Close tutor" style={{ ...iconBtn('rgba(255,255,255,0.1)'), fontSize: 20, fontWeight: 700 }}>×</button>
      </div>

      {/* Tabs — hidden in general mode (only one tab, no need for a switcher). */}
      {!general && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 18px 0' }}>
          <TabBtn active={tab === 'teach'} onClick={() => setTab('teach')}>✏️ Teach Me</TabBtn>
          <TabBtn active={tab === 'ask'} onClick={() => { heroStop(); setPlaying(false); setTab('ask') }}>💬 Ask Hero</TabBtn>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, padding: general ? 12 : 18, display: 'flex', flexDirection: 'column' }}>
        {tab === 'teach' ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Question reference */}
            {question && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                <p style={{ color: '#94A3B8', fontSize: 11, margin: '0 0 4px' }}>Question</p>
                <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>{question}</p>
              </div>
            )}

            {/* Whiteboard */}
            <div style={{
              flex: 1, minHeight: 0, overflowY: 'auto',
              background: '#FCFBF7', borderRadius: 16, border: `3px solid ${GOLD}`,
              padding: 22, fontFamily: "'Patrick Hand', cursive",
            }}>
              {loadingLesson && <p style={{ color: '#64748B', fontSize: 18 }}>Hero is preparing your lesson… ✦✦✦</p>}
              {lessonError && <p style={{ color: '#B91C1C', fontSize: 18 }}>{lessonError}</p>}
              {visibleSteps.map((s, i) => (
                <div key={i} style={{ marginBottom: 18, animation: 'htFade 0.3s ease' }}>
                  {s.say && <p style={{ color: NAVY, fontSize: 20, margin: '0 0 6px', lineHeight: 1.4 }}>{s.say}</p>}
                  {s.write && (
                    <div style={{
                      display: 'inline-block',
                      fontSize: s.emphasis === 'result' ? 30 : 24,
                      fontWeight: s.emphasis === 'result' ? 700 : 400,
                      color: s.emphasis === 'result' ? '#15803d' : '#0f3d6e',
                      background: s.emphasis === 'result' ? '#ECFDF5' : 'transparent',
                      padding: s.emphasis === 'result' ? '4px 12px' : 0,
                      borderRadius: 8,
                      animation: i === stepIndex ? 'htWrite 0.7s ease forwards' : undefined,
                    }}>
                      {s.write}
                    </div>
                  )}
                </div>
              ))}
              {lesson?.manipulative && stepIndex >= lesson.steps.length - 1 && (
                <div style={{ marginTop: 12 }}><Manipulative tool={lesson.manipulative} /></div>
              )}
            </div>

            {/* Lesson controls */}
            {lesson && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 12 }}>
                <CtrlBtn onClick={replay} title="Restart">⏮</CtrlBtn>
                <CtrlBtn onClick={prevStep} title="Previous step" disabled={stepIndex === 0}>◀</CtrlBtn>
                {playing
                  ? <CtrlBtn onClick={pause} title="Pause" big>⏸</CtrlBtn>
                  : <CtrlBtn onClick={play} title="Play" big>▶</CtrlBtn>}
                <CtrlBtn onClick={nextStep} title="Next step" disabled={stepIndex >= lesson.steps.length - 1}>▶</CtrlBtn>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 8 }}>
                  Step {stepIndex + 1} / {lesson.steps.length}
                </span>
              </div>
            )}
          </div>
        ) : (
          // Ask Hero chat, embedded (HeroTutor owns the robot/header/X above).
          <div style={{ flex: 1, minHeight: 0, background: 'white', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <AskHero
              embedded
              question={question}
              skillId={skillId}
              skillName={skillName}
              studentId={studentId}
              studentName={studentName}
              grade={grade}
              questionId={questionId}
              onClose={onClose}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function iconBtn(bg) {
  return { background: bg, border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 16, flexShrink: 0 }
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? GOLD : 'rgba(255,255,255,0.1)',
      color: 'white', border: 'none', borderRadius: '10px 10px 0 0',
      padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
    }}>{children}</button>
  )
}

function CtrlBtn({ onClick, title, children, disabled, big }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      background: disabled ? 'rgba(255,255,255,0.06)' : GOLD,
      color: disabled ? '#64748B' : 'white', border: 'none',
      width: big ? 52 : 42, height: big ? 52 : 42, borderRadius: '50%',
      cursor: disabled ? 'default' : 'pointer', fontSize: big ? 20 : 16, fontWeight: 700,
    }}>{children}</button>
  )
}
