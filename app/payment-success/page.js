'use client'

import { useRouter } from 'next/navigation'

export default function PaymentSuccessPage() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1B2B4B 0%, #0f2347 60%, #1a1a3e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 24,
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #1B2B4B, #60A5FA)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, margin: '0 auto 20px',
          boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
        }}>🧠</div>

        {/* Green checkmark */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(22,163,74,0.15)',
          border: '2px solid rgba(22,163,74,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, margin: '0 auto 24px',
        }}>✅</div>

        <h1 style={{
          color: '#fff', fontSize: 26, fontWeight: 800,
          margin: '0 0 12px', letterSpacing: '-0.5px',
        }}>
          You&apos;re all set! 🎉
        </h1>

        <p style={{
          color: '#94A3B8', fontSize: 15, lineHeight: 1.6,
          margin: '0 0 32px',
        }}>
          Your 14-day free trial has started.{' '}
          We&apos;ll only charge you after the trial ends.
        </p>

        <div style={{
          background: 'rgba(37,99,235,0.1)',
          border: '1px solid rgba(37,99,235,0.25)',
          borderRadius: 14, padding: '16px 20px',
          marginBottom: 28,
        }}>
          <p style={{ color: '#93C5FD', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            💡 <strong>What happens next?</strong><br />
            Log in and your child can start learning straight away.
            After 14 days, your subscription of <strong>$14 AUD/month</strong> begins automatically.
          </p>
        </div>

        <button
          onClick={() => router.push('/parent-dashboard')}
          style={{
            width: '100%', padding: '13px',
            borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #1B2B4B, #1B2B4Bcc)',
            color: '#fff', fontWeight: 700, fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
          }}
        >
          Go to Dashboard →
        </button>
      </div>

      <p style={{ color: '#1e3050', fontSize: 12, marginTop: 24 }}>
        © {new Date().getFullYear()} MyMathsHero · Questions? hello@mymathshero.com.au
      </p>
    </div>
  )
}
