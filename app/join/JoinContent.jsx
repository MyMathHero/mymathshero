'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const NAVY = '#1B2B4B', GOLD = '#C49A1A', CREAM = '#F4EFE3'

export default function JoinContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('invite') || ''

  const [state, setState] = useState('loading') // loading | valid | invalid | converted
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    ;(async () => {
      try {
        const res = await fetch(`/api/founding-invite?token=${encodeURIComponent(token)}`)
        const d = await res.json().catch(() => ({}))
        if (!d?.valid) { setState('invalid'); return }
        setData(d)
        setState(d.alreadyConverted ? 'converted' : 'valid')
      } catch {
        setState('invalid')
      }
    })()
  }, [token])

  // Carry the invite token into onboarding (so signup can be tagged founding +
  // conversion tracked). Stored so it survives the multi-step onboarding flow.
  function claim() {
    try {
      sessionStorage.setItem('mmh_invite', token)
      if (data?.email) sessionStorage.setItem('mmh_invite_email', data.email)
    } catch { /* ignore */ }
    router.push(`/onboarding?invite=${encodeURIComponent(token)}`)
  }

  const offer = data?.offer

  return (
    <div style={{ minHeight: '100vh', background: CREAM, color: NAVY,
      fontFamily: "'DM Sans', system-ui, sans-serif", display: 'grid', placeItems: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 24,
        border: '1px solid #E7ECF3', boxShadow: '0 24px 60px rgba(27,43,75,0.12)', padding: '36px 28px', textAlign: 'center' }}>

        <div style={{ fontSize: 44, marginBottom: 8 }}>🎁</div>

        {state === 'loading' && <p style={{ color: '#64748B' }}>Checking your invite…</p>}

        {state === 'invalid' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 10px' }}>This invite link isn’t valid</h1>
            <p style={{ color: '#64748B', margin: '0 0 20px' }}>
              The link may be mistyped or expired. If you joined the waitlist, check your email for your personal invite.
            </p>
            <a href="/coming-soon" style={btnGhost}>Back to MyMathsHero</a>
          </>
        )}

        {state === 'converted' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 10px' }}>You’re already in! 🎉</h1>
            <p style={{ color: '#64748B', margin: '0 0 20px' }}>Your founding-family account is active.</p>
            <a href="/login" style={btnGold}>Log in →</a>
          </>
        )}

        {state === 'valid' && offer && (
          <>
            <div style={{ display: 'inline-block', background: 'rgba(196,154,26,0.12)', color: GOLD,
              fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
              padding: '6px 14px', borderRadius: 99, marginBottom: 14 }}>
              Founding Family Invite
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, margin: '0 0 6px' }}>
              {data.firstName ? `${data.firstName}, your spot is ready` : 'Your founding spot is ready'}
            </h1>
            <p style={{ color: '#475569', margin: '0 0 22px' }}>{offer.headline}</p>

            <div style={{ textAlign: 'left', background: '#F7F9FC', border: '1px solid #E7ECF3',
              borderRadius: 16, padding: '18px 20px', margin: '0 0 24px' }}>
              {offer.bullets.map((b, i) => (
                <p key={i} style={{ margin: '8px 0', fontSize: 14.5, color: NAVY, fontWeight: 600 }}>
                  <span style={{ color: '#16A34A', marginRight: 8 }}>✓</span>{b}
                </p>
              ))}
            </div>

            <button onClick={claim} style={{ ...btnGold, width: '100%', border: 'none', cursor: 'pointer' }}>
              Claim my founding spot →
            </button>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 14 }}>
              You’ll create your account, add your child, then enter your card. The first month is free — you can cancel anytime before it ends.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const btnGold = {
  display: 'inline-block', background: 'linear-gradient(135deg, #C49A1A, #FFD700)',
  color: '#1B2B4B', fontWeight: 800, fontSize: 16, padding: '15px 26px', borderRadius: 14,
  textDecoration: 'none', boxShadow: '0 10px 26px rgba(245,158,11,0.35)',
}
const btnGhost = {
  display: 'inline-block', color: '#1B2B4B', fontWeight: 700, fontSize: 15,
  padding: '13px 22px', borderRadius: 12, textDecoration: 'none', border: '1px solid #E2E8F0',
}
