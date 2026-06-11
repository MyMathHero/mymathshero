'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useFeatureFlags } from '@/lib/useFeatureFlags'
import {
  ARCADE_GAMES, ARCADE_CATEGORIES, canPlayGame
} from '@/lib/arcadeGames'
import { Analytics } from '@/lib/analytics'

// Brand arcade palette — pure black theme (matches the intro animation's black
// background) with gold accents and white text.
const ARCADE_BG = '#000000'
const ARCADE_BG_SOLID = '#000000' // bars
const ARCADE_GOLD = '#C49A1A'
const ARCADE_INK = '#000000'       // black used for text on gold buttons

export default function ArcadePage() {
  const router = useRouter()
  const { flags, loaded: flagsLoaded } = useFeatureFlags()
  const [phase, setPhase] = useState('enter') // enter|lobby|playing
  const [student, setStudent] = useState(null)
  const [arcadeData, setArcadeData] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedGame, setSelectedGame] = useState(null)
  const [playingGame, setPlayingGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const [showLimitWarning, setShowLimitWarning] = useState(false)
  const [stars, setStars] = useState([])
  const sessionTimerRef = useRef(null)
  const iframeRef = useRef(null)
  // Running session minutes + ids kept in refs so the heartbeat interval and
  // the unmount cleanup always read fresh values (not stale closures).
  const sessionMinutesRef = useRef(0)
  const sessionIdRef = useRef(null)
  const playingGameRef = useRef(null)

  // Generate random stars for background
  useEffect(() => {
    const s = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.7 + 0.1,
      duration: Math.random() * 3 + 2,
    }))
    setStars(s)
  }, [])

  useEffect(() => {
    loadArcadeData()
  }, [])

  // Arcade is always dark themed — override the global theme while this page is
  // mounted so any var(--...) usage resolves to the dark palette, then restore.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme-override', 'arcade')
    return () => {
      document.documentElement.removeAttribute('data-theme-override')
    }
  }, [])

  // Redirect away if the Arcade feature is turned off (direct-URL guard).
  // Wait for the real flag values before deciding so we don't bounce on the
  // hardcoded default.
  useEffect(() => {
    if (flagsLoaded && !flags.arcadeEnabled) {
      router.replace('/student-dashboard')
    }
  }, [flagsLoaded, flags.arcadeEnabled, router])

  // Clear the session timer if the component unmounts mid-game, and save
  // whatever time was played via sendBeacon (survives tab close / navigate
  // away, where a normal fetch would be cancelled).
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)
      const sid = sessionIdRef.current
      const mins = sessionMinutesRef.current
      if (sid && mins > 0 && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/student/arcade-heartbeat',
          JSON.stringify({
            sessionId: sid,
            studentId: student?.userId,
            durationMinutes: mins,
          })
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student])

  // Refresh arcade data whenever we land back in the lobby (e.g. after a game),
  // so minutesToday reflects any time logged elsewhere.
  useEffect(() => {
    if (phase === 'lobby' && student?.userId) {
      loadArcadeData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Safety: never get stuck on the intro animation. If the video doesn't fire
  // onEnded (slow load, codec issue, etc.) move to the lobby after 5s max.
  useEffect(() => {
    if (phase !== 'entering') return
    const t = setTimeout(() => setPhase('lobby'), 5000)
    return () => clearTimeout(t)
  }, [phase])

  async function loadArcadeData() {
    try {
      const authRes = await fetch('/api/auth/me')
      const auth = await authRes.json()
      if (!auth.authenticated || auth.user.role !== 'student') {
        router.replace('/login')
        return
      }
      setStudent(auth.user)

      const arcadeRes = await fetch(
        `/api/student/arcade?studentId=${auth.user.userId}`
      )
      const data = await arcadeRes.json()
      setArcadeData(data)
    } catch {
      router.replace('/login')
    } finally {
      setLoading(false)
    }
  }

  async function handleEnterArcade() {
    if (!arcadeData) return

    // Check if student has enough coins to enter (minimum 20 coins)
    if ((arcadeData.coins || 0) < 20) {
      setPhase('locked')
      return
    }

    // Check parent settings
    if (!arcadeData.arcadeSettings?.enabled) {
      setPhase('parentLocked')
      return
    }

    // Check daily limit
    if (arcadeData.minutesToday >= (arcadeData.arcadeSettings?.dailyMinutes || 30)) {
      setPhase('limitReached')
      return
    }

    // Play the arcade intro animation, then drop into the lobby. The entering
    // screen also has its own safety timeout in case the video can't play.
    Analytics.arcadeEntered()
    setPhase('entering')
  }

  async function handleUnlockGame(game) {
    if (unlocking) return
    const check = canPlayGame(game, arcadeData?.coins || 0, arcadeData?.plan)
    if (!check.allowed) {
      alert(check.reason)
      return
    }

    setUnlocking(game.id)
    try {
      const res = await fetch('/api/student/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.userId,
          gameId: game.id,
          action: 'unlock',
        }),
      })
      const data = await res.json()
      if (data.success) {
        Analytics.gameUnlocked(game.id, game.title, game.coinsCost)
        setArcadeData(prev => ({
          ...prev,
          coins: data.newCoins ?? prev.coins,
          unlockedGames: [...(prev.unlockedGames || []), game.id],
        }))
        handlePlayGame(game)
      } else {
        alert(data.error || 'Could not unlock game')
      }
    } catch {
      alert('Connection error')
    } finally {
      setUnlocking(null)
    }
  }

  async function handlePlayGame(game) {
    // Standard plan can't play games beyond the first 3, even if previously unlocked.
    if (isGamePlanBlocked(game.id)) {
      router.push('/subscribe')
      return
    }
    try {
      const res = await fetch('/api/student/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.userId,
          gameId: game.id,
          action: 'start',
        }),
      })
      const data = await res.json()
      if (data.limitReached) {
        setShowLimitWarning(true)
        return
      }
      if (data.success) {
        setSessionId(data.sessionId)
        sessionIdRef.current = data.sessionId
        setPlayingGame(game)
        playingGameRef.current = game
        setPhase('playing')
        setSessionMinutes(0)
        sessionMinutesRef.current = 0

        // Heartbeat every 60s — persists durationMinutes to the DB and pulls
        // back the server's authoritative minutesToday so it stays in sync
        // across devices. Refs avoid stale-closure bugs in the interval.
        sessionTimerRef.current = setInterval(async () => {
          const newMinutes = sessionMinutesRef.current + 1
          sessionMinutesRef.current = newMinutes
          setSessionMinutes(newMinutes)

          try {
            const hbRes = await fetch('/api/student/arcade-heartbeat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: sessionIdRef.current,
                studentId: student.userId,
                durationMinutes: newMinutes,
              }),
            })
            const hb = await hbRes.json()
            if (hb.minutesToday !== undefined) {
              setArcadeData(prev => ({
                ...prev,
                minutesToday: hb.minutesToday,
                minutesRemaining: hb.minutesRemaining,
              }))
            }
            if (hb.limitReached) {
              setShowLimitWarning(true)
              setTimeout(() => handleExitGame(), 30000)
            }
          } catch {
            // Heartbeat failed — keep playing, time tracked locally for now.
          }
        }, 60000)
      } else {
        alert(data.error || 'Could not start game')
      }
    } catch {
      alert('Connection error. Try again.')
    }
  }

  function handleExitGame() {
    clearInterval(sessionTimerRef.current)
    const finalMinutes = sessionMinutesRef.current
    if (sessionId) {
      if (finalMinutes > 0) {
        Analytics.gamePlayed(playingGame?.id, playingGame?.title, finalMinutes)
      }
      // Send the final end + duration, then refresh so minutesToday is current.
      fetch('/api/student/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student?.userId,
          gameId: playingGame?.id,
          action: 'end',
          sessionId,
          durationMinutes: finalMinutes,
        }),
      }).then(() => loadArcadeData()).catch(() => {})
    }
    setPlayingGame(null)
    setSessionId(null)
    sessionIdRef.current = null
    playingGameRef.current = null
    setPhase('lobby')
    setShowLimitWarning(false)
  }

  const filteredGames = ARCADE_GAMES.filter(g =>
    activeCategory === 'all' || g.category === activeCategory
  )

  const isUnlocked = (gameId) =>
    (arcadeData?.unlockedGames || []).includes(gameId)

  // Standard plan unlocks only the first 3 games (by their fixed position in
  // the full game list, so it's stable no matter which category is filtered).
  // Premium (and any other plan handled elsewhere) is not slot-limited.
  const isGamePlanBlocked = (gameId) =>
    arcadeData?.plan === 'standard' &&
    ARCADE_GAMES.findIndex(g => g.id === gameId) >= 3

  // ==================
  // LOADING
  // ==================
  if (loading) {
    return (
      <div style={styles.fullscreen()}>
        <div style={{ textAlign: 'center', display: 'flex',
          flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="/assets/arcadelogo.png"
            alt="Hero Arcade"
            style={{ height: 96, objectFit: 'contain', marginBottom: 16,
              display: 'block',
              animation: 'pulse 1.5s ease-in-out infinite' }}
            onError={e => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'block'
            }}
          />
          <div style={{ display: 'none', fontSize: 64, marginBottom: 16 }}>🕹️</div>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
          <p style={{ color: '#C49A1A', fontSize: 20,
            fontWeight: 700 }}>Loading Arcade...</p>
        </div>
      </div>
    )
  }

  // ==================
  // ENTER SCREEN
  // ==================
  if (phase === 'enter') {
    return (
      <div style={{
        ...styles.fullscreen(),
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Animated stars */}
        {stars.map(star => (
          <div key={star.id} style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            backgroundColor: 'white',
            opacity: star.opacity,
            animation: `twinkle ${star.duration}s ease-in-out infinite alternate`,
          }} />
        ))}

        <style>{`
          @keyframes twinkle {
            from { opacity: 0.1; transform: scale(0.8); }
            to { opacity: 0.8; transform: scale(1.2); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(196,154,26,0.4); }
            50% { box-shadow: 0 0 60px rgba(196,154,26,0.9),
              0 0 100px rgba(196,154,26,0.4); }
          }
          @keyframes enterArcade {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
            100% { transform: scale(20); opacity: 0; }
          }
        `}</style>

        {/* Grid lines effect */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(196,154,26,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(196,154,26,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 1,
          textAlign: 'center', padding: 24,
        }}>
          {/* Arcade logo — centered */}
          <div style={{
            animation: 'float 3s ease-in-out infinite',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'center',
          }}>
            {/* Try to use arcade logo image, fallback to emoji */}
            <img
              src="/assets/arcadelogo.png"
              alt="Arcade"
              style={{ height: 120, objectFit: 'contain', display: 'block' }}
              onError={e => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'block'
              }}
            />
            <div style={{ display: 'none', fontSize: 80 }}>🕹️</div>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 8vw, 72px)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #C49A1A, #FFD700, #C49A1A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 8px',
            letterSpacing: '-1px',
            textTransform: 'uppercase',
          }}>
            Hero Arcade
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.6)',
            fontSize: 18, marginBottom: 40 }}>
            Earn Coins in Maths · Unlock Epic Games
          </p>

          {/* Coin balance — the arcade's spending currency */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            gap: 12, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(196,154,26,0.3)',
            borderRadius: 20, padding: '12px 24px',
            marginBottom: 32,
          }}>
            <span style={{ fontSize: 24 }}>🪙</span>
            <span style={{ color: '#C49A1A', fontWeight: 800,
              fontSize: 20 }}>
              {arcadeData?.coins || 0}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)',
              fontSize: 14 }}>Coins</span>
          </div>

          {/* Today's limit indicator */}
          <div style={{ marginBottom: 40 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)',
              fontSize: 13, marginBottom: 8 }}>
              Today&apos;s Play Time
            </p>
            <div style={{
              width: 200, height: 8,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 4, margin: '0 auto 8px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100,
                  ((arcadeData?.minutesToday || 0) /
                  (arcadeData?.arcadeSettings?.dailyMinutes || 30)) * 100
                )}%`,
                background: 'linear-gradient(90deg, #22C55E, #C49A1A)',
                borderRadius: 4,
              }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              {arcadeData?.minutesToday || 0} /
              {arcadeData?.arcadeSettings?.dailyMinutes || 30} mins used today
            </p>
          </div>

          {/* Enter button */}
          <button
            onClick={handleEnterArcade}
            style={{
              background: 'linear-gradient(135deg, #C49A1A, #FFD700)',
              color: ARCADE_INK, border: 'none',
              borderRadius: 20, padding: '20px 60px',
              fontSize: 22, fontWeight: 900,
              cursor: 'pointer', letterSpacing: '1px',
              textTransform: 'uppercase',
              animation: 'glow 2s ease-in-out infinite',
              marginBottom: 20,
            }}
          >
            🕹️ ENTER ARCADE
          </button>

          <br />
          <button
            onClick={() => router.push('/student-dashboard')}
            style={{ background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
              fontSize: 14, marginTop: 12 }}
          >
            ← Back to Hero HQ
          </button>
        </div>
      </div>
    )
  }

  // ==================
  // ENTERING ANIMATION
  // ==================
  if (phase === 'entering') {
    return (
      <div style={{
        ...styles.fullscreen(),
        alignItems: 'center', justifyContent: 'center',
        background: ARCADE_INK,
        overflow: 'hidden',
      }}>
        {/* Arcade intro animation — small, centered, then into the lobby. */}
        <div style={{
          position: 'absolute',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
        }}>
          <video
            src="/assets/arcadeanimation.mp4"
            autoPlay
            muted
            playsInline
            onEnded={() => setPhase('lobby')}
            onError={() => setPhase('lobby')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
        {/* Skip control */}
        <button
          onClick={() => setPhase('lobby')}
          style={{
            position: 'absolute', bottom: 40, zIndex: 2,
            background: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '10px 24px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Skip →
        </button>
      </div>
    )
  }

  // ==================
  // LOCKED — not enough XP
  // ==================
  if (phase === 'locked') {
    return (
      <div style={styles.fullscreen()}>
        {stars.map(star => (
          <div key={star.id} style={{
            position: 'absolute',
            left: `${star.x}%`, top: `${star.y}%`,
            width: star.size, height: star.size,
            borderRadius: '50%', backgroundColor: 'white',
            opacity: star.opacity * 0.3,
          }} />
        ))}
        <div style={{ textAlign: 'center', padding: 32,
          position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: 'white', fontSize: 32,
            fontWeight: 800, marginBottom: 16 }}>
            Arcade Locked
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)',
            fontSize: 16, maxWidth: 400,
            margin: '0 auto 32px' }}>
            You need at least <strong style={{ color: '#C49A1A' }}>
              20 coins 🪙
            </strong> to enter the Arcade.
            Answer Maths questions to earn coins!
          </p>
          <div style={{
            background: 'rgba(196,154,26,0.1)',
            border: '2px solid #C49A1A', borderRadius: 20,
            padding: '20px 40px', marginBottom: 32,
            display: 'inline-block',
          }}>
            <p style={{ color: '#C49A1A', fontSize: 14,
              margin: 0 }}>Your Coins 🪙</p>
            <p style={{ color: 'white', fontSize: 48,
              fontWeight: 900, margin: '8px 0' }}>
              {arcadeData?.coins || 0}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)',
              fontSize: 13, margin: 0 }}>
              Need 20 coins to unlock
            </p>
          </div>
          <br />
          <button
            onClick={() => router.push('/student-dashboard')}
            style={{
              background: 'linear-gradient(135deg, #1B2B4B, #2D4A7A)',
              color: 'white', border: '2px solid #C49A1A',
              borderRadius: 14, padding: '16px 40px',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ✦ Go Practice Maths →
          </button>
        </div>
      </div>
    )
  }

  // ==================
  // PARENT LOCKED
  // ==================
  if (phase === 'parentLocked') {
    return (
      <div style={styles.fullscreen()}>
        <div style={{ textAlign: 'center', padding: 32,
          position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>👨‍👩‍👧</div>
          <h2 style={{ color: 'white', fontSize: 28,
            fontWeight: 800, marginBottom: 16 }}>
            Arcade Paused by Parent
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)',
            fontSize: 16, maxWidth: 360,
            margin: '0 auto 32px' }}>
            Your parent has paused Arcade access.
            Ask them to turn it back on in the Parent Hub.
          </p>
          <button
            onClick={() => router.push('/student-dashboard')}
            style={styles.goldButton}>
            ← Back to Hero HQ
          </button>
        </div>
      </div>
    )
  }

  // ==================
  // DAILY LIMIT
  // ==================
  if (phase === 'limitReached') {
    return (
      <div style={styles.fullscreen()}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>⏰</div>
          <h2 style={{ color: 'white', fontSize: 28,
            fontWeight: 800, marginBottom: 16 }}>
            Daily Arcade Time Used!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)',
            fontSize: 16, maxWidth: 360,
            margin: '0 auto 32px' }}>
            You have used your{' '}
            <strong style={{ color: '#C49A1A' }}>
              {arcadeData?.arcadeSettings?.dailyMinutes || 30} minutes
            </strong>{' '}
            of Arcade time today.
            Come back tomorrow or ask your parent to increase your limit!
          </p>
          <button
            onClick={() => router.push('/student-dashboard')}
            style={styles.goldButton}>
            ✦ Go Practice More Maths →
          </button>
        </div>
      </div>
    )
  }

  // ==================
  // PLAYING A GAME
  // ==================
  if (phase === 'playing' && playingGame) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#000', zIndex: 9999,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Minimal game bar */}
        <div style={{
          background: ARCADE_BG_SOLID,
          borderBottom: '1px solid rgba(196,154,26,0.3)',
          padding: '8px 16px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          height: 48,
        }}>
          <div style={{ display: 'flex',
            alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>
              {playingGame.emoji}
            </span>
            <span style={{ color: 'white', fontWeight: 700,
              fontSize: 15 }}>
              {playingGame.title}
            </span>
            <span style={{
              background: 'rgba(196,154,26,0.2)',
              color: '#C49A1A', borderRadius: 10,
              padding: '2px 10px', fontSize: 12,
              fontWeight: 700,
            }}>
              {sessionMinutes} min played
            </span>
          </div>

          <button
            onClick={handleExitGame}
            style={{
              background: 'rgba(239,68,68,0.2)',
              color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '6px 16px',
              fontWeight: 700, cursor: 'pointer', fontSize: 13,
            }}
          >
            ✕ Exit Game
          </button>
        </div>

        {/* Game iframe — hides source URL. Self-hosted /games/ titles get a
            tighter sandbox (no allow-same-origin needed) and a same-origin
            referrer; external embeds keep the permissive sandbox + no-referrer. */}
        <iframe
          ref={iframeRef}
          src={playingGame.embedUrl}
          style={{
            flex: 1, border: 'none',
            width: '100%', height: '100%',
          }}
          allow="accelerometer; autoplay; gyroscope"
          allowFullScreen
          sandbox={playingGame.embedUrl?.startsWith('/games/')
            ? 'allow-scripts allow-forms allow-pointer-lock allow-popups'
            : 'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups'
          }
          title={playingGame.title}
          referrerPolicy={playingGame.embedUrl?.startsWith('/games/')
            ? 'same-origin'
            : 'no-referrer'
          }
        />

        {/* Time limit warning */}
        {showLimitWarning && (
          <div style={{
            position: 'absolute', bottom: 20,
            left: '50%', transform: 'translateX(-50%)',
            background: '#FEF3C7',
            border: '2px solid #F59E0B',
            borderRadius: 14, padding: '14px 24px',
            textAlign: 'center', zIndex: 10000,
          }}>
            <p style={{ fontWeight: 800, color: '#1B2B4B',
              margin: '0 0 8px' }}>
              ⏰ Almost at your daily limit!
            </p>
            <button onClick={handleExitGame}
              style={{ background: '#F59E0B', color: 'white',
                border: 'none', borderRadius: 8,
                padding: '8px 16px', fontWeight: 700,
                cursor: 'pointer' }}>
              Save & Exit
            </button>
          </div>
        )}
      </div>
    )
  }

  // ==================
  // ARCADE LOBBY
  // ==================
  return (
    <div style={{
      minHeight: '100vh',
      background: ARCADE_BG,
      backgroundAttachment: 'fixed',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes twinkle {
          from { opacity: 0.1; }
          to { opacity: 0.7; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .game-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: #C49A1A !important;
        }
        .game-card {
          transition: all 0.2s ease;
        }
        .cat-pill:hover { opacity: 0.9; }
      `}</style>

      {/* Stars background */}
      {stars.map(star => (
        <div key={star.id} style={{
          position: 'fixed',
          left: `${star.x}%`, top: `${star.y}%`,
          width: star.size, height: star.size,
          borderRadius: '50%', backgroundColor: 'white',
          opacity: star.opacity * 0.4,
          animation: `twinkle ${star.duration}s ease-in-out infinite alternate`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(196,154,26,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(196,154,26,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(196,154,26,0.25)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex',
          alignItems: 'center', gap: 12 }}>
          <img
            src="/assets/arcadelogo.png"
            alt="Arcade"
            style={{ height: 36, objectFit: 'contain' }}
            onError={e => e.target.style.display = 'none'}
          />
          <span style={{
            color: 'white', fontWeight: 900,
            fontSize: 18, letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            Hero <span style={{ color: '#C49A1A' }}>Arcade</span>
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16,
          alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#C49A1A', fontWeight: 800,
              fontSize: 16, margin: 0 }}>
              🪙 {arcadeData?.coins || 0}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)',
              fontSize: 10, margin: 0 }}>Coins</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'white', fontWeight: 700,
              fontSize: 14, margin: 0 }}>
              {arcadeData?.minutesToday || 0}/
              {arcadeData?.arcadeSettings?.dailyMinutes || 30}m
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)',
              fontSize: 10, margin: 0 }}>Today</p>
          </div>
          <button
            onClick={() => router.push('/student-dashboard')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 14px',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            ← HQ
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1200, margin: '0 auto',
        padding: '32px 24px', position: 'relative',
        zIndex: 1 }}>

        {/* Hero card / Arcade card */}
        <div style={{
          background: `linear-gradient(135deg,
            rgba(196,154,26,0.15) 0%,
            rgba(27,43,75,0.3) 50%,
            rgba(196,154,26,0.1) 100%)`,
          border: '1px solid rgba(196,154,26,0.4)',
          borderRadius: 24, padding: '28px 32px',
          marginBottom: 32,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20,
        }}>
          <div>
            <h2 style={{ color: 'white', fontWeight: 900,
              fontSize: 28, margin: '0 0 6px' }}>
              Welcome, <span style={{ color: '#C49A1A' }}>
                Hero
              </span>! 🕹️
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)',
              margin: 0, fontSize: 15 }}>
              {(arcadeData?.unlockedGames || []).length} games unlocked
              · {arcadeData?.minutesToday || 0} mins played today
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Coins', value: arcadeData?.coins || 0, emoji: '🪙', color: '#C49A1A' },
              { label: 'Games Unlocked', value: (arcadeData?.unlockedGames || []).length, emoji: '🔓', color: '#22C55E' },
              { label: 'Games Available', value: ARCADE_GAMES.filter(g => !g.comingSoon && g.embedUrl).length, emoji: '🎮', color: '#60A5FA' },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 14, padding: '12px 20px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ fontSize: 20, margin: '0 0 4px' }}>
                  {s.emoji}
                </p>
                <p style={{ color: s.color, fontWeight: 800,
                  fontSize: 22, margin: '0 0 2px' }}>
                  {s.value}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)',
                  fontSize: 11, margin: 0 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8,
          overflowX: 'auto', marginBottom: 24,
          paddingBottom: 8 }}>
          {ARCADE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className="cat-pill"
              onClick={() => setActiveCategory(cat.id)}
              style={{
                background: activeCategory === cat.id
                  ? '#C49A1A' : 'rgba(255,255,255,0.06)',
                color: activeCategory === cat.id
                  ? ARCADE_INK : 'rgba(255,255,255,0.7)',
                border: `1px solid ${activeCategory === cat.id
                  ? '#C49A1A' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 20, padding: '8px 18px',
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Games grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
        }}>
          {filteredGames.map((game) => {
            const unlocked = isUnlocked(game.id)
            const comingSoon = game.comingSoon || !game.embedUrl
            const isPremiumBlocked = !comingSoon && game.premiumOnly &&
              arcadeData?.plan !== 'premium'
            // Standard plan — only the first 3 games are accessible.
            const isPlanBlocked = isGamePlanBlocked(game.id)

            return (
              <div
                key={game.id}
                className="game-card"
                onClick={() => {
                  if (isPlanBlocked) {
                    window.location.href = '/subscribe'
                    return
                  }
                  setSelectedGame(game)
                }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${unlocked && !isPlanBlocked
                    ? 'rgba(34,197,94,0.4)'
                    : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 18,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  opacity: isPlanBlocked ? 0.5 : 1,
                }}
              >
                {/* Plan-blocked overlay badge (Standard, slots 4+) */}
                {isPlanBlocked && (
                  <div style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 2,
                    background: '#C49A1A', borderRadius: 10,
                    padding: '2px 8px', fontSize: 10,
                    fontWeight: 800, color: '#0A0A1A',
                  }}>
                    ⭐ PREMIUM
                  </div>
                )}
                {/* Game thumbnail / emoji */}
                <div style={{
                  height: 140,
                  background: `linear-gradient(135deg,
                    rgba(36,74,134,0.55), rgba(27,43,75,0.85))`,
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 56,
                  position: 'relative',
                }}>
                  <span style={comingSoon ? { opacity: 0.4 } : undefined}>
                    {game.emoji}
                  </span>
                  {comingSoon && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(255,255,255,0.15)', borderRadius: 10,
                      padding: '2px 8px', fontSize: 10,
                      fontWeight: 800, color: 'rgba(255,255,255,0.8)',
                    }}>
                      COMING SOON
                    </div>
                  )}
                  {!comingSoon && unlocked && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#22C55E', borderRadius: 10,
                      padding: '2px 8px', fontSize: 10,
                      fontWeight: 800, color: 'white',
                    }}>
                      UNLOCKED
                    </div>
                  )}
                  {isPremiumBlocked && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#C49A1A', borderRadius: 10,
                      padding: '2px 8px', fontSize: 10,
                      fontWeight: 800, color: ARCADE_INK,
                    }}>
                      PREMIUM
                    </div>
                  )}
                  {!comingSoon && !unlocked && !isPremiumBlocked && (
                    <div style={{
                      position: 'absolute', bottom: 0,
                      left: 0, right: 0,
                      background: 'rgba(0,0,0,0.6)',
                      padding: '6px', textAlign: 'center',
                    }}>
                      <span style={{ color: '#C49A1A',
                        fontSize: 12, fontWeight: 700 }}>
                        🪙 {game.coinsCost} coins to unlock
                      </span>
                    </div>
                  )}
                </div>

                {/* Game info */}
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ color: 'white', fontWeight: 700,
                    fontSize: 15, margin: '0 0 4px' }}>
                    {game.title}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)',
                    fontSize: 12, margin: '0 0 10px' }}>
                    {game.description}
                  </p>
                  <div style={{ display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center' }}>
                    <span style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.5)',
                      borderRadius: 6, padding: '2px 8px',
                      fontSize: 11,
                    }}>
                      {game.category}
                    </span>
                    <span style={{ fontSize: 11,
                      color: 'rgba(255,255,255,0.4)' }}>
                      {game.ageRating}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* GAME DETAIL MODAL */}
      {selectedGame && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 200,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24,
          backdropFilter: 'blur(10px)',
        }}
        onClick={() => setSelectedGame(null)}
        >
          <div
            style={{
              background: '#0F0F2A',
              border: '1px solid rgba(196,154,26,0.5)',
              borderRadius: 24, padding: 32,
              maxWidth: 460, width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center',
              marginBottom: 24 }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>
                {selectedGame.emoji}
              </div>
              <h2 style={{ color: 'white', fontWeight: 800,
                fontSize: 24, margin: '0 0 6px' }}>
                {selectedGame.title}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)',
                fontSize: 14 }}>
                {selectedGame.description}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10,
              justifyContent: 'center', marginBottom: 24 }}>
              {[
                { label: 'Category', value: selectedGame.category },
                { label: 'Age', value: selectedGame.ageRating },
                { label: 'Cost', value: `${selectedGame.coinsCost} 🪙` },
              ].map((s, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: '10px 16px',
                  textAlign: 'center',
                }}>
                  <p style={{ color: '#C49A1A', fontWeight: 700,
                    fontSize: 14, margin: '0 0 2px' }}>
                    {s.value}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)',
                    fontSize: 11, margin: 0 }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {isGamePlanBlocked(selectedGame.id) ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#C49A1A', fontWeight: 700,
                  marginBottom: 8 }}>
                  ⭐ Premium plan required
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)',
                  fontSize: 13, marginBottom: 16 }}>
                  Standard plan includes 3 games.
                  Upgrade for all {ARCADE_GAMES.length} games!
                </p>
                <button
                  onClick={() => router.push('/subscribe')}
                  style={{ width: '100%', padding: 16,
                    background: 'linear-gradient(135deg, #C49A1A, #FFD700)',
                    color: '#0A0A1A', border: 'none',
                    borderRadius: 14, fontWeight: 800,
                    fontSize: 16, cursor: 'pointer' }}>
                  Upgrade to Premium →
                </button>
              </div>
            ) : (selectedGame.comingSoon || !selectedGame.embedUrl) ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)',
                  fontSize: 14, marginBottom: 16 }}>
                  This game isn&apos;t ready yet — check back soon! 🚧
                </p>
                <button
                  onClick={() => setSelectedGame(null)}
                  style={{
                    width: '100%', padding: 16,
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 14, fontWeight: 800,
                    fontSize: 16, cursor: 'pointer',
                  }}
                >
                  Coming Soon
                </button>
              </div>
            ) : isUnlocked(selectedGame.id) ? (
              <button
                onClick={() => {
                  setSelectedGame(null)
                  handlePlayGame(selectedGame)
                }}
                style={{
                  width: '100%', padding: 16,
                  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                  color: 'white', border: 'none',
                  borderRadius: 14, fontWeight: 800,
                  fontSize: 18, cursor: 'pointer',
                }}
              >
                🎮 PLAY NOW!
              </button>
            ) : selectedGame.premiumOnly &&
              arcadeData?.plan !== 'premium' ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#C49A1A', fontWeight: 700,
                  marginBottom: 12 }}>
                  Premium subscription required
                </p>
                <button
                  onClick={() => router.push('/onboarding')}
                  style={styles.goldButton}>
                  Upgrade to Premium →
                </button>
              </div>
            ) : (arcadeData?.coins || 0) >= selectedGame.coinsCost ? (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center', fontSize: 14,
                  marginBottom: 12 }}>
                  Spend <strong style={{ color: '#C49A1A' }}>
                    {selectedGame.coinsCost} coins 🪙
                  </strong> to unlock this game forever
                </p>
                <button
                  onClick={() => {
                    setSelectedGame(null)
                    handleUnlockGame(selectedGame)
                  }}
                  disabled={unlocking === selectedGame.id}
                  style={{
                    width: '100%', padding: 16,
                    background: 'linear-gradient(135deg, #C49A1A, #FFD700)',
                    color: ARCADE_INK, border: 'none',
                    borderRadius: 14, fontWeight: 800,
                    fontSize: 16, cursor: 'pointer',
                  }}
                >
                  🔓 UNLOCK FOR {selectedGame.coinsCost} COINS
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)',
                  marginBottom: 16 }}>
                  Need <strong style={{ color: '#EF4444' }}>
                    {selectedGame.coinsCost - (arcadeData?.coins || 0)} more coins
                  </strong> to unlock
                </p>
                <button
                  onClick={() => {
                    setSelectedGame(null)
                    router.push('/student-dashboard')
                  }}
                  style={styles.goldButton}>
                  ✦ Earn More Coins →
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedGame(null)}
              style={{ width: '100%', marginTop: 12,
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Shared styles
const styles = {
  fullscreen: (bg = ARCADE_BG) => ({
    minHeight: '100vh',
    background: bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  }),
  goldButton: {
    background: 'linear-gradient(135deg, #C49A1A, #FFD700)',
    color: ARCADE_INK, border: 'none',
    borderRadius: 14, padding: '14px 32px',
    fontWeight: 800, fontSize: 15,
    cursor: 'pointer',
  },
}
