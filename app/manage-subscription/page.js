'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ManageSubscriptionPage() {
  const router = useRouter()
  const [parentId, setParentId] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const authRes = await fetch('/api/auth/me')
      const auth = await authRes.json()
      if (!auth.authenticated) {
        router.push('/login?next=/manage-subscription')
        return
      }
      const pid = auth.user?.userId
      setParentId(pid)
      const res = await fetch(`/api/payments/status?parentId=${pid}`)
      setStatus(await res.json())
      setLoading(false)
    }
    load()
  }, [router])

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/payments/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Could not open billing portal.')
    } catch {
      alert('Could not open billing portal.')
    } finally {
      setPortalLoading(false)
    }
  }

  const planLabel = {
    premium: 'Premium',
    standard: 'Standard',
    free: 'Free',
  }[status?.plan] || 'Free'

  const statusColour =
    status?.subscriptionStatus === 'past_due' ? '#EF4444'
    : status?.accessBlocked ? '#EF4444'
    : '#22C55E'

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8', padding: '32px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1B2B4B' }}>
            MyMaths<span style={{ color: '#C49A1A' }}>Hero</span>
          </h1>
          <p style={{ color: '#64748B', fontSize: 15 }}>Manage your subscription</p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748B' }}>Loading…</p>
        ) : (
          <div style={{ background: 'white', borderRadius: 24, padding: 28,
            border: '1px solid #E2E8F0' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1B2B4B' }}>
                {planLabel} Plan
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'white',
                background: statusColour, padding: '4px 12px', borderRadius: 20 }}>
                {status?.accessBlocked ? 'Inactive'
                  : (status?.subscriptionStatus || (status?.subscribed ? 'Active' : 'None'))}
              </span>
            </div>

            {status?.foundingFamily && (
              <div style={{ background: '#FFFBEB', border: '2px solid #C49A1A',
                borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <p style={{ margin: 0, fontWeight: 800, color: '#1B2B4B', fontSize: 14 }}>
                  🏅 Founding Family
                </p>
                <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
                  $19.99/mo for your first year, then $24.99/mo.
                </p>
              </div>
            )}

            {status?.currentPeriodEnd && (
              <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 16px' }}>
                Next billing date:{' '}
                <strong style={{ color: '#1B2B4B' }}>
                  {new Date(status.currentPeriodEnd).toLocaleDateString('en-AU')}
                </strong>
              </p>
            )}

            {status?.plan === 'free' || !status?.subscribed ? (
              <button
                onClick={() => router.push('/subscribe')}
                style={{ width: '100%', padding: 14, background: '#1B2B4B',
                  color: 'white', border: '2px solid #C49A1A', borderRadius: 12,
                  fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                Choose a Plan →
              </button>
            ) : (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                style={{ width: '100%', padding: 14, background: '#1B2B4B',
                  color: 'white', border: '2px solid #C49A1A', borderRadius: 12,
                  fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                {portalLoading ? 'Opening…' : 'Manage Billing & Payment →'}
              </button>
            )}

            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12,
              marginTop: 16 }}>
              Update payment, change plan, view invoices, or cancel — all via
              Stripe's secure portal.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
