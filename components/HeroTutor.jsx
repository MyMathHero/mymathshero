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
// Whiteboard → dark "chalkboard" surface so it sits in the navy tutor chrome
// instead of a harsh bright-white panel. Chalk-coloured text reads on it.
const BOARD_BG = '#10243F'        // deep slate board
const BOARD_TEXT = '#EAF2FF'      // chalk white (say)
const BOARD_WRITE = '#BFD8FF'     // light blue chalk (working)
const BOARD_RESULT = '#5EE6A8'    // green chalk (answer)
const BOARD_RESULT_BG = 'rgba(94,230,168,0.14)'
const BOARD_MUTED = '#9DB4D4'     // hints/labels

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

  // ── Practice phase ────────────────────────────────────────────────────────
  // After the lesson, the student tries a SIMILAR example before going back to
  // their real question. phase: 'lesson' → 'practice' → 'result'.
  const [phase, setPhase] = useState('lesson')
  const [practicePick, setPracticePick] = useState(null)
  const practiceCorrect = lesson?.example && practicePick === lesson.example.correctAnswer

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
      setPhase('lesson'); setPracticePick(null)
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

  // Move from the lesson into the practice example.
  function startPractice() {
    heroStop(); setPlaying(false)
    setPracticePick(null); setPhase('practice')
    setRobotMood('waving')
    const ex = lesson?.example
    if (ex) heroSpeak(`Now you try one! ${ex.question}`, () => setRobotMood('talking'), () => setRobotMood('idle'), studentId)
  }

  // Student answers the practice example.
  function answerPractice(opt) {
    if (practicePick != null || !lesson?.example) return
    heroStop()
    setPracticePick(opt)
    const correct = opt === lesson.example.correctAnswer
    setPhase('result')
    setRobotMood(correct ? 'happy' : 'thinking')
    if (correct) {
      heroSpeak("Brilliant! You've got it — now head back and answer your real question. 🎉", () => setRobotMood('talking'), () => setRobotMood('idle'), studentId)
    } else {
      // Wrong → show the worked example again on the whiteboard, then send back.
      heroSpeak(`Good try! Let's look at how it's done, then you'll be ready for your question.`, () => setRobotMood('talking'), () => setRobotMood('idle'), studentId)
    }
  }

  // From a wrong answer, replay the worked lesson on the whiteboard.
  function reviewWorked() {
    setPhase('lesson'); heroStop(); setStepIndex(0); setPlaying(true)
  }

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
        <div style={{
          position: 'relative', width: general ? 44 : 72, height: general ? 44 : 72, flexShrink: 0,
          borderRadius: '50%', overflow: 'hidden', border: `2px solid ${GOLD}`,
          background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {speaking && <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `3px solid ${GOLD}`, animation: 'htPulse 1s infinite' }} />}
          {/* Header is dark navy → use 'screen' blend so the robot isn't crushed to black. */}
          {robot.type === 'video'
            ? <RoboVideo src={robot.src} width={(general ? 44 : 72) * 1.15} loop={robot.loop} blend="screen" />
            : <img src={robot.src} alt="Hero" style={{ width: (general ? 44 : 72) * 1.15, mixBlendMode: 'screen' }} />}
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
                <p style={{ color: '#94A3B8', fontSize: 11, margin: '0 0 4px' }}>Your question</p>
                <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>{question}</p>
              </div>
            )}

            {phase === 'practice' && lesson?.example ? (
              /* ── Practice example (tap to answer) ─────────────────────────── */
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: BOARD_BG, borderRadius: 16, border: `3px solid ${GOLD}`, padding: 22 }}>
                  <p style={{ color: BOARD_MUTED, fontSize: 13, margin: '0 0 6px', fontWeight: 700 }}>✏️ Your turn — try this one:</p>
                  <p style={{ color: BOARD_TEXT, fontSize: 22, fontWeight: 800, margin: 0 }}>{lesson.example.question}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {lesson.example.options.map((opt, i) => (
                    <button key={i} onClick={() => answerPractice(opt)}
                      style={{
                        background: 'rgba(255,255,255,0.06)', border: `2px solid ${GOLD}`, borderRadius: 14,
                        padding: '16px 12px', fontSize: 20, fontWeight: 800, color: BOARD_TEXT, cursor: 'pointer',
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : phase === 'result' ? (
              /* ── Result ───────────────────────────────────────────────────── */
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 56 }}>{practiceCorrect ? '🎉' : '💪'}</div>
                <p style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
                  {practiceCorrect ? "You've got it!" : 'Good try — let’s review it'}
                </p>
                <p style={{ color: '#94A3B8', fontSize: 15, margin: 0, maxWidth: 420 }}>
                  {practiceCorrect
                    ? 'Now head back and answer your real question.'
                    : (lesson?.example?.hint || 'Watch the worked example, then go back and try your question.')}
                </p>
                {!practiceCorrect && lesson?.steps?.length > 0 && (
                  <button onClick={reviewWorked} style={ctaBtn('rgba(255,255,255,0.12)', 'white')}>
                    👀 Show me worked out
                  </button>
                )}
                <button onClick={handleClose} style={ctaBtn(GOLD, NAVY)}>
                  ← Back to my question
                </button>
              </div>
            ) : (
              /* ── Lesson whiteboard ─────────────────────────────────────────── */
              <>
                <div style={{
                  flex: 1, minHeight: 0, overflowY: 'auto',
                  background: BOARD_BG, borderRadius: 16, border: `3px solid ${GOLD}`,
                  padding: 22, fontFamily: "'Patrick Hand', cursive",
                }}>
                  {loadingLesson && <p style={{ color: BOARD_MUTED, fontSize: 18 }}>Hero is preparing your lesson… ✦✦✦</p>}
                  {lessonError && <p style={{ color: '#FCA5A5', fontSize: 18 }}>{lessonError}</p>}
                  {!loadingLesson && !lessonError && lesson && (
                    <p style={{ color: BOARD_MUTED, fontSize: 13, margin: '0 0 10px', fontWeight: 700 }}>
                      📘 Here’s a similar example (not your question):
                    </p>
                  )}
                  {visibleSteps.map((s, i) => (
                    <div key={i} style={{ marginBottom: 18, animation: 'htFade 0.3s ease' }}>
                      {s.say && <p style={{ color: BOARD_TEXT, fontSize: 20, margin: '0 0 6px', lineHeight: 1.4 }}>{s.say}</p>}
                      {s.write && (
                        <div style={{
                          display: 'inline-block',
                          fontSize: s.emphasis === 'result' ? 30 : 24,
                          fontWeight: s.emphasis === 'result' ? 700 : 400,
                          color: s.emphasis === 'result' ? BOARD_RESULT : BOARD_WRITE,
                          background: s.emphasis === 'result' ? BOARD_RESULT_BG : 'transparent',
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 12, flexWrap: 'wrap' }}>
                    <CtrlBtn onClick={replay} title="Restart">⏮</CtrlBtn>
                    <CtrlBtn onClick={prevStep} title="Previous step" disabled={stepIndex === 0}>◀</CtrlBtn>
                    {playing
                      ? <CtrlBtn onClick={pause} title="Pause" big>⏸</CtrlBtn>
                      : <CtrlBtn onClick={play} title="Play" big>▶</CtrlBtn>}
                    <CtrlBtn onClick={nextStep} title="Next step" disabled={stepIndex >= lesson.steps.length - 1}>▶</CtrlBtn>
                    <span style={{ color: '#94A3B8', fontSize: 13, margin: '0 8px' }}>
                      Step {stepIndex + 1} / {lesson.steps.length}
                    </span>
                    {/* When the lesson is finished and there's an example, invite a try. */}
                    {lesson.example && stepIndex >= lesson.steps.length - 1 && !playing && (
                      <button onClick={startPractice} style={ctaBtn(GOLD, NAVY)}>Let me try one →</button>
                    )}
                  </div>
                )}

                {/* Always-available escape back to the real question. */}
                {lesson && (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                      ← Back to my question
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          // Ask Hero chat, embedded (HeroTutor owns the robot/header/X above).
          <div style={{ flex: 1, minHeight: 0, background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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

function ctaBtn(bg, color) {
  return { background: bg, color, border: 'none', borderRadius: 14, padding: '12px 22px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }
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
