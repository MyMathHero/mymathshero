'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import MathText from './MathText'
import FractionVisual from './FractionVisual'
import { resultSummary } from '@/lib/challenge'

// Hero Speed Challenge — a safe 1v1 online maths race. No chat; only the
// opponent's first name + avatar are shown. Matches a real online peer via
// polling, or an AI ("Hero Bot") if nobody's around. Winning pays 20 coins.
//
// Phases: idle → searching → racing → result.
export default function ChallengeArena({ studentId, grade = 3, onCoins }) {
  const [phase, setPhase] = useState('idle')
  const [match, setMatch] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [locked, setLocked] = useState(false) // brief lock between answers
  const [error, setError] = useState('')
  const pollRef = useRef(null)
  const presenceRef = useRef(null)
  const qStartRef = useRef(Date.now())
  const matchIdRef = useRef(null)

  const post = useCallback(async (body) => {
    const res = await fetch('/api/student/challenge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, ...body }),
    })
    return res.json()
  }, [studentId])

  // Presence heartbeat while the arena is mounted (so others can match us).
  useEffect(() => {
    const beat = () => {
      fetch('/api/student/presence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, available: phase === 'idle' || phase === 'searching' }),
      }).catch(() => {})
    }
    beat()
    presenceRef.current = setInterval(beat, 30000)
    return () => clearInterval(presenceRef.current)
  }, [studentId, phase])

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  useEffect(() => () => stopPoll(), [])

  // Poll match status while searching/racing so we see the opponent join and
  // their live progress. When a match becomes active, drop into the race.
  const startPolling = useCallback((matchId) => {
    matchIdRef.current = matchId
    stopPoll()
    pollRef.current = setInterval(async () => {
      const data = await post({ action: 'status', matchId })
      if (data?.match) {
        setMatch(data.match)
        if (data.match.status === 'active' && phase !== 'racing') { setPhase('racing'); qStartRef.current = Date.now() }
        if (data.match.status === 'complete') { setPhase('result'); stopPoll() }
      }
    }, 2000)
  }, [post, phase])

  async function findMatch() {
    setError(''); setPhase('searching')
    const data = await post({ action: 'find' })
    if (data?.error) { setError(data.error); setPhase('idle'); return }
    if (data?.match) {
      setMatch(data.match)
      startPolling(data.match.matchId)
      if (data.match.status === 'active') { setPhase('racing'); qStartRef.current = Date.now() }
    }
  }

  async function cancelSearch() {
    stopPoll()
    if (matchIdRef.current) await post({ action: 'cancel', matchId: matchIdRef.current })
    setMatch(null); setPhase('idle')
  }

  async function answer(option) {
    if (locked || !match) return
    setLocked(true)
    const q = match.questions[qIndex]
    const timeMs = Date.now() - qStartRef.current
    const data = await post({ action: 'answer', matchId: match.matchId, questionId: q.questionId, answer: option, timeMs })
    if (data?.match) setMatch(data.match)

    const next = qIndex + 1
    setTimeout(async () => {
      setLocked(false)
      if (next >= match.total) {
        const fin = await post({ action: 'finish', matchId: match.matchId })
        if (fin?.match) setMatch(fin.match)
        if (fin?.match?.status === 'complete') { setPhase('result'); stopPoll() }
        // else keep polling — waiting for the opponent to finish
      } else {
        setQIndex(next)
        qStartRef.current = Date.now()
      }
    }, 450)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const wrap = { maxWidth: 560, margin: '0 auto', padding: '8px 4px' }

  if (phase === 'idle') {
    return (
      <div style={wrap}>
        <div style={{
          background: 'linear-gradient(135deg, #1B2B4B, #2D4A7A)', borderRadius: 20, padding: 28,
          border: '2px solid var(--accent-gold)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>⚔️</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 24, margin: '0 0 6px' }}>Hero Speed Challenge</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: '0 0 4px' }}>
            Race another Hero in a quick maths battle. Win to earn <strong style={{ color: 'var(--accent-gold)' }}>20 🪙</strong>!
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 20px' }}>
            Safe &amp; friendly · no chat · first name + avatar only
          </p>
          {error && <p style={{ color: '#FCA5A5', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button onClick={findMatch} style={{
            width: '100%', padding: 16, borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, var(--accent-gold), #FFD700)',
            color: '#1B2B4B', fontWeight: 800, fontSize: 16, cursor: 'pointer',
          }}>
            Find a Challenge →
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'searching') {
    return (
      <div style={wrap}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 16, animation: 'htPulse 1s infinite' }}>🔎</div>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 20, margin: '0 0 6px' }}>Finding a Hero to race…</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 20px' }}>
            Matching you with someone online. If no one&apos;s around, Hero Bot 🤖 will jump in!
          </p>
          <button onClick={cancelSearch} style={{
            padding: '10px 24px', borderRadius: 12, border: '1px solid var(--border-color)',
            background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    )
  }

  if (phase === 'racing' && match) {
    const q = match.questions[qIndex]
    const me = match.me, opp = match.opponent
    return (
      <div style={wrap}>
        {/* Scoreboard */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <ScorePill name="You" avatar="🦸" correct={me?.correct || 0} answered={me?.answered || 0} total={match.total} me />
          <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>vs</span>
          <ScorePill name={opp?.firstName || 'Hero'} avatar={opp?.avatar || '🤖'} photo={opp?.photo} correct={opp?.correct || 0} answered={opp?.answered || 0} total={match.total} />
        </div>

        {/* Question */}
        {q ? (
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 22, border: '1px solid var(--border-color)' }}>
            <p style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: 12, margin: '0 0 8px' }}>
              Question {qIndex + 1} of {match.total}
            </p>
            <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18, margin: '0 0 14px' }}>
              <MathText>{q.question}</MathText>
            </p>
            {q.visual && <div style={{ marginBottom: 14 }}><FractionVisual visual={q.visual} /></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(q.options || []).map((opt, i) => (
                <button key={i} disabled={locked} onClick={() => answer(opt)} style={{
                  textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                  border: '2px solid var(--border-color)', background: 'var(--bg-primary)',
                  color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, cursor: locked ? 'default' : 'pointer',
                  opacity: locked ? 0.6 : 1,
                }}>
                  <MathText>{String(opt).replace(/^\s*[A-Da-d][).:]\s*/, '')}</MathText>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
            Waiting for {opp?.firstName || 'your opponent'} to finish… ⏳
          </div>
        )}
      </div>
    )
  }

  if (phase === 'result' && match) {
    const won = match.winner === studentId
    const me = match.me
    return (
      <div style={wrap}>
        <div style={{
          background: won ? 'linear-gradient(135deg, #065F46, #059669)' : 'linear-gradient(135deg, #1B2B4B, #2D4A7A)',
          borderRadius: 20, padding: 28, textAlign: 'center', border: `2px solid ${won ? '#34D399' : 'var(--accent-gold)'}`,
        }}>
          <div style={{ fontSize: 60, marginBottom: 8 }}>{won ? '🏆' : match.winner === 'tie' ? '🤝' : '💪'}</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 24, margin: '0 0 6px' }}>
            {won ? 'You win! 🎉' : match.winner === 'tie' ? "It's a tie!" : 'Great effort!'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, margin: '0 0 4px' }}>
            {resultSummary(me?.correct || 0, match.total)}
          </p>
          {match.rewardCoins > 0 && (
            <p style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: 18, margin: '10px 0 0' }}>
              +{match.rewardCoins} 🪙
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={() => { setMatch(null); setQIndex(0); setPhase('idle') }} style={{
              flex: 1, padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, cursor: 'pointer',
            }}>Back</button>
            <button onClick={() => { onCoins?.(match.rewardCoins || 0); setMatch(null); setQIndex(0); findMatch() }} style={{
              flex: 1, padding: 14, borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, var(--accent-gold), #FFD700)',
              color: '#1B2B4B', fontWeight: 800, cursor: 'pointer',
            }}>Race again →</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function ScorePill({ name, avatar, photo, correct, answered, total, me }) {
  return (
    <div style={{
      flex: 1, background: me ? 'var(--accent-gold-light)' : 'var(--bg-card)',
      border: `2px solid ${me ? 'var(--accent-gold)' : 'var(--border-color)'}`,
      borderRadius: 14, padding: '10px 12px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Parent-approved photo if present, else the avatar emoji. */}
        {photo
          ? <img src={photo} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <span style={{ fontSize: 22 }}>{avatar}</span>}
        <div style={{ minWidth: 0 }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 13, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 11, margin: 0 }}>✓ {correct} · {answered}/{total}</p>
        </div>
      </div>
    </div>
  )
}
