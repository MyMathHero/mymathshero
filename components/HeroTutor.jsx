'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import FractionVisual from './FractionVisual'
import AskHero from './AskHero'
import Manipulative from './manipulatives/Manipulative'
import { heroSpeak, heroStop } from '@/lib/heroVoice'


const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'
// Whiteboard → dark "chalkboard" surface so it sits in the navy tutor chrome
// instead of a harsh bright-white panel. Chalk-coloured text reads on it.
const BOARD_BG = '#FFFFFF'        // white board
const BOARD_TEXT = '#1B2B4B'      // navy (say)
const BOARD_WRITE = '#2D4A7A'     // deep blue (working)
const BOARD_RESULT = '#059669'    // green (answer) — darker so it reads on white
const BOARD_RESULT_BG = 'rgba(5,150,105,0.12)'
const BOARD_MUTED = '#64748B'     // hints/labels

/**
 * Full-screen, voice-guided AI tutor. Two tabs:
 *   • "Teach Me" — animated whiteboard lesson (steps revealed one at a time with
 *     synced voice), fetched from /api/student/lesson.
 *   • "Ask Hero" — the existing chat (rendered embedded).
 * Closing returns to the EXACT question (parent keeps practiceModal mounted).
 */
export default function HeroTutor({
  question, questionVisual, questionOptions, skillId, skillName, studentId, studentName = 'Hero',
  grade = 3, questionId, onClose,
}) {
  const general = !question
  // Default to Teach Me when there's a question to teach; otherwise chat.
  const [tab, setTab] = useState(general ? 'ask' : 'teach')
  const [robotMood, setRobotMood] = useState('waving')
  const [isMuted, setIsMuted] = useState(false)
  // Stack the lesson split vertically on narrow screens.
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const check = () => setNarrow(typeof window !== 'undefined' && window.innerWidth < 860)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
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

  // The scrolling whiteboard container — auto-scrolled to the newest step so
  // students never have to scroll manually to see what Hero just wrote.
  const boardRef = useRef(null)
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    // Wait a frame so the newly revealed step is laid out before we scroll.
    requestAnimationFrame(() => { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }) })
  }, [stepIndex, lesson])

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

  const speaking = robotMood === 'talking'
  const visibleSteps = lesson ? lesson.steps.slice(0, stepIndex + 1) : []
  // Only split the screen when the question has a diagram to show on the right.
  // Otherwise the whiteboard goes full-width (with Hero peeking inside it).
  const hasDiagram = !!(question && questionVisual)

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

      {/* Top band. Full-screen tutor: just the skill name + controls (the robot
          + "Hero is teaching" title were removed — Hero now lives in the panels
          below). General chat widget: keep the compact avatar + "Ask Hero". */}
      <div style={{ display: 'flex', alignItems: 'center', gap: general ? 10 : 14, padding: general ? '12px 14px' : '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {general && (
          <div style={{
            position: 'relative', width: 44, height: 44, flexShrink: 0,
            borderRadius: '50%', overflow: 'hidden', border: `2px solid ${GOLD}`,
            background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {speaking && <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `3px solid ${GOLD}`, animation: 'htPulse 1s infinite', zIndex: 2 }} />}
            <img src="/assets/robot/heroprofilepic.png" alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: general ? 15 : 18, margin: 0 }}>
            {general ? <>Ask <span style={{ color: GOLD }}>Hero</span> ✦</> : <>{skillName || 'Understand the concept'} <span style={{ color: GOLD }}>✦</span></>}
          </p>
          {general && (
            <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {speaking ? '🔊 Speaking…' : 'Your AI Maths Tutor'}
            </p>
          )}
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
            {/* Compact question reference for the practice/result phases (the
                lesson phase shows the full question card in its right panel). */}
            {question && phase !== 'lesson' && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                <p style={{ color: '#94A3B8', fontSize: 11, margin: '0 0 4px' }}>📝 Your question</p>
                <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>{question}</p>
                {questionVisual && (
                  <div style={{ marginTop: 10, background: 'white', borderRadius: 10, padding: 10, maxWidth: 360 }}>
                    <FractionVisual visual={questionVisual} />
                  </div>
                )}
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
                        background: '#FFFFFF', border: `2px solid ${GOLD}`, borderRadius: 14,
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
              /* ── Lesson: split view (lesson left · question+diagram right) ──── */
              <>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: narrow ? 'column' : 'row', gap: 16, overflowY: narrow ? 'auto' : 'visible' }}>
                  {/* LEFT — the whiteboard. Full-width when there's no diagram to show;
                      shares the row (flex 1.5) when a diagram card sits on the right. */}
                  <div style={{ flex: narrow ? 'none' : (hasDiagram ? 1.5 : 1), minWidth: 0, minHeight: narrow ? 300 : 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {/* Talking Hero inside a CLEAN CIRCLE (clipped, no spilling) + bubble */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                      <div style={{
                        width: 96, height: 96, flexShrink: 0, position: 'relative',
                        borderRadius: '50%', overflow: 'hidden', border: `3px solid ${GOLD}`,
                        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {speaking && <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: `3px solid #34D399`, animation: 'htPulse 1s infinite', zIndex: 2 }} />}
                        {/* Clean Hero profile photo (white bg → owns the white circle). */}
                        <img src="/assets/robot/heroprofilepic.png" alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ position: 'relative', background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 18px', flex: 1, minWidth: 0 }}>
                        <p style={{ color: GOLD, fontWeight: 800, fontSize: 17, margin: '0 0 3px' }}>Let’s solve this together! 💡</p>
                        <p style={{ color: '#CBD5E1', fontSize: 13, margin: 0 }}>I’ll help you understand step by step.</p>
                      </div>
                    </div>

                    {/* Lesson whiteboard — bigger, roomier text; auto-scrolls to
                        the newest step (boardRef effect above). */}
                    <div ref={boardRef} style={{
                      position: 'relative', flex: 1, minHeight: narrow ? 220 : 0, overflowY: 'auto',
                      background: BOARD_BG, borderRadius: 16, border: `3px solid ${GOLD}`,
                      padding: 26, fontFamily: "'Patrick Hand', cursive",
                    }}>
                      {loadingLesson && <p style={{ color: BOARD_MUTED, fontSize: 18 }}>Hero is preparing your lesson… ✦✦✦</p>}
                      {lessonError && <p style={{ color: '#FCA5A5', fontSize: 18 }}>{lessonError}</p>}
                      {!loadingLesson && !lessonError && lesson && (
                        <p style={{ color: BOARD_MUTED, fontSize: 14, margin: '0 0 12px', fontWeight: 700 }}>
                          📘 Here’s a similar example (not your question):
                        </p>
                      )}
                      {visibleSteps.map((s, i) => (
                        <div key={i} style={{ marginBottom: 18, animation: 'htFade 0.3s ease' }}>
                          {s.say && <p style={{ color: BOARD_TEXT, fontSize: 22, margin: '0 0 8px', lineHeight: 1.45 }}>{s.say}</p>}
                          {s.write && (
                            <div style={{
                              display: 'inline-block',
                              fontSize: s.emphasis === 'result' ? 32 : 26,
                              fontWeight: s.emphasis === 'result' ? 700 : 400,
                              color: s.emphasis === 'result' ? BOARD_RESULT : BOARD_WRITE,
                              background: s.emphasis === 'result' ? BOARD_RESULT_BG : 'transparent',
                              padding: s.emphasis === 'result' ? '4px 14px' : 0,
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

                    {/* Full-width board (no diagram): Hero peeks up over the bottom edge
                        of the whiteboard, hands on the frame so it looks like he's holding
                        it. Pinned to the panel (NOT the scrolling board) so it stays put as
                        the lesson scrolls. The PNG already has a transparent background, so
                        no blend/frame is needed. */}
                    {!hasDiagram && !narrow && (
                      <img src="/assets/robot/Heropeekingfromdown.png" alt="" aria-hidden
                        style={{
                          position: 'absolute', bottom: -18, right: 20, width: 160, height: 'auto',
                          pointerEvents: 'none', zIndex: 3,
                        }} />
                    )}
                  </div>

                  {/* RIGHT — WHITE "Your question" card, shown ONLY when the question
                      has a diagram (otherwise the whiteboard is full-width). Shows the
                      question, its diagram, and the answer choices as a read-only
                      reminder (they answer back in practice). */}
                  {hasDiagram && (
                    <div style={{ flex: 1, minWidth: 0, minHeight: narrow ? 'auto' : 0, display: 'flex', flexDirection: 'column' }}>
                      <div style={{
                        // Fit content, but never overflow the panel — scroll if tall.
                        position: 'relative', maxHeight: '100%', overflow: 'hidden',
                        background: 'white', borderRadius: 16, border: `1px solid ${GOLD}55`,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.25)', padding: 22, paddingBottom: 8,
                        display: 'flex', flexDirection: 'column',
                      }}>
                        {/* Hero peeks up from the bottom-right. PNG has a transparent bg, so no blend needed. */}
                        <img src="/assets/robot/Heropeekingfromdown.png" alt="" aria-hidden
                          style={{ position: 'absolute', bottom: -8, right: 8, width: 140, height: 'auto', pointerEvents: 'none', zIndex: 1 }} />

                        {/* Scrollable content, above the peeking Hero; pad the bottom so
                            the choices don't hide behind him. */}
                        <div style={{ position: 'relative', zIndex: 2, overflowY: 'auto', paddingBottom: 90 }}>
                          <p style={{ color: '#64748B', fontSize: 12, margin: '0 0 8px', fontWeight: 700 }}>📝 Your question</p>
                          <p style={{ color: '#1B2B4B', fontWeight: 800, fontSize: 21, margin: 0, lineHeight: 1.35 }}>{question}</p>

                          {questionVisual && (
                            <div style={{ marginTop: 16, background: '#F8FAFC', borderRadius: 12, padding: 16, border: '1px solid #E2E8F0' }}>
                              <FractionVisual visual={questionVisual} />
                            </div>
                          )}

                          {/* Answer choices — a read-only reminder of what they'll pick. */}
                          {Array.isArray(questionOptions) && questionOptions.length > 0 && (
                            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <p style={{ color: '#94A3B8', fontSize: 11, margin: 0, fontWeight: 700, letterSpacing: 0.3 }}>THE CHOICES</p>
                              {questionOptions.map((opt, i) => (
                                <div key={i} style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
                                  padding: '12px 14px',
                                }}>
                                  <span style={{
                                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                    background: '#EEF2F7', color: '#64748B', fontWeight: 800, fontSize: 13,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>{String.fromCharCode(65 + i)}</span>
                                  <span style={{ color: '#1B2B4B', fontWeight: 600, fontSize: 16 }}>{String(opt).replace(/^\s*[A-Da-d][).:]\s*/, '')}</span>
                                </div>
                              ))}
                              <p style={{ color: '#94A3B8', fontSize: 12, margin: '2px 0 0', fontStyle: 'italic' }}>
                                You’ll pick your answer back on your question 👍
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls: prev/play/next + STEP DOTS + try-one */}
                {lesson && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 14, flexWrap: 'wrap' }}>
                    <CtrlBtn onClick={replay} title="Restart">⏮</CtrlBtn>
                    <CtrlBtn onClick={prevStep} title="Previous step" disabled={stepIndex === 0}>◀</CtrlBtn>
                    {playing
                      ? <CtrlBtn onClick={pause} title="Pause" big>⏸</CtrlBtn>
                      : <CtrlBtn onClick={play} title="Play" big>▶</CtrlBtn>}
                    <CtrlBtn onClick={nextStep} title="Next step" disabled={stepIndex >= lesson.steps.length - 1}>▶</CtrlBtn>
                    {/* Step dots */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 6px' }}>
                      {lesson.steps.map((_, i) => (
                        <span key={i} style={{
                          width: i === stepIndex ? 22 : 8, height: 8, borderRadius: 99,
                          background: i === stepIndex ? GOLD : i < stepIndex ? 'rgba(196,154,26,0.5)' : 'rgba(255,255,255,0.2)',
                          transition: 'all 0.3s ease',
                        }} />
                      ))}
                    </div>
                    <span style={{ color: '#94A3B8', fontSize: 13 }}>Step {stepIndex + 1} / {lesson.steps.length}</span>
                    {lesson.example && stepIndex >= lesson.steps.length - 1 && !playing && (
                      <button onClick={startPractice} style={ctaBtn(GOLD, NAVY)}>Let me try one →</button>
                    )}
                  </div>
                )}

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
