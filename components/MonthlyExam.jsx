'use client'
import { useState, useEffect } from 'react'
import MathText from './MathText'
import FractionVisual from './FractionVisual'

// Monthly Review Exam — a self-contained 20-question review modal. Fetches the
// batch from /api/student/monthly-exam, collects answers locally, submits once,
// and shows the score + any coin bonus (85→50, 90→80, 95→100). Once a month.
export default function MonthlyExam({ studentId, onClose, onDone }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([]) // { questionId, answer }
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { score, bonusAwarded, alreadyTaken }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/student/monthly-exam?studentId=${studentId}`)
        const data = await res.json()
        if (!data.due) {
          // Not due yet — nothing to take right now.
          setResult({ notDue: true, daysUntil: data.daysUntil })
        } else if (!data.available || !data.questions?.length) {
          setError('No review questions available right now. Try again later!')
        } else {
          setQuestions(data.questions)
        }
      } catch {
        setError('Could not load the review exam.')
      } finally {
        setLoading(false)
      }
    })()
  }, [studentId])

  const q = questions[idx]

  function choose(option) {
    const next = [...answers.filter(a => a.questionId !== q.questionId), { questionId: q.questionId, answer: option }]
    setAnswers(next)
    if (idx + 1 < questions.length) {
      setIdx(idx + 1)
    } else {
      submit(next)
    }
  }

  async function submit(finalAnswers) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/student/monthly-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, answers: finalAnswers }),
      })
      const data = await res.json()
      setResult(data)
      onDone?.(data)
    } catch {
      setError('Could not submit your answers.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl shadow-2xl w-full max-w-lg relative pop-in overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="h-2 bg-gradient-to-r from-amber-500 to-yellow-500" />
        <div className="p-6 sm:p-8">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 text-xl">✕</button>

          {loading && <p style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Loading your monthly review… ✦</p>}
          {error && <p style={{ textAlign: 'center', padding: 24, color: '#EF4444' }}>{error}</p>}

          {/* Not due yet */}
          {result?.notDue && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>📅</div>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 22, margin: '0 0 6px' }}>No exam due yet</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                Your next HERO monthly exam is in <strong>{result.daysUntil}</strong> day{result.daysUntil === 1 ? '' : 's'}. Keep practising! 💪
              </p>
              <button onClick={onClose} style={{
                marginTop: 20, width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, var(--accent-gold), #FFD700)',
                color: '#1B2B4B', fontWeight: 800, fontSize: 15, cursor: 'pointer',
              }}>Got it</button>
            </div>
          )}

          {/* Result screen */}
          {result && !result.notDue && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 60, marginBottom: 8 }}>{result.score >= 85 ? '🏆' : '📊'}</div>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 24, margin: '0 0 6px' }}>
                {result.alreadyTaken ? 'Exam already submitted' : 'HERO Exam complete!'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: '0 0 4px' }}>
                Score: <strong>{result.score}%</strong>
              </p>
              {result.bonusAwarded > 0 ? (
                <p style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: 18, margin: '8px 0 0' }}>
                  +{result.bonusAwarded} 🪙 bonus!
                </p>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '8px 0 0' }}>
                  Score 85%+ next time to earn a coin bonus!
                </p>
              )}
              {result.heroSummary && (
                <div style={{
                  marginTop: 14, textAlign: 'left', background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)', borderRadius: 12, padding: '12px 14px',
                }}>
                  <p style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: 12, margin: '0 0 4px' }}>🦸 Hero says</p>
                  <p style={{ color: 'var(--text-primary)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{result.heroSummary}</p>
                </div>
              )}
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '10px 0 0' }}>
                Freestyle practice, arcade &amp; challenges are now unlocked. 🎉
              </p>
              <button onClick={onClose} style={{
                marginTop: 16, width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, var(--accent-gold), #FFD700)',
                color: '#1B2B4B', fontWeight: 800, fontSize: 15, cursor: 'pointer',
              }}>Done</button>
            </div>
          )}

          {/* Question screen */}
          {!loading && !error && !result && q && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 800, color: 'var(--accent-gold)', fontSize: 13 }}>📅 Monthly Review</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{idx + 1} / {questions.length}</span>
              </div>
              <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden', marginBottom: 18 }}>
                <div style={{ height: '100%', width: `${((idx) / questions.length) * 100}%`, background: 'var(--accent-gold)', transition: 'width 0.3s' }} />
              </div>

              <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18, margin: '0 0 14px' }}>
                <MathText>{q.question}</MathText>
              </p>
              {q.visual && <div style={{ marginBottom: 14 }}><FractionVisual visual={q.visual} /></div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(q.options || []).map((opt, i) => (
                  <button
                    key={i}
                    disabled={submitting}
                    onClick={() => choose(opt)}
                    style={{
                      textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                      border: '2px solid var(--border-color)', background: 'var(--bg-card)',
                      color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                    }}
                  >
                    <MathText>{String(opt).replace(/^\s*[A-Da-d][).:]\s*/, '')}</MathText>
                  </button>
                ))}
              </div>
              {submitting && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 12 }}>Scoring…</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
