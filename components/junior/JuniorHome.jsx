'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import RoboVideo from '@/components/RoboVideo'
import { heroSpeak, heroStop } from '@/lib/heroVoice'
import { JUNIOR_WORLDS } from '@/lib/juniorMode'

// Junior Home (Prep–3) — Hero-first, reading-light. Hero greets the child by
// name and speaks, then big animated "Learning World" tiles (or one Play button
// that lets the AI pick what's next). No dashboard, no categories, no analytics.

const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'

export default function JuniorHome({ studentId, studentName = 'friend', grade = 0, avatar }) {
  const router = useRouter()
  const [started, setStarted] = useState(false)
  const spokenRef = useRef(false)

  const firstName = String(studentName || 'friend').split(' ')[0]

  // Greet + speak once (after a tap-to-start so audio autoplay is allowed, and to
  // give a clear big "Start" affordance for little kids).
  function start() {
    setStarted(true)
    if (!spokenRef.current) {
      spokenRef.current = true
      heroSpeak(`Hi ${firstName}! Let's play some maths games. Pick a world, or tap the big play button and I'll choose one for you!`, undefined, undefined, studentId)
    }
  }

  useEffect(() => () => heroStop(), [])

  function openWorld(worldId) {
    heroStop()
    router.push(`/junior/play?world=${encodeURIComponent(worldId)}`)
  }
  function aiPlay() {
    heroStop()
    router.push('/junior/play') // no world → server/AI picks the next skill
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #EAF3FF 0%, #FFF6E5 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 16px 48px', fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes jrPop { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes jrFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes jrWiggle { 0%,100% { transform: rotate(-2deg) } 50% { transform: rotate(2deg) } }
        .jr-tile:active { transform: scale(0.94) }
      `}</style>

      {/* Hero */}
      <div style={{ marginTop: 8, animation: 'jrFloat 3s ease-in-out infinite' }}>
        <RoboVideo src="/assets/robot/wavingrobo.MP4" width={170} loop={true} />
      </div>

      {!started ? (
        <>
          <h1 style={{ color: NAVY, fontSize: 30, fontWeight: 900, margin: '10px 0 4px', textAlign: 'center' }}>
            Hi {firstName}! 👋
          </h1>
          <p style={{ color: '#475569', fontSize: 18, margin: '0 0 24px', textAlign: 'center' }}>
            Ready to play some maths games?
          </p>
          <button onClick={start} style={{
            background: GOLD, color: 'white', border: 'none', borderRadius: 24,
            padding: '20px 56px', fontSize: 26, fontWeight: 900, cursor: 'pointer',
            boxShadow: '0 10px 24px rgba(196,154,26,0.45)', animation: 'jrPop 0.4s ease',
          }}>
            ▶ Let’s go!
          </button>
        </>
      ) : (
        <>
          <h1 style={{ color: NAVY, fontSize: 24, fontWeight: 900, margin: '8px 0 2px', textAlign: 'center' }}>
            Pick a world, {firstName}!
          </h1>

          {/* Big AI "play anything" button */}
          <button onClick={aiPlay} style={{
            marginTop: 14, marginBottom: 22,
            background: NAVY, color: 'white', border: `3px solid ${GOLD}`, borderRadius: 22,
            padding: '16px 40px', fontSize: 22, fontWeight: 900, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 20px rgba(27,43,75,0.3)',
          }}>
            <span style={{ fontSize: 26, animation: 'jrWiggle 1.2s ease-in-out infinite' }}>🎲</span>
            Surprise me!
          </button>

          {/* Worlds grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 14, width: '100%', maxWidth: 560,
          }}>
            {JUNIOR_WORLDS.map((w, i) => (
              <button key={w.id} className="jr-tile" onClick={() => openWorld(w.id)} style={{
                background: 'white', border: '3px solid #E2E8F0', borderRadius: 22,
                padding: '20px 12px', cursor: 'pointer', textAlign: 'center',
                transition: 'transform 0.12s', animation: `jrPop 0.4s ease ${i * 0.05}s both`,
                boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>{w.emoji}</div>
                <div style={{ color: NAVY, fontWeight: 800, fontSize: 16 }}>{w.name}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
