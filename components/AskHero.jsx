'use client'
import { useState, useRef, useEffect } from 'react'
import RoboVideo from './RoboVideo'
import { heroSpeak, heroStop } from '@/lib/heroVoice'
import AskHeroIcon from './AskHeroIcon'

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
  const chatEndRef = useRef(null)
  const mutedRef = useRef(false)

  useEffect(() => { mutedRef.current = isMuted }, [isMuted])

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, loading])

  // Adds a Hero message to both the visible thread and the API conversation,
  // and reads it aloud via heroSpeak (OpenAI TTS nova) unless muted.
  function addHeroMessage(message, state = 'talking') {
    setChatHistory(prev => [...prev, { role: 'hero', message }])
    setConversation(prev => [...prev, { role: 'assistant', content: message }])
    setRobotState(state)

    if (!mutedRef.current) {
      setIsSpeaking(true)
      heroSpeak(
        message,
        () => setRobotState('talking'),
        () => {
          setIsSpeaking(false)
          setRobotState('idle')
        },
        studentId
      )
    }
  }

  async function handleChatSend() {
    if (!chatInput.trim() || loading) return
    const userMsg = chatInput.trim()
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
          studentName,
          grade,
          studentId,
        }),
      })
      const data = await res.json()
      addHeroMessage(
        data.reply || "I'm thinking... what have you tried so far? 🤔",
        'talking'
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

  function toggleMute() {
    if (isSpeaking) heroStop()
    setIsMuted(prev => !prev)
    setIsSpeaking(false)
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
        background: 'white',
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
          background: '#F0F4F8',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid #E2E8F0',
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
              />
            ) : (
              <img
                src={robot.src}
                style={{ width: 100, mixBlendMode: 'multiply' }}
                alt="Hero"
              />
            )}
          </div>

          <div style={{
            flex: 1, background: 'white',
            borderRadius: 12, padding: '10px 14px',
            border: '1px solid #E2E8F0',
          }}>
            <p style={{ color: '#64748B', fontSize: 11,
              margin: '0 0 4px' }}>
              {general ? 'General Maths help' : 'Current question:'}
            </p>
            <p style={{ color: '#1B2B4B', fontWeight: 700,
              fontSize: 14, margin: 0 }}>
              {general
                ? 'Ask me anything about Maths! 😊'
                : question}
            </p>
          </div>
        </div>

        {/* Chat messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: 16, display: 'flex',
          flexDirection: 'column', gap: 10,
          minHeight: 180, maxHeight: 320,
        }}>
          {chatHistory.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'hero'
                ? 'flex-start' : 'flex-end',
            }}>
              {msg.role === 'hero' && (
                <AskHeroIcon size={18} style={{ marginRight: 6, alignSelf: 'flex-end' }} />
              )}
              <div style={{
                maxWidth: '78%',
                padding: '10px 14px',
                borderRadius: msg.role === 'hero'
                  ? '4px 16px 16px 16px'
                  : '16px 4px 16px 16px',
                background: msg.role === 'hero'
                  ? '#1B2B4B' : '#C49A1A',
                color: 'white',
                fontSize: 14, lineHeight: 1.5,
              }}>
                {msg.message}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex',
              justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}>
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

        {/* Chat input */}
        <div style={{
          padding: 14,
          borderTop: '1px solid #E2E8F0',
          display: 'flex', gap: 8,
        }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChatSend()}
            placeholder="Ask Hero anything about Maths..."
            disabled={loading}
            style={{
              flex: 1, padding: '10px 14px',
              borderRadius: 10,
              border: '1.5px solid #E2E8F0',
              fontSize: 14, color: '#1B2B4B',
              outline: 'none',
            }}
          />
          <button
            onClick={handleChatSend}
            disabled={loading || !chatInput.trim()}
            style={{
              background: chatInput.trim() ? '#C49A1A' : '#E2E8F0',
              color: 'white', border: 'none',
              borderRadius: 10, padding: '10px 16px',
              fontWeight: 700, cursor: chatInput.trim() ? 'pointer' : 'default', fontSize: 14,
            }}
          >
            Send
          </button>
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
