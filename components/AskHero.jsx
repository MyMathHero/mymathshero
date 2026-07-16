'use client'
import { useState, useRef, useEffect } from 'react'
import RoboVideo from './RoboVideo'
import { heroSpeak, heroStop } from '@/lib/heroVoice'
import { startRecording, isVoiceInputSupported } from '@/lib/heroListen'
import AskHeroIcon from './AskHeroIcon'
import Manipulative from './manipulatives/Manipulative'

const ROBOT_STATES = {
  idle:      { type: 'img', src: '/assets/robot/hero-robot.png' },
  thinking:  { type: 'video', src: '/assets/robot/thinkinggotidearobo.MP4', loop: true },
  talking:   { type: 'video', src: '/assets/robot/thinkinggotidearobo.MP4', loop: true },
  happy:     { type: 'video', src: '/assets/robot/happyjumpingrobo.MP4', loop: false },
  sad:       { type: 'video', src: '/assets/robot/sadrobo.MP4', loop: false },
  waving:    { type: 'video', src: '/assets/robot/wavingrobo.MP4', loop: true },
  complete:  { type: 'video', src: '/assets/robot/happyjumpingrobo.MP4', loop: false },
}

export default function AskHero({
  question,           // current question text, or null/'' for general mode
  skillId,
  skillName,
  studentId,
  studentName = 'Hero',
  grade = 3,
  questionId,
  onClose,
  // When true, render only the chat body (no fixed overlay / header / robot) so
  // HeroTutor can host it as a tab. HeroTutor owns the robot, X, and voice chrome.
  embedded = false,
}) {
  // General mode = opened from the floating button with no question context.
  const general = !question
  const [robotState, setRobotState] = useState('waving')
  // chatHistory drives the UI; conversation (role/content) is sent to the API.
  const [chatHistory, setChatHistory] = useState([])
  const [conversation, setConversation] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  // Voice input (speech-to-speech, report #6): 'idle' | 'recording' | 'transcribing'
  const [voiceState, setVoiceState] = useState('idle')
  // Voice-first input: lead with a big mic; let the student switch to typing.
  // Default to voice when supported; if no mic support, fall straight to typing.
  const [typeMode, setTypeMode] = useState(!isVoiceInputSupported())
  const recorderRef = useRef(null)
  const voiceSupported = isVoiceInputSupported()
  const chatEndRef = useRef(null)
  // Caption sync (item 4): which Hero message is mid-speech + how many chars to
  // show. We reveal text in time with the audio so they appear together, not
  // text-first-then-voice-3s-later. -1 index = nothing speaking (show full text).
  const [reveal, setReveal] = useState({ index: -1, chars: 0 })
  const revealRaf = useRef(null)
  const mutedRef = useRef(false)

  useEffect(() => { mutedRef.current = isMuted }, [isMuted])

  // Tablet/iPad detection: on tablet-width screens the walkie-talkie docks to the
  // BOTTOM-RIGHT (where a child's thumb rests while holding an iPad) instead of
  // centre, so they don't have to reach across the screen. Phones keep it centred.
  const [isTablet, setIsTablet] = useState(false)
  useEffect(() => {
    const check = () => setIsTablet(typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth <= 1366)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Seed the conversation with a welcome message (and read it aloud).
  useEffect(() => {
    const greetTimer = setTimeout(() => {
      const welcome = general
        ? `👋 Hi ${studentName}! I'm Hero. What Maths question can I help you with today?`
        : `👋 Hi ${studentName}! I'm Hero. What part of this question would you like help with?`
      addHeroMessage(welcome, 'waving')
    }, 500)
    return () => {
      clearTimeout(greetTimer)
      heroStop()
      if (revealRaf.current) cancelAnimationFrame(revealRaf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, loading])

  // Animate the visible character count from `chars`→full over `durationMs`, so
  // the caption is revealed in time with Hero's voice (item 4).
  function startReveal(index, total, durationMs) {
    if (revealRaf.current) cancelAnimationFrame(revealRaf.current)
    if (!durationMs || durationMs <= 0) { setReveal({ index, chars: total }); return }
    const t0 = performance.now()
    const tick = (now) => {
      const frac = Math.min(1, (now - t0) / durationMs)
      setReveal({ index, chars: Math.ceil(total * frac) })
      if (frac < 1) revealRaf.current = requestAnimationFrame(tick)
    }
    revealRaf.current = requestAnimationFrame(tick)
  }

  // Adds a Hero message to both the visible thread and the API conversation,
  // and reads it aloud via heroSpeak (OpenAI TTS) unless muted. When voice is on,
  // the bubble text is revealed in sync with the audio rather than all at once.
  function addHeroMessage(message, state = 'talking', manipulative = null) {
    let newIndex = -1
    setChatHistory(prev => { newIndex = prev.length; return [...prev, { role: 'hero', message, manipulative }] })
    setConversation(prev => [...prev, { role: 'assistant', content: message }])
    setRobotState(state)

    if (!mutedRef.current) {
      setIsSpeaking(true)
      // Start hidden; the real text reveals when audio begins (onAudioStart).
      setReveal({ index: newIndex, chars: 0 })
      heroSpeak(
        message,
        () => setRobotState('talking'),
        () => {
          setIsSpeaking(false)
          setRobotState('idle')
          setReveal({ index: -1, chars: 0 }) // done → show full text
        },
        studentId,
        (durationSec) => {
          // Audio is starting — reveal the caption over its real duration.
          startReveal(newIndex, message.length, (durationSec || message.length * 0.06) * 1000)
        },
      )
    }
  }

  async function handleChatSend(explicitMsg) {
    // explicitMsg lets voice input send a transcript directly (state updates are
    // async, so we can't rely on chatInput having been set yet).
    const userMsg = (typeof explicitMsg === 'string' ? explicitMsg : chatInput).trim()
    if (!userMsg || loading) return
    setChatInput('')
    setChatHistory(prev => [...prev, { role: 'student', message: userMsg }])
    // Build the full history sent to the API (gives the model memory).
    const updatedConversation = [...conversation, { role: 'user', content: userMsg }]
    setConversation(updatedConversation)
    setLoading(true)
    setRobotState('thinking')

    try {
      const res = await fetch('/api/student/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedConversation,
          questionText: general ? null : question,
          questionId: general ? null : questionId,
          // skillId lets the server tailor hints to this skill's recent history.
          skillId: general ? null : skillId,
          studentName,
          grade,
          studentId,
        }),
      })
      const data = await res.json()
      addHeroMessage(
        data.reply || "I'm thinking... what have you tried so far? 🤔",
        // Cheer when Hero surfaces a visual tool to play with.
        data.manipulative ? 'happy' : 'talking',
        data.manipulative || null
      )
    } catch {
      addHeroMessage(
        "Sorry, I had trouble connecting. Try again! 🤖",
        'talking'
      )
    } finally {
      setLoading(false)
    }
  }

  // Stop any in-progress caption reveal and show the full text (used when the
  // student interrupts the voice via mute or mic).
  function snapRevealToFull() {
    if (revealRaf.current) cancelAnimationFrame(revealRaf.current)
    setReveal({ index: -1, chars: 0 })
  }

  function toggleMute() {
    if (isSpeaking) heroStop()
    snapRevealToFull()
    setIsMuted(prev => !prev)
    setIsSpeaking(false)
  }

  // PRESS-AND-HOLD walkie-talkie (speech-to-speech, report #6): hold the mic to
  // talk, release to stop → transcribe (Whisper) → auto-send to Hero, whose
  // reply is spoken back. startTalk on press, stopTalk on release.
  async function startTalk() {
    if (loading || voiceState !== 'idle') return
    // ALWAYS stop Hero first (unconditionally — isSpeaking state can lag behind
    // the real audio, and this also aborts any in-flight TTS fetch) so Hero can
    // never be heard by the microphone we're about to open.
    heroStop()
    setIsSpeaking(false)
    setRobotState('idle')
    snapRevealToFull()
    try {
      recorderRef.current = await startRecording()
      setVoiceState('recording')
    } catch {
      setVoiceState('idle')
    }
  }

  async function stopTalk() {
    if (voiceState !== 'recording') return
    const rec = recorderRef.current
    recorderRef.current = null
    if (!rec) { setVoiceState('idle'); return }
    setVoiceState('transcribing')
    try {
      const text = await rec.stopAndTranscribe(studentId)
      setVoiceState('idle')
      if (text) handleChatSend(text)   // straight into the normal send → Hero speaks reply
    } catch (err) {
      setVoiceState('idle')
      if (String(err?.message) === 'premium_required') {
        addHeroMessage("Talking to me is a Premium feature 💎 You can still type your question!", 'talking')
      }
      // Otherwise stay silent — the student can just type.
    }
  }

  function replayLastMessage() {
    const lastHeroMsg = [...chatHistory].reverse().find(m => m.role === 'hero')
    if (lastHeroMsg && !isMuted) {
      setIsSpeaking(true)
      setRobotState('talking')
      heroSpeak(
        lastHeroMsg.message,
        () => {},
        () => {
          setIsSpeaking(false)
          setRobotState('idle')
        },
        studentId
      )
    }
  }

  const robot = ROBOT_STATES[robotState]

  // The chat thread + input. Shared between the standalone modal and the
  // embedded (HeroTutor tab) layout.
  const chatBody = (
    <>
      {/* Walkie-talkie mic animations — available in both standalone + embedded layouts. */}
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        /* Expanding "signal" rings behind the button while recording (transmitting). */
        @keyframes talkieRing { 0% { transform: scale(0.85); opacity: 0.55; } 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>
      {/* Chat messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: 16, display: 'flex',
        flexDirection: 'column', gap: 10,
        minHeight: 180,
      }}>
        {chatHistory.map((msg, i) => (
          <div key={i}>
            <div style={{
              display: 'flex',
              justifyContent: msg.role === 'hero' ? 'flex-start' : 'flex-end',
            }}>
              {msg.role === 'hero' && (
                <AskHeroIcon size={18} style={{ marginRight: 6, alignSelf: 'flex-end' }} />
              )}
              <div style={{
                maxWidth: '78%',
                padding: '10px 14px',
                borderRadius: msg.role === 'hero' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                background: msg.role === 'hero' ? '#1B2B4B' : '#C49A1A',
                color: 'white',
                fontSize: 14, lineHeight: 1.5,
              }}>
                {/* While this Hero message is being spoken, reveal it in sync with
                    the voice; otherwise show the full text. */}
                {msg.role === 'hero' && reveal.index === i
                  ? (msg.message.slice(0, reveal.chars) || '…')
                  : msg.message}
              </div>
            </div>
            {msg.role === 'hero' && msg.manipulative && (
              <Manipulative tool={msg.manipulative} />
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}>
            <AskHeroIcon size={18} />
            <div style={{
              padding: '10px 14px',
              borderRadius: '4px 16px 16px 16px',
              background: '#1B2B4B', color: '#C49A1A',
              fontSize: 14,
            }}>
              Hero is thinking ✦✦✦
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area — VOICE-FIRST: a big round mic is the primary control; the
          student can switch to typing. Falls back to typing if no mic support. */}
      <div style={{
        padding: 14,
        borderTop: '1px solid var(--border-color)',
      }}>
        {voiceSupported && !typeMode ? (
          // Big walkie-talkie + "type instead" link. Centred on phones; docked to
          // the bottom-right on tablets/iPad so it's within easy thumb reach.
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: isTablet ? 'flex-end' : 'center',
            gap: 10,
            paddingRight: isTablet ? 8 : 0,
          }}>
            <button
              onPointerDown={(e) => { e.preventDefault(); startTalk() }}
              onPointerUp={(e) => { e.preventDefault(); stopTalk() }}
              onPointerLeave={() => { if (voiceState === 'recording') stopTalk() }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={loading || voiceState === 'transcribing'}
              aria-label={voiceState === 'recording' ? 'Release to send' : 'Hold to talk to Hero'}
              style={{
                position: 'relative',
                // Modern pill button: soft navy surface, ring, big tap target.
                background: voiceState === 'recording'
                  ? 'radial-gradient(circle at 50% 40%, #FEE2E2, #FCA5A5)'
                  : 'radial-gradient(circle at 50% 40%, #FFFFFF, #EEF2F7)',
                border: `3px solid ${voiceState === 'recording' ? '#EF4444' : '#C49A1A'}`,
                borderRadius: '50%', padding: 0,
                width: 200, height: 200, flexShrink: 0,
                cursor: loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none',
                boxShadow: voiceState === 'recording'
                  ? '0 10px 30px rgba(239,68,68,0.35)'
                  : '0 12px 32px rgba(27,43,75,0.18)',
                transition: 'transform 0.12s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                transform: voiceState === 'recording' ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              {/* Signal rings while transmitting (red, only while recording). */}
              {voiceState === 'recording' && (
                <>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid #EF4444', animation: 'talkieRing 1.2s ease-out infinite' }} />
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid #EF4444', animation: 'talkieRing 1.2s ease-out infinite 0.6s' }} />
                </>
              )}
              <img
                src="/assets/heroTalkie.png"
                alt=""
                draggable={false}
                style={{
                  position: 'relative', width: 134, height: 134, objectFit: 'contain',
                  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.18))',
                  transform: voiceState === 'recording' ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                  pointerEvents: 'none',
                }}
              />
            </button>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, minHeight: 18 }}>
              {voiceState === 'recording' ? '🔴 Listening… release to send'
                : voiceState === 'transcribing' ? 'Got it — thinking…'
                : 'Hold to talk to Hero'}
            </span>
            <button
              onClick={() => setTypeMode(true)}
              disabled={loading}
              style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              ⌨️ Type instead
            </button>
          </div>
        ) : (
          // Typing row (+ a way back to voice when mic is available).
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {voiceSupported && (
              <button
                onClick={() => setTypeMode(false)}
                disabled={loading}
                title="Use voice"
                aria-label="Use voice"
                style={{
                  background: '#1B2B4B', color: 'white', border: 'none', borderRadius: 10,
                  width: 44, height: 44, flexShrink: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <img src="/assets/heroTalkie.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              </button>
            )}
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChatSend()}
              placeholder="Ask Hero anything about Maths..."
              disabled={loading}
              autoFocus
              style={{
                flex: 1, padding: '10px 14px',
                borderRadius: 10,
                border: '1.5px solid var(--border-color)',
                fontSize: 14, color: 'var(--text-primary)',
                background: 'var(--bg-card)',
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleChatSend()}
              disabled={loading || !chatInput.trim()}
              style={{
                background: chatInput.trim() ? '#C49A1A' : 'var(--border-color)',
                color: 'white', border: 'none',
                borderRadius: 10, padding: '10px 16px',
                fontWeight: 700, cursor: chatInput.trim() ? 'pointer' : 'default', fontSize: 14,
              }}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </>
  )

  // Embedded mode: HeroTutor owns the robot/header/X. Render just the chat body.
  if (embedded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        {chatBody}
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 24,
        width: '100%',
        maxWidth: 580,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        border: '3px solid #C49A1A',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: '#1B2B4B',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AskHeroIcon size={40} />
            <div>
              <p style={{ color: 'white', fontWeight: 800,
                fontSize: 16, margin: 0 }}>
                Ask <span style={{ color: '#C49A1A' }}>Hero</span> ✦
              </p>
              <p style={{ color: '#94A3B8', fontSize: 11, margin: 0 }}>
                {isSpeaking ? '🔊 Speaking...' : 'Your AI Maths Tutor'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={replayLastMessage}
              title="Replay"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none', color: 'white',
                width: 32, height: 32, borderRadius: '50%',
                cursor: 'pointer', fontSize: 14,
              }}
            >▶</button>
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              style={{
                background: isMuted
                  ? 'rgba(239,68,68,0.3)'
                  : 'rgba(255,255,255,0.1)',
                border: 'none', color: 'white',
                width: 32, height: 32, borderRadius: '50%',
                cursor: 'pointer', fontSize: 14,
              }}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={() => { heroStop(); onClose() }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none', color: 'white',
                width: 32, height: 32, borderRadius: '50%',
                cursor: 'pointer', fontSize: 18, fontWeight: 700,
              }}
            >×</button>
          </div>
        </div>

        {/* Robot + Question reference */}
        <div style={{
          background: 'var(--bg-card-elevated)',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{
            flexShrink: 0, width: 100, height: 100,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {isSpeaking && (
              <div style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '3px solid #C49A1A',
                animation: 'pulse 1s infinite',
              }} />
            )}
            {robot.type === 'video' ? (
              <RoboVideo
                src={robot.src}
                width={100}
                loop={robot.loop}
                blend="auto"
              />
            ) : (
              <img
                src={robot.src}
                style={{ width: 100 }}
                alt="Hero"
              />
            )}
          </div>

          <div style={{
            flex: 1, background: 'var(--bg-card)',
            borderRadius: 12, padding: '10px 14px',
            border: '1px solid var(--border-color)',
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 11,
              margin: '0 0 4px' }}>
              {general ? 'General Maths help' : 'Current question:'}
            </p>
            <p style={{ color: 'var(--text-primary)', fontWeight: 700,
              fontSize: 14, margin: 0 }}>
              {general
                ? 'Ask me anything about Maths! 😊'
                : question}
            </p>
          </div>
        </div>

        {/* Chat thread + input (shared with embedded mode) */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, maxHeight: 380 }}>
          {chatBody}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
