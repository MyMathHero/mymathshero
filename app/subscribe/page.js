'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SubscribePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(null)
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const [parentId, setParentId] = useState(null)
  const [email, setEmail] = useState(null)
  const [isFoundingFamily, setIsFoundingFamily] = useState(false)
  const [foundingCount, setFoundingCount] = useState(0)

  useEffect(() => {
    async function load() {
      const authRes = await fetch('/api/auth/me')
      const auth = await authRes.json()
      if (auth.authenticated) {
        setParentId(auth.user?.userId)
        setEmail(auth.user?.email || null)
      }
      // Check founding family count
      const countRes = await fetch('/api/payments/founding-count')
      const countData = await countRes.json()
      setFoundingCount(countData.count || 0)
      setIsFoundingFamily((countData.count || 0) < 1000)
    }
    load()
  }, [])

  // The actual Stripe price IDs are server-only env vars, so the client sends a
  // stable `planKey` (or the `isFoundingFamily` flag) and the API resolves it.
  async function handleSubscribe(planKey, planName) {
    if (!parentId) {
      router.push('/login?next=/subscribe')
      return
    }
    setLoading(planName)
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId,
          email,
          planKey,
          isFoundingFamily: planName === 'founding',
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Error. Please try again.')
    } catch {
      alert('Error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const spotsLeft = Math.max(0, 1000 - foundingCount)

  return (
    <div style={{ minHeight: '100vh',
      background: '#F0F4F8', padding: '32px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800,
            color: '#1B2B4B' }}>
            MyMaths<span style={{ color: '#C49A1A' }}>Hero</span>
          </h1>
          <p style={{ color: '#64748B', fontSize: 16 }}>
            Choose your plan to get started
          </p>
        </div>

        {/* Founding family banner */}
        {isFoundingFamily && spotsLeft > 0 && (
          <div style={{ background: '#1B2B4B',
            borderRadius: 16, padding: 20,
            marginBottom: 28, textAlign: 'center',
            border: '2px solid #C49A1A' }}>
            <p style={{ color: '#C49A1A', fontWeight: 900,
              fontSize: 18, margin: '0 0 4px' }}>
              🏅 Founding Family Offer
            </p>
            <p style={{ color: 'rgba(255,255,255,0.8)',
              fontSize: 14, margin: '0 0 4px' }}>
              Only <strong style={{ color: '#C49A1A' }}>
                {spotsLeft} spots left
              </strong> at this price
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)',
              fontSize: 13, margin: 0 }}>
              1 month free · then $19.99/mo for first year · then $24.99/mo
            </p>
          </div>
        )}

        {/* Billing toggle — only for standard plans */}
        <div style={{ display: 'flex',
          justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ background: 'white', borderRadius: 20,
            padding: 4, display: 'flex' }}>
            {['monthly', 'annual'].map(p => (
              <button key={p}
                onClick={() => setBillingPeriod(p)}
                style={{
                  padding: '10px 24px', borderRadius: 16,
                  border: 'none', fontWeight: 700,
                  cursor: 'pointer', fontSize: 14,
                  background: billingPeriod === p
                    ? '#1B2B4B' : 'transparent',
                  color: billingPeriod === p
                    ? 'white' : '#64748B',
                }}>
                {p === 'annual'
                  ? '📅 Annual (save 17%)' : '📆 Monthly'}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'flex', gap: 16,
          justifyContent: 'center', flexWrap: 'wrap' }}>

          {/* Founding Family card — only if spots remain */}
          {isFoundingFamily && spotsLeft > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #1B2B4B, #2D4A7A)',
              borderRadius: 24, padding: 28, width: 320,
              border: '2px solid #C49A1A',
              boxShadow: '0 8px 32px rgba(27,43,75,0.3)',
              position: 'relative' }}>
              <div style={{ position: 'absolute', top: -14,
                left: '50%', transform: 'translateX(-50%)',
                background: '#C49A1A', color: 'white',
                padding: '4px 20px', borderRadius: 20,
                fontSize: 12, fontWeight: 800,
                whiteSpace: 'nowrap' }}>
                🏅 FOUNDING FAMILY
              </div>
              <h2 style={{ color: 'white', fontWeight: 800,
                fontSize: 20, margin: '8px 0 4px' }}>
                Premium — Founding
              </h2>
              <div style={{ margin: '12px 0' }}>
                <p style={{ color: '#22C55E', fontWeight: 800,
                  fontSize: 16, margin: 0 }}>
                  Month 1: FREE
                </p>
                <p style={{ color: '#C49A1A', fontWeight: 900,
                  fontSize: 32, margin: '4px 0 0' }}>
                  $19.99
                  <span style={{ fontSize: 14,
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: 400 }}>
                    /mo · months 2-12
                  </span>
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)',
                  fontSize: 13, margin: '4px 0 0' }}>
                  then $24.99/mo from month 13
                </p>
              </div>
              {['✅ Everything in Premium',
                '✅ 1 month completely free',
                '✅ $60 savings in first year',
                '✅ Locked in for life',
                `✅ Only ${spotsLeft} spots remaining`,
              ].map((f, i) => (
                <p key={i} style={{ color: 'rgba(255,255,255,0.85)',
                  fontSize: 13, margin: '6px 0' }}>{f}</p>
              ))}
              <button
                onClick={() => handleSubscribe('foundingMonthly', 'founding')}
                disabled={loading === 'founding'}
                style={{ width: '100%', padding: 14,
                  marginTop: 16, background: '#C49A1A',
                  color: 'white', border: 'none',
                  borderRadius: 12, fontWeight: 800,
                  fontSize: 15, cursor: 'pointer' }}>
                {loading === 'founding'
                  ? 'Loading...' : 'Claim Founding Offer →'}
              </button>
            </div>
          )}

          {/* Standard */}
          <div style={{ background: 'white', borderRadius: 24,
            padding: 28, width: 300,
            border: '2px solid #E2E8F0' }}>
            <h2 style={{ color: '#1B2B4B', fontWeight: 800,
              fontSize: 20, margin: '0 0 4px' }}>
              Standard
            </h2>
            <p style={{ fontSize: 34, fontWeight: 900,
              color: '#1B2B4B', margin: '12px 0 4px' }}>
              {billingPeriod === 'monthly'
                ? '$14.99' : '$149.90'}
              <span style={{ fontSize: 13,
                color: '#64748B', fontWeight: 400 }}>
                /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
              </span>
            </p>
            {['✅ All Maths curriculum',
              '✅ Hero Points + badges',
              '✅ Weekly Hero Report',
              '✅ Hero League leaderboard',
              '❌ Ask Hero AI Tutor',
              '❌ Voice explanations',
            ].map((f, i) => (
              <p key={i} style={{ fontSize: 13,
                color: '#334155', margin: '6px 0' }}>{f}</p>
            ))}
            <button
              onClick={() => handleSubscribe(
                billingPeriod === 'monthly'
                  ? 'standardMonthly'
                  : 'standardAnnual',
                'standard'
              )}
              disabled={loading === 'standard'}
              style={{ width: '100%', padding: 14,
                marginTop: 16, background: 'white',
                color: '#1B2B4B',
                border: '2px solid #1B2B4B',
                borderRadius: 12, fontWeight: 700,
                fontSize: 15, cursor: 'pointer' }}>
              {loading === 'standard'
                ? 'Loading...' : 'Get Started'}
            </button>
          </div>

          {/* Premium */}
          <div style={{ background: '#1B2B4B', borderRadius: 24,
            padding: 28, width: 300,
            border: '2px solid #C49A1A',
            position: 'relative' }}>
            <div style={{ position: 'absolute', top: -14,
              left: '50%', transform: 'translateX(-50%)',
              background: '#C49A1A', color: 'white',
              padding: '4px 20px', borderRadius: 20,
              fontSize: 12, fontWeight: 800 }}>
              MOST POPULAR
            </div>
            <h2 style={{ color: 'white', fontWeight: 800,
              fontSize: 20, margin: '8px 0 4px' }}>
              Premium
            </h2>
            <p style={{ fontSize: 34, fontWeight: 900,
              color: '#C49A1A', margin: '12px 0 4px' }}>
              {billingPeriod === 'monthly'
                ? '$24.99' : '$249.90'}
              <span style={{ fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 400 }}>
                /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
              </span>
            </p>
            {['✅ Everything in Standard',
              '✅ Ask Hero AI Tutor',
              '✅ Voice explanations',
              '✅ Full Arcade access',
              '✅ Priority support',
            ].map((f, i) => (
              <p key={i} style={{ fontSize: 13,
                color: 'rgba(255,255,255,0.85)',
                margin: '6px 0' }}>{f}</p>
            ))}
            <button
              onClick={() => handleSubscribe(
                billingPeriod === 'monthly'
                  ? 'premiumMonthly'
                  : 'premiumAnnual',
                'premium'
              )}
              disabled={loading === 'premium'}
              style={{ width: '100%', padding: 14,
                marginTop: 16, background: '#C49A1A',
                color: 'white', border: 'none',
                borderRadius: 12, fontWeight: 800,
                fontSize: 15, cursor: 'pointer' }}>
              {loading === 'premium'
                ? 'Loading...' : 'Get Started →'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#94A3B8',
          fontSize: 13, marginTop: 24 }}>
          Cancel anytime · Secure payments via Stripe ·
          AUD pricing
        </p>
      </div>
    </div>
  )
}
