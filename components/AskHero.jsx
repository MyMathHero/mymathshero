'use client'
import { useState, useRef, useEffect } from 'react'
import RoboVideo from './RoboVideo'
import { heroSpeak, heroStop } from '@/lib/heroVoice'

const ROBOT_STATES = {
  idle:      { type: 'img', src: '/assets/robot/hero-robot.png' },
  thinking:  { type: 'video', src: '/assets/robot/thinkinggotidearobo.MP4', loop: true },
  talking:   { type: 'video', src: '/assets/robot/thinkinggotidearobo.MP4', loop: true },
  happy:     { type: 'video', src: '/assets/robot/happyjumpingrobo.MP4', loop: false },
  sad:       { type: 'video', src: '/assets/robot/sadrobo.MP4', loop: false },
  waving:    { type: 'video', src: '/assets/robot/wavingrobo.MP4', loop: true },
  complete:  { type: 'video', src: '/assets/robot/happyjumpingrobo.MP4', loop: false },
}

function formatSkillName(skillId) {
  if (!skillId) return 'this skill'
  const withoutPrefix = skillId.replace(/^[a-z]_\d+_/, '')
  return withoutPrefix
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/100/g, '')
    .trim()
}

function getStepByStepExplanation(question, answer) {
  if (question.includes('×') || question.includes('x')) {
    return `Think of it as groups. If you count up carefully you will get ${answer}.`
  }
  if (question.includes('+')) {
    return `Try adding the numbers one at a time to reach ${answer}.`
  }
  if (question.includes('-')) {
    return `Try counting down step by step to reach ${answer}.`
  }
  if (question.includes('÷')) {
    return `Think about how many groups fit into the number to get ${answer}.`
  }
  return `The answer is ${answer}. Try to remember this pattern!`
}

export default function AskHero({
  question,
  skillId,
  skillName,
  studentId,
  questionId,
  onClose,
  behaviour = 'confused',
  attemptNumber = 1,
  isCorrect = null,
}) {
  const [robotState, setRobotState] = useState('waving')
  const [stage, setStage] = useState('greeting')
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [practiceQuestion, setPracticeQuestion] = useState(null)
  const [practiceAnswer, setPracticeAnswer] = useState(null)
  const [practiceResult, setPracticeResult] = useState(null)
  const [practiceAttempts, setPracticeAttempts] = useState(0)
  const chatEndRef = useRef(null)
  const mutedRef = useRef(false)

  useEffect(() => { mutedRef.current = isMuted }, [isMuted])

  useEffect(() => {
    const greetTimer = setTimeout(() => {
      const displayName = skillName || formatSkillName(skillId)
      const greeting = `Hi! I'm Hero, your personal maths tutor.`
      addHeroMessage(greeting, 'waving')
      setTimeout(() => fetchHint(), 1500)
    }, 500)

    return () => {
      clearTimeout(greetTimer)
      heroStop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  function addHeroMessage(message, state = 'talking') {
    setChatHistory(prev => [...prev, { role: 'hero', message }])
    setRobotState(state)

    if (!mutedRef.current) {
      setIsSpeaking(true)
      heroSpeak(
        message,
        () => setRobotState('talking'),
        () => {
          setIsSpeaking(false)
          setRobotState('idle')
        }
      )
    }
  }

  async function fetchHint() {
    setLoading(true)
    setRobotState('thinking')

    try {
      const res = await fetch('/api/student/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          skillId,
          questionId,
          question,
          attemptNumber,
          behaviour,
        }),
      })
      const data = await res.json()

      const heroMessage = `${data.hint} Try using this to work through the question. You've got this!`
      addHeroMessage(heroMessage, 'talking')
      setStage('explaining')

      setTimeout(() => fetchPracticeQuestion(), 3000)
    } catch {
      addHeroMessage(
        "Let me think... Try breaking this problem into smaller steps. What do you know already?",
        'talking'
      )
      setStage('explaining')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPracticeQuestion() {
    try {
      const res = await fetch(
        `/api/student/questions?skillId=${skillId}&limit=3`
      )
      const data = await res.json()
      const different = data.questions?.find(
        q => q.questionId !== questionId
      )
      if (different) {
        setPracticeQuestion(different)
        addHeroMessage(
          "Great! Now let's try a practice question together. This will help you understand it better!",
          'waving'
        )
        setStage('practice')
      }
    } catch {}
  }

  async function handlePracticeAnswer(option) {
    if (practiceAnswer) return
    setPracticeAnswer(option)
    setPracticeAttempts(prev => prev + 1)
    setLoading(true)
    setRobotState('thinking')

    try {
      const res = await fetch('/api/student/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          skillId,
          questionId: practiceQuestion.questionId,
          answer: option,
          timeTakenMs: 10000,
          hintUsed: true,
          difficulty: practiceQuestion.difficulty || 0.5,
        }),
      })
      const data = await res.json()
      setPracticeResult(data)

      if (data.correct) {
        addHeroMessage(
          `Excellent! You got it right! Now go back and try the original question. You understand this now!`,
          'happy'
        )
        setStage('complete')
      } else if (practiceAttempts < 1) {
        const explanation = practiceQuestion.explanation ||
          `Let me break this down. The answer is ${data.correctAnswer}. ${getStepByStepExplanation(practiceQuestion.question, data.correctAnswer)}`
        addHeroMessage(
          `Why don't we try this way? The answer is ${data.correctAnswer}. ${explanation} Let me give you one more try!`,
          'sad'
        )
        setTimeout(() => {
          setPracticeAnswer(null)
          setPracticeResult(null)
          setRobotState('idle')
        }, 2500)
      } else {
        addHeroMessage(
          `The answer is ${data.correctAnswer}. That's okay — even heroes learn from mistakes! Go back and try the real question now. You know more than before!`,
          'sad'
        )
        setTimeout(() => setStage('complete'), 3000)
      }
    } catch {
      setPracticeAnswer(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleChatSend() {
    if (!chatInput.trim() || loading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatHistory(prev => [...prev, { role: 'student', message: userMsg }])
    setLoading(true)
    setRobotState('thinking')

    try {
      const res = await fetch('/api/student/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId, skillId, questionId,
          question: `Student asked: "${userMsg}". Original question: "${question}"`,
          attemptNumber: attemptNumber + 1,
          behaviour: 'confused',
        }),
      })
      const data = await res.json()
      addHeroMessage(data.hint, 'talking')
    } catch {
      addHeroMessage(
        "Great question! Think about what you already know and work from there.",
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
    const lastHeroMsg = [...chatHistory]
      .reverse()
      .find(m => m.role === 'hero')
    if (lastHeroMsg && !isMuted) {
      setIsSpeaking(true)
      setRobotState('talking')
      heroSpeak(
        lastHeroMsg.message,
        () => {},
        () => {
          setIsSpeaking(false)
          setRobotState('idle')
        }
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
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#C49A1A',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 20,
            }}>🤖</div>
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

        {/* Robot + Question */}
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
              Current question:
            </p>
            <p style={{ color: '#1B2B4B', fontWeight: 700,
              fontSize: 14, margin: 0 }}>
              {question}
            </p>
          </div>
        </div>

        {/* Chat messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: 16, display: 'flex',
          flexDirection: 'column', gap: 10,
          minHeight: 180, maxHeight: 260,
        }}>
          {chatHistory.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'hero'
                ? 'flex-start' : 'flex-end',
            }}>
              {msg.role === 'hero' && (
                <span style={{ fontSize: 18, marginRight: 6,
                  alignSelf: 'flex-end' }}>🤖</span>
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
              <span style={{ fontSize: 18 }}>🤖</span>
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

        {/* Practice question */}
        {stage === 'practice' && practiceQuestion && !practiceAnswer && (
          <div style={{
            padding: 14,
            borderTop: '1px solid #E2E8F0',
            background: '#FFFBEB',
          }}>
            <p style={{ color: '#C49A1A', fontWeight: 700,
              fontSize: 12, margin: '0 0 8px' }}>
              🎯 Practice question — give it a go!
            </p>
            <p style={{ color: '#1B2B4B', fontWeight: 700,
              fontSize: 15, margin: '0 0 10px' }}>
              {practiceQuestion.question}
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr', gap: 8,
            }}>
              {practiceQuestion.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handlePracticeAnswer(opt)}
                  style={{
                    padding: '10px 12px', borderRadius: 10,
                    border: '2px solid #E2E8F0',
                    background: 'white', color: '#1B2B4B',
                    fontWeight: 700, cursor: 'pointer', fontSize: 14,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat input */}
        {stage !== 'complete' && (
          <div style={{
            padding: 14,
            borderTop: '1px solid #E2E8F0',
            display: 'flex', gap: 8,
          }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChatSend()}
              placeholder="Ask Hero anything..."
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
                fontWeight: 700, cursor: 'pointer', fontSize: 14,
              }}
            >
              Send
            </button>
          </div>
        )}

        {/* Complete state */}
        {stage === 'complete' && (
          <div style={{
            padding: 16,
            borderTop: '1px solid #E2E8F0',
            textAlign: 'center',
          }}>
            <button
              onClick={() => { heroStop(); onClose() }}
              style={{
                background: '#1B2B4B', color: 'white',
                border: '2px solid #C49A1A',
                borderRadius: 14, padding: '14px 32px',
                fontWeight: 800, fontSize: 16,
                cursor: 'pointer', width: '100%',
              }}
            >
              Now try the real question! 💪
            </button>
          </div>
        )}
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
