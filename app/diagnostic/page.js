'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import RoboVideo from '@/components/RoboVideo'
import { useFeatureFlags } from '@/lib/useFeatureFlags'

const BRAND_DARK = '#1B2B4B'
const BRAND_GOLD = 'var(--accent-gold)'
const BRAND_BG = '#F0F4F8'
const BRAND_SUBTEXT = '#64748B'

// Older questions baked the letter into each option ("A) 3 rows of 5"). Strip
// any leading "A) "/"A. "/"A " for display. Display-only — comparisons still use
// the raw option value.
const stripLetterPrefix = (s) =>
  String(s ?? '').trim().replace(/^[A-Da-d][).\s]+/, '').trim()

export default function DiagnosticPage() {
  const router = useRouter()
  const { flags } = useFeatureFlags()
  const [stage, setStage] = useState('welcome') // welcome | quiz | results | submitting
  const [me, setMe] = useState(null)
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState([])
  const [answerLocked, setAnswerLocked] = useState(null) // selected index for current Q
  const [timer, setTimer] = useState(0)
  const [error, setError] = useState('')
  const [skillsSet, setSkillsSet] = useState(0)
  const [placement, setPlacement] = useState(null)
  // Adaptive climb: next harder stage's grade, and the running results of the
  // current above-grade stage (a ref so the advance timeout reads fresh values).
  const [nextStageGrade, setNextStageGrade] = useState(null)
  const stageResultsRef = useRef([])

  // Auth check on mount — must be a logged-in student.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me')
        if (!r.ok) { router.replace('/login'); return }
        const data = await r.json()
        if (!data.authenticated || data.user?.role !== 'student') {
          router.replace('/login')
          return
        }
        setMe(data.user)
      } catch {
        router.replace('/login')
      }
    })()
  }, [router])

  // Per-question timer
  useEffect(() => {
    if (stage !== 'quiz') return
    setTimer(0)
    const t = setInterval(() => setTimer(prev => prev + 1), 1000)
    return () => clearInterval(t)
  }, [stage, index])

  async function startQuiz() {
    setError('')
    if (!me) return
    try {
      const grade = me.grade ?? 3
      const res = await fetch(`/api/student/diagnostic?grade=${grade}&subject=Maths`)
      const data = await res.json()
      if (!res.ok || !data.questions?.length) {
        setError('No diagnostic questions available yet. Please ask an admin to seed questions.')
        return
      }
      setQuestions(data.questions)
      setIndex(0)
      setResults([])
      // Adaptive climb: where the next harder stage begins (grade+2), or null at ceiling.
      setNextStageGrade(data.nextStageGrade ?? null)
      stageResultsRef.current = []
      setStage('quiz')
    } catch {
      setError('Network error. Please try again.')
    }
  }

  // Fetch one harder stage and append it; advance into it. Returns true if added.
  async function loadNextStage(allResults) {
    const sg = nextStageGrade
    if (sg == null) return false
    try {
      const res = await fetch(`/api/student/diagnostic?stageGrade=${sg}&subject=Maths`)
      const data = await res.json()
      if (!res.ok || !data.questions?.length) return false
      stageResultsRef.current = []
      setNextStageGrade(data.nextStageGrade ?? null)
      setQuestions(prev => [...prev, ...data.questions])
      setIndex(i => i + 1) // step into the first appended question
      return true
    } catch {
      return false
    }
  }

  function submitAnswer(selectedIndex) {
    if (answerLocked !== null) return
    setAnswerLocked(selectedIndex)
    const q = questions[index]
    const selected = q.options?.[selectedIndex]
    const correct = selected === q.correctAnswer
    const r = {
      questionId: q.questionId,
      skillId: q.skillId,
      correct,
      timeTakenMs: timer * 1000,
      grade: q.grade,
      level: q.level, // 'at' | 'below' | 'above' — weights placement scoring
    }
    setResults(prev => [...prev, r])
    // Track results of the current adaptive stage (above-grade probes) so we can
    // decide whether to climb to a harder stage.
    if (q.level === 'above') stageResultsRef.current = [...stageResultsRef.current, r]

    setTimeout(async () => {
      setAnswerLocked(null)
      if (index + 1 < questions.length) {
        setIndex(i => i + 1)
        return
      }
      // Queue exhausted. If this was an above-grade stage the student aced,
      // climb one grade higher; otherwise finish. Mirrors shouldClimb() in
      // lib/placement.js (≥2 correct AND ≥70% of the stage).
      const sr = stageResultsRef.current
      const correctN = sr.filter(x => x.correct).length
      const aced = sr.length > 0 && correctN >= 2 && correctN / sr.length >= 0.7
      if (aced && nextStageGrade != null && await loadNextStage([...results, r])) return
      finishQuiz([...results, r])
    }, 700)
  }

  async function finishQuiz(allResults) {
    setStage('submitting')
    try {
      const res = await fetch('/api/student/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: me.userId, results: allResults }),
      })
      const data = await res.json()
      setSkillsSet(data?.skillsSet || 0)
      setPlacement(data?.placement || null)
      setStage('results')
    } catch {
      setError('Could not save your results. Please try again.')
      setStage('quiz')
    }
  }

  // Estimate level summaries per subject for the results screen
  const subjectsSummary = (() => {
    if (!results.length) return []
    const byLevel = { below: 0, at: 0, above: 0 }
    let correctAbove = 0, totalAbove = 0
    let correctAt = 0, totalAt = 0
    questions.forEach((q, i) => {
      const r = results[i]
      if (!r) return
      if (q.level === 'above') { totalAbove++; if (r.correct) correctAbove++ }
      if (q.level === 'at') { totalAt++; if (r.correct) correctAt++ }
    })
    const grade = me?.grade ?? 3
    const aboveRate = totalAbove > 0 ? correctAbove / totalAbove : 0
    const atRate = totalAt > 0 ? correctAt / totalAt : 0
    let label
    // Prefer the AI placement estimate when available; fall back to the rate heuristic.
    const gradeLabel = (g) => (g === 0 ? 'Prep' : `Year ${g}`)
    if (placement?.estimatedGrade != null && placement.estimatedGrade > grade) {
      label = `Performing around ${gradeLabel(placement.estimatedGrade)} level 🚀`
    } else if (aboveRate >= 0.6) label = `On track for Year ${grade + 1}`
    else if (atRate >= 0.6) label = `Working at Year ${grade} level`
    else label = `Building Year ${grade} foundations`
    const summary = [{ name: 'Maths', label, emoji: '🔢' }]
    // English/Science only appear once their flags are enabled.
    if (flags.englishEnabled) summary.push({ name: 'English', label: 'Coming soon', emoji: '📖' })
    if (flags.scienceEnabled) summary.push({ name: 'Science', label: 'Coming soon', emoji: '🔬' })
    return summary
  })()

  return (
    <div style={{
      minHeight: '100vh', background: BRAND_BG,
      padding: '32px 16px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Welcome */}
      {stage === 'welcome' && (
        <div style={{
          maxWidth: 520, width: '100%', background: 'var(--bg-card)', borderRadius: 24,
          border: '1px solid var(--border-color)', padding: 32, textAlign: 'center',
          boxShadow: '0 12px 32px rgba(27,43,75,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <RoboVideo src="/assets/robot/wavingrobo.MP4" width={180} loop={true} />
          </div>
          <h1 style={{ color: BRAND_DARK, fontSize: 24, fontWeight: 800, margin: '4px 0 8px' }}>
            Hi {me?.name?.split(' ')[0] || 'there'}! Before we start, let&apos;s find out what you know 🎯
          </h1>
          <p style={{ color: BRAND_SUBTEXT, fontSize: 15, margin: '0 0 4px' }}>
            This will take about 5 minutes.
          </p>
          <p style={{ color: BRAND_SUBTEXT, fontSize: 13, margin: '0 0 20px' }}>
            No hints during the diagnostic — just do your best!
          </p>
          {error && (
            <p style={{ color: '#B91C1C', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}
          <button
            onClick={startQuiz}
            disabled={!me}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 12, border: 'none',
              background: BRAND_DARK, color: 'white',
              fontWeight: 700, fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Start Assessment →
          </button>
        </div>
      )}

      {/* Quiz */}
      {stage === 'quiz' && questions.length > 0 && (() => {
        const q = questions[index]
        return (
          <div style={{
            maxWidth: 560, width: '100%', background: 'var(--bg-card)', borderRadius: 24,
            border: '1px solid var(--border-color)', padding: 28,
            boxShadow: '0 12px 32px rgba(27,43,75,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 13 }}>
                Question {index + 1} of {questions.length}
              </span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: BRAND_BG, borderRadius: 8, padding: '4px 12px',
                border: '1px solid var(--border-color)',
              }}>
                <span style={{ fontSize: 16 }}>⏱️</span>
                <span style={{
                  fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                  color: timer > 60 ? '#ef4444' : BRAND_DARK,
                }}>
                  {String(Math.floor(timer / 60)).padStart(2, '0')}:
                  {String(timer % 60).padStart(2, '0')}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{
              width: '100%', height: 6, background: '#E2E8F0',
              borderRadius: 4, overflow: 'hidden', marginBottom: 18,
            }}>
              <div style={{
                width: `${((index + 1) / questions.length) * 100}%`,
                height: '100%', background: BRAND_GOLD, transition: 'width 0.3s',
              }} />
            </div>
            <h2 style={{ color: BRAND_DARK, fontSize: 18, fontWeight: 800, margin: '0 0 18px' }}>
              {q.question}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(q.options || []).map((opt, i) => {
                const isSelected = answerLocked === i
                const isCorrectChoice = answerLocked !== null && opt === q.correctAnswer
                let bg = 'white', border = '#E2E8F0', color = BRAND_DARK
                if (answerLocked !== null) {
                  if (isCorrectChoice) { bg = '#ECFDF5'; border = 'var(--correct)'; color = '#15803d' }
                  else if (isSelected) { bg = '#FEF2F2'; border = '#FCA5A5'; color = '#B91C1C' }
                }
                return (
                  <button
                    key={i}
                    onClick={() => submitAnswer(i)}
                    disabled={answerLocked !== null}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '12px 16px', borderRadius: 12,
                      border: `2px solid ${border}`, background: bg, color,
                      fontSize: 15, fontWeight: 600,
                      cursor: answerLocked !== null ? 'default' : 'pointer',
                    }}
                  >
                    {stripLetterPrefix(opt)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Submitting */}
      {stage === 'submitting' && (
        <div style={{ textAlign: 'center' }}>
          <RoboVideo src="/assets/robot/thinkinggotidearobo.MP4" width={150} loop={true} />
          <p style={{ color: BRAND_DARK, fontWeight: 700, marginTop: 8 }}>Saving your results…</p>
        </div>
      )}

      {/* Results */}
      {stage === 'results' && (
        <div style={{
          maxWidth: 560, width: '100%', background: 'var(--bg-card)', borderRadius: 24,
          border: '1px solid var(--border-color)', padding: 28, textAlign: 'center',
          boxShadow: '0 12px 32px rgba(27,43,75,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <RoboVideo src="/assets/robot/happyjumpingrobo.MP4" width={160} loop={false} />
          </div>
          <h1 style={{ color: BRAND_DARK, fontSize: 22, fontWeight: 800, margin: '4px 0 6px' }}>
            Great work {me?.name?.split(' ')[0] || ''}! Here&apos;s what we found:
          </h1>
          <p style={{ color: BRAND_SUBTEXT, fontSize: 13, margin: '0 0 18px' }}>
            We set starting levels on {skillsSet} skill{skillsSet === 1 ? '' : 's'}.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {subjectsSummary.map(s => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: BRAND_BG, borderRadius: 12, padding: '12px 16px',
                border: '1px solid var(--border-color)', textAlign: 'left',
              }}>
                <span style={{ fontSize: 28 }}>{s.emoji}</span>
                <div>
                  <div style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                  <div style={{ color: BRAND_SUBTEXT, fontSize: 13 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
          {placement?.rationale && (
            <div style={{
              background: BRAND_BG, borderRadius: 12, padding: '14px 16px',
              border: '1px solid var(--border-color)', textAlign: 'left', marginBottom: 18,
            }}>
              <p style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 13, margin: '0 0 4px' }}>
                📋 Your parents will see this
              </p>
              <p style={{ color: BRAND_SUBTEXT, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                {placement.rationale}
              </p>
            </div>
          )}
          <button
            onClick={() => router.push('/student-dashboard')}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 12, border: 'none',
              background: BRAND_GOLD, color: 'white',
              fontWeight: 700, fontSize: 16, cursor: 'pointer',
            }}
          >
            Let&apos;s start learning! →
          </button>
        </div>
      )}
    </div>
  )
}
