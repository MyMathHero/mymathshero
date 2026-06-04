'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VOUCHER_TIERS } from '@/lib/arcadeVouchers'

export default function VouchersPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        // The vouchers API itself reads the session cookie; we ping /me first
        // so we can bounce unauthenticated visitors to /login before they see
        // an Unauthorized error.
        const meRes = await fetch('/api/auth/me')
        if (!meRes.ok) {
          router.replace('/login')
          return
        }
        const auth = await meRes.json()
        if (!auth.authenticated || auth.user.role !== 'student') {
          router.replace('/login')
          return
        }
        const res = await fetch('/api/student/vouchers')
        setData(await res.json())
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleRedeem(tier) {
    if ((data?.xp || 0) < tier.pointsCost) {
      alert(`You need ${tier.pointsCost - (data?.xp || 0)} more Hero Points!`)
      return
    }
    if (!confirm(`Spend ${tier.pointsCost} Hero Points for a ${tier.name} (${tier.value})?`)) return

    setRedeeming(tier.id)
    try {
      const res = await fetch('/api/student/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: tier.id }),
      })
      const result = await res.json()
      if (result.success) {
        setSuccess(result)
        setData(prev => ({
          ...prev,
          xp: result.newXP,
          vouchers: [result.voucher, ...(prev?.vouchers || [])],
        }))
      } else {
        alert(result.error || 'Could not redeem')
      }
    } catch {
      alert('Connection error')
    } finally {
      setRedeeming(null)
    }
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#1B2B4B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <p style={{ color: '#C49A1A', fontSize: 18, fontWeight: 700 }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      {/* Header */}
      <div style={{
        background: '#1B2B4B', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/student-dashboard" style={{
          color: '#C49A1A', fontWeight: 700, textDecoration: 'none',
        }}>← Hero HQ</a>
        <h1 style={{ color: 'white', fontWeight: 900, margin: 0, fontSize: 22 }}>
          🎟️ Hero Vouchers
        </h1>
        <div style={{
          background: 'rgba(196,154,26,0.2)',
          borderRadius: 20, padding: '6px 16px',
        }}>
          <span style={{ color: '#C49A1A', fontWeight: 800 }}>
            ⚡ {data?.xp || 0} pts
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        {success && (
          <div style={{
            background: '#DCFCE7', border: '2px solid #22C55E',
            borderRadius: 16, padding: 20, marginBottom: 24, textAlign: 'center',
          }}>
            <p style={{ fontSize: 48, margin: 0 }}>🎉</p>
            <h2 style={{ color: '#166534', fontWeight: 800 }}>Voucher Redeemed!</h2>
            <p style={{ color: '#166534' }}>{success.message}</p>
            <button
              onClick={() => setSuccess(null)}
              style={{
                background: '#22C55E', color: 'white', border: 'none',
                borderRadius: 10, padding: '10px 24px', fontWeight: 700,
                cursor: 'pointer', marginTop: 8,
              }}
            >Continue ✓</button>
          </div>
        )}

        {/* How it works */}
        <div style={{
          background: '#1B2B4B', borderRadius: 16, padding: 20,
          marginBottom: 28, border: '1px solid #C49A1A',
        }}>
          <h2 style={{
            color: '#C49A1A', fontWeight: 800,
            margin: '0 0 12px', fontSize: 17,
          }}>🕹️ How Hero Vouchers Work</h2>
          {[
            '1. Answer Maths questions to earn Hero Points ⚡',
            '2. Reach enough points to unlock a voucher tier',
            '3. Redeem your points for Hero Arcade Credits',
            '4. Your parent gets the voucher code by email',
          ].map((step, i) => (
            <p key={i} style={{
              color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: '6px 0',
            }}>{step}</p>
          ))}
        </div>

        <h2 style={{ fontWeight: 800, color: '#1B2B4B', marginBottom: 16 }}>
          Available Vouchers
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {VOUCHER_TIERS.map(tier => {
            const canAfford = (data?.xp || 0) >= tier.pointsCost
            const needed = tier.pointsCost - (data?.xp || 0)
            return (
              <div key={tier.id} style={{
                background: canAfford ? tier.lightColor : 'white',
                borderRadius: 18,
                border: `2px solid ${canAfford ? tier.color : '#E2E8F0'}`,
                padding: 20,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ fontSize: 48 }}>{tier.emoji}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    color: '#1B2B4B', fontWeight: 800,
                    margin: '0 0 4px', fontSize: 18,
                  }}>{tier.name}</h3>
                  <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 4px' }}>
                    {tier.description}
                  </p>
                  {!canAfford && (
                    <p style={{
                      color: '#EF4444', fontSize: 12,
                      fontWeight: 600, margin: 0,
                    }}>Need {needed} more points</p>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    color: tier.color, fontWeight: 800,
                    fontSize: 24, margin: '0 0 6px',
                  }}>{tier.value}</p>
                  <button
                    onClick={() => handleRedeem(tier)}
                    disabled={!canAfford || redeeming === tier.id}
                    style={{
                      background: canAfford ? '#1B2B4B' : '#E2E8F0',
                      color: canAfford ? 'white' : '#94A3B8',
                      border: canAfford ? '2px solid #C49A1A' : 'none',
                      borderRadius: 10, padding: '10px 20px',
                      fontWeight: 700, fontSize: 13,
                      cursor: canAfford ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {redeeming === tier.id ? '…' : `⚡ ${tier.pointsCost} pts`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {(data?.vouchers || []).length > 0 && (
          <>
            <h2 style={{ fontWeight: 800, color: '#1B2B4B', marginBottom: 16 }}>
              My Vouchers
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.vouchers.map((v, i) => (
                <div key={i} style={{
                  background: 'white', borderRadius: 14,
                  padding: 16, display: 'flex',
                  alignItems: 'center', gap: 14,
                  border: '1px solid #E2E8F0',
                }}>
                  <span style={{ fontSize: 32 }}>{v.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: '#1B2B4B', margin: '0 0 2px' }}>
                      {v.tierName}
                    </p>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                      Ref: {v.code}
                    </p>
                  </div>
                  <span style={{
                    background:
                      v.status === 'redeemed' ? '#DCFCE7'
                      : v.status === 'sent'   ? '#EFF6FF'
                      : '#FFFBEB',
                    color:
                      v.status === 'redeemed' ? '#166534'
                      : v.status === 'sent'   ? '#1E40AF'
                      : '#92400E',
                    borderRadius: 10, padding: '4px 12px',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {v.status === 'redeemed' ? '✅ Used' : v.status === 'sent' ? '📧 Code sent' : '⏳ Pending'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
