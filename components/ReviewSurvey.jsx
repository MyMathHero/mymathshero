'use client'
import { useState } from 'react'

// Pre-launch review survey (feedback report #8). Two variants:
//   student — "How much did you enjoy MyMathsHero?" + open text
//   parent  — "Did your child seem more confident/motivated?" + open text
// Posts to /api/feedback as type 'review'. rating 1–4 maps to the choice index.
// The parent (caller) controls when this shows + dedupe.

const VARIANTS = {
  student: {
    title: 'Quick question! 😊',
    q1: 'How much did you enjoy using MyMathsHero?',
    choices: ['😞 Didn’t like it', '😐 It was okay', '🙂 Liked it', '🤩 Loved it!'],
    q2: 'What was your favourite part, or what was confusing?',
    placeholder: 'Type anything you want to tell us…',
  },
  parent: {
    title: 'How is it going?',
    q1: 'Did your child seem more confident or motivated to practise maths?',
    choices: ['No', 'A little', 'Yes', 'Definitely'],
    q2: 'What did you like most, and what should we improve before launch?',
    placeholder: 'Your thoughts help us a lot…',
  },
}

const NAVY = '#1B2B4B'
const GOLD = '#C49A1A'

export default function ReviewSurvey({ variant = 'student', userId, onClose }) {
  const v = VARIANTS[variant] || VARIANTS.student
  const [rating, setRating] = useState(0)   // 1–4
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!rating || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: variant,
          type: 'review',
          rating,                                  // 1–4
          message: text.trim() || null,
          context: { survey: variant, choice: v.choices[rating - 1] },
          platform: 'web',
        }),
      })
    } catch {
      // Never block the user on a failed survey post.
    } finally {
      setDone(true)
      setSubmitting(false)
      setTimeout(() => onClose?.(), 1200)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3500, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🙏</div>
            <p style={{ color: NAVY, fontWeight: 800, fontSize: 18, margin: 0 }}>Thank you!</p>
            <p style={{ color: '#64748B', fontSize: 14, margin: '4px 0 0' }}>Your feedback helps us build a better MyMathsHero.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ color: NAVY, fontWeight: 800, fontSize: 18, margin: 0 }}>{v.title}</h3>
              <button onClick={() => onClose?.()} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 20, color: '#94A3B8', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <p style={{ color: NAVY, fontSize: 14, fontWeight: 600, margin: '12px 0 8px' }}>{v.q1}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {v.choices.map((c, i) => {
                const val = i + 1
                const active = rating === val
                return (
                  <button key={c} onClick={() => setRating(val)} style={{
                    textAlign: 'left', padding: '11px 14px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    border: active ? `2px solid ${GOLD}` : '2px solid #E2E8F0',
                    background: active ? '#FFFBEB' : 'white', color: NAVY,
                  }}>{c}</button>
                )
              })}
            </div>

            <p style={{ color: NAVY, fontSize: 14, fontWeight: 600, margin: '16px 0 6px' }}>{v.q2}</p>
            <textarea
              value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={2000}
              placeholder={v.placeholder}
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 10, fontSize: 14, color: NAVY, resize: 'vertical', fontFamily: 'inherit' }}
            />

            <button onClick={submit} disabled={!rating || submitting} style={{
              width: '100%', marginTop: 14, padding: '12px', borderRadius: 12, border: 'none',
              background: rating ? GOLD : '#E2E8F0', color: 'white', fontWeight: 800, fontSize: 15,
              cursor: rating ? 'pointer' : 'default',
            }}>
              {submitting ? 'Sending…' : 'Send feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
