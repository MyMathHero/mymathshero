'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import MathText from './MathText'
import FractionVisual from './FractionVisual'
import CharacterAvatar from './CharacterAvatar'
import { resultSummary } from '@/lib/challenge'

const HERO_PIC = '/assets/robot/heroprofilepic.png'

// A stored avatar can be a character id ("hero") or a legacy emoji ("🤖"). We
// never want to render a raw emoji as an avatar, so detect + skip those.
const isEmoji = (v) => typeof v === 'string' && !/^[a-z0-9_]+$/i.test(v.trim())

const gradeLabel = (g) => (g == null ? '' : g === 0 ? 'Prep' : `Grade ${g}`)

// A person's face for invite cards: parent-approved photo → their character
// avatar → a default face. (Never renders a raw emoji.)
function OpponentFace({ from, size = 44 }) {
  if (from?.photo) return <img src={from.photo} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  if (from?.avatarConfig || (from?.avatar && !isEmoji(from.avatar))) {
    return <CharacterAvatar id={from.avatar} config={from.avatarConfig} size={size} />
  }
  return <CharacterAvatar id={null} size={size} />
}

// Hero Speed Challenge — a safe 1v1 online maths race. No chat; only the
// opponent's first name + avatar are shown. Matches a real online peer via
// polling, or an AI ("Hero Bot") if nobody's around. Winning pays 20 coins.
//
// Phases: idle → searching → racing → result.
export default function ChallengeArena({ studentId, grade = 3, myAvatar, myAvatarConfig, onCoins }) {
  const [phase, setPhase] = useState('idle')
  const [match, setMatch] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [locked, setLocked] = useState(false) // brief lock between answers
  const [error, setError] = useState('')
  const [invited, setInvited] = useState(null)   // who I'm currently inviting (searching)
  const [incoming, setIncoming] = useState(null) // an invite someone sent ME
  const pollRef = useRef(null)
  const presenceRef = useRef(null)
  const inboxRef = useRef(null)
  const qStartRef = useRef(Date.now())
  const matchIdRef = useRef(null)
  const searchRef = useRef(null)  // { start, tried[] } for the running search

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

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); clearTimeout(pollRef.current); pollRef.current = null }
  }
  useEffect(() => () => stopPoll(), [])

  // Resume on mount: if the student already has an ACTIVE match (e.g. they just
  // accepted a global invite and landed here), drop straight into the race.
  useEffect(() => {
    if (!studentId) return
    let done = false
    ;(async () => {
      const data = await post({ action: 'resume' })
      if (done) return
      if (data?.match && data.match.status === 'active') {
        setMatch(data.match)
        startPolling(data.match.matchId)
        setPhase('racing'); qStartRef.current = Date.now()
      }
    })()
    return () => { done = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

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

  // Poll INBOX (~2s) whenever we're not racing, so someone can send US a
  // challenge request and we can Accept/Decline — even sitting on the idle screen.
  useEffect(() => {
    if (phase === 'racing' || phase === 'result') { setIncoming(null); return }
    const tick = async () => {
      const d = await post({ action: 'inbox' })
      setIncoming(d?.invite || null)
    }
    tick()
    inboxRef.current = setInterval(tick, 2500)
    return () => clearInterval(inboxRef.current)
  }, [phase, post])

  // Drive the search: call `find` repeatedly. The server sends an invite to one
  // available player, waits for them, then moves to the next; after ~20s of
  // trying real players it returns a Hero Bot match.
  const runSearch = useCallback(async () => {
    const s = searchRef.current
    if (!s) return
    const data = await post({ action: 'find', searchStart: s.start, tried: s.tried })
    if (data?.error) { setError(data.error); setPhase('idle'); searchRef.current = null; return }
    if (data?.match) {
      // Matched! (a human accepted, or the bot fallback fired)
      searchRef.current = null
      setInvited(null)
      setMatch(data.match)
      startPolling(data.match.matchId)
      if (data.match.status === 'active') { setPhase('racing'); qStartRef.current = Date.now() }
      return
    }
    if (data?.searching) {
      setInvited(data.invited || null)
      if (Array.isArray(data.tried)) s.tried = data.tried
      // Poll again shortly to check for accept / move to next candidate.
      pollRef.current = setTimeout(runSearch, 1500)
    }
  }, [post, startPolling])

  async function findMatch() {
    setError(''); setPhase('searching'); setMatch(null); setInvited(null)
    searchRef.current = { start: Date.now(), tried: [] }
    runSearch()
  }

  async function cancelSearch() {
    stopPoll()
    searchRef.current = null
    await post({ action: 'cancel' })
    setMatch(null); setInvited(null); setPhase('idle')
  }

  // Accept / decline an incoming challenge request.
  async function acceptInvite() {
    const inv = incoming
    if (!inv) return
    setIncoming(null)
    const data = await post({ action: 'accept', inviteId: inv.inviteId })
    if (data?.match) {
      setMatch(data.match)
      startPolling(data.match.matchId)
      setPhase('racing'); qStartRef.current = Date.now()
    } else {
      setError(data?.error || 'That challenge is no longer available.')
    }
  }
  async function declineInvite() {
    const inv = incoming
    setIncoming(null)
    if (inv) await post({ action: 'decline', inviteId: inv.inviteId })
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

  // Incoming-challenge popup — shown on ANY non-racing phase (idle/searching) so
  // a student can accept a request without sitting on a special screen.
  const inviteModal = incoming?.from ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 26, maxWidth: 320, width: '100%', textAlign: 'center', border: '2px solid var(--accent-gold)' }}>
        <p style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Challenge request</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <OpponentFace from={incoming.from} size={64} />
        </div>
        <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 19, margin: '0 0 2px' }}>{incoming.from.firstName}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 4px' }}>{gradeLabel(incoming.from.grade)}</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 18px' }}>invited you to a Hero Speed Challenge!</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={declineInvite} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>Decline</button>
          <button onClick={acceptInvite} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--accent-gold)', color: '#1B2B4B', fontWeight: 800, cursor: 'pointer' }}>Accept →</button>
        </div>
      </div>
    </div>
  ) : null

  if (phase === 'idle') {
    return (
      <div style={wrap}>
        {inviteModal}
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
    const inv = invited?.from
    return (
      <div style={wrap}>
        {inviteModal /* someone may invite ME while I'm searching */}
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 16, animation: 'htPulse 1s infinite' }}>🔎</div>
          {inv ? (
            <>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 20, margin: '0 0 12px' }}>
                Challenge sent to {inv.firstName}!
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
                <OpponentFace from={inv} size={44} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 15, margin: 0 }}>{inv.firstName}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>{gradeLabel(inv.grade)}</p>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 20px' }}>
                Waiting for them to accept… we&apos;ll try someone else if they&apos;re busy.
              </p>
            </>
          ) : (
            <>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 20, margin: '0 0 6px' }}>Looking for a Hero to race…</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 20px' }}>
                Sending challenge requests to available Heroes. If no one accepts, Hero Bot jumps in!
              </p>
            </>
          )}
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
          <ScorePill name="You" avatarId={myAvatar} avatarConfig={myAvatarConfig} correct={me?.correct || 0} answered={me?.answered || 0} total={match.total} me />
          <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>vs</span>
          <ScorePill
            name={opp?.firstName || 'Hero'}
            avatarId={opp?.avatar}
            photo={opp?.photo}
            heroPic={opp?.isBot || opp?.firstName === 'Hero Bot' || !opp?.avatar}
            correct={opp?.correct || 0} answered={opp?.answered || 0} total={match.total}
          />
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
            {match.endedBy === 'forfeit' && won ? 'You win! 🎉'
              : won ? 'You win! 🎉' : match.winner === 'tie' ? "It's a tie!" : 'Great effort!'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, margin: '0 0 4px' }}>
            {match.endedBy === 'forfeit'
              ? 'Your opponent left the challenge.'
              : resultSummary(me?.correct || 0, match.total)}
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

function ScorePill({ name, avatarId, avatarConfig, photo, heroPic, correct, answered, total, me }) {
  // Avatar priority: parent-approved photo → the student's own character avatar →
  // the Hero profile pic (for the AI "Hero Bot") → a generic character fallback.
  let face
  if (photo) {
    face = <img src={photo} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  } else if (heroPic) {
    // The Hero Bot / AI opponent — always the real Hero pic (the server sends it
    // with avatar '🤖', so this MUST win before the avatar branch below).
    face = <img src={HERO_PIC} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--accent-gold)' }} />
  } else if (avatarConfig || (avatarId && !isEmoji(avatarId))) {
    face = <CharacterAvatar id={avatarId} config={avatarConfig} size={30} />
  } else {
    face = <CharacterAvatar id={null} size={30} />
  }
  return (
    <div style={{
      flex: 1, background: me ? 'var(--accent-gold-light)' : 'var(--bg-card)',
      border: `2px solid ${me ? 'var(--accent-gold)' : 'var(--border-color)'}`,
      borderRadius: 14, padding: '10px 12px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {face}
        <div style={{ minWidth: 0 }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 13, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 11, margin: 0 }}>✓ {correct} · {answered}/{total}</p>
        </div>
      </div>
    </div>
  )
}
