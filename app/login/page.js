'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RoboVideo from '@/components/RoboVideo'
import { useFeatureFlags } from '@/lib/useFeatureFlags'

// Theme-aware: these drive inline styles, so they must be CSS vars (not fixed
// hex) or text/borders go invisible in dark mode.
const BRAND_DARK = 'var(--text-primary)'
const BRAND_GOLD = 'var(--accent-gold)'
const BRAND_BG = 'var(--bg-primary)'
const BRAND_BORDER = 'var(--border-color)'
const BRAND_SUBTEXT = 'var(--text-secondary)'

const ROLES = [
  {
    id: 'student',
    label: "I'm a Student",
    emoji: '🎒',
    desc: 'Log in with your username and PIN',
  },
  {
    id: 'parent',
    label: "I'm a Parent",
    emoji: '👨‍👩‍👧',
    desc: 'Log in with your email and password',
  },
  // Teacher login — hidden until teachersEnabled flag is on. Restore by toggling
  // the flag in the admin console; the role config below is kept intentionally.
  {
    id: 'teacher',
    label: "I'm a Teacher",
    emoji: '📚',
    desc: 'Log in with your email and password',
    flag: 'teachersEnabled',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const { flags } = useFeatureFlags()
  const visibleRoles = ROLES.filter(r => !r.flag || flags[r.flag])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ username: '', pin: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingInfo, setPendingInfo] = useState(null)

  function selectRole(roleId) {
    setSelected(roleId === selected ? null : roleId)
    setError('')
    setPendingInfo(null)
    setForm({ username: '', pin: '', email: '', password: '' })
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
    setPendingInfo(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPendingInfo(null)

    const body = { role: selected }
    if (selected === 'student') {
      body.username = form.username.trim()
      body.pin = form.pin.trim()
    } else {
      body.email = form.email.trim()
      body.password = form.password
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'pending_approval') {
          setPendingInfo({ email: data.email, school: data.school })
        } else {
          setError(data.error || 'Login failed. Please try again.')
        }
        return
      }

      if (data.success && typeof window !== 'undefined') {
        // Cookie is set by the API on the same response, but the browser
        // sometimes hasn't finished writing it before the next navigation.
        // One tick is enough to avoid the race.
        await new Promise(resolve => setTimeout(resolve, 100))

        // window.location.href forces a full reload so the new dashboard
        // mounts with the cookie present from the first request.
        if (selected === 'student') {
          window.location.href = data.user?.diagnosticComplete
            ? '/student-dashboard'
            : '/diagnostic'
        } else if (selected === 'parent') {
          window.location.href = '/parent-dashboard'
        } else if (selected === 'teacher') {
          window.location.href = '/teacher-dashboard'
        }
      }
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const activeRole = visibleRoles.find(r => r.id === selected)

  return (
    <div style={{
      minHeight: '100vh',
      background: BRAND_BG,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Waving Hero — desktop only */}
      <div className="hidden md:flex flex-col items-center" style={{ marginBottom: 8 }}>
        <RoboVideo src="/assets/robot/wavingrobo.MP4" width={180} loop={true} />
        <p style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 16, marginTop: 4 }}>
          Hi! I&apos;m Hero 👋
        </p>
      </div>

      {/* Logo / Branding */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img
          src="/assets/logos/logo-full.png"
          alt="MyMathsHero"
          style={{ height: 48, width: 'auto', margin: '0 auto 14px', display: 'block' }}
          className="h-12 w-auto mx-auto"
        />
        <p style={{ color: BRAND_SUBTEXT, fontSize: 15, margin: 0, fontWeight: 500 }}>
          Personalised AI Maths Learning
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--bg-card)',
        borderRadius: 24,
        border: `1px solid ${BRAND_BORDER}`,
        padding: 32,
        boxShadow: '0 12px 32px rgba(27,43,75,0.08)',
      }}>
        <h2 style={{ color: BRAND_DARK, fontSize: 20, fontWeight: 700, margin: '0 0 24px', textAlign: 'center' }}>
          Who are you?
        </h2>

        {/* Role selector cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibleRoles.map(role => {
            const isSelected = selected === role.id
            return (
              <div key={role.id}>
                <button
                  onClick={() => selectRole(role.id)}
                  style={{
                    width: '100%',
                    background: isSelected ? 'var(--accent-gold-light)' : 'var(--bg-card-elevated)',
                    border: isSelected
                      ? `2px solid ${BRAND_GOLD}`
                      : `1px solid ${BRAND_BORDER}`,
                    borderRadius: 16,
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    fontSize: 28,
                    width: 44, height: 44,
                    borderRadius: 12,
                    background: isSelected ? 'var(--accent-gold-light)' : 'var(--bg-card)',
                    border: `1px solid ${BRAND_BORDER}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{role.emoji}</span>
                  <div>
                    <div style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 16 }}>{role.label}</div>
                    <div style={{ color: BRAND_SUBTEXT, fontSize: 13, marginTop: 2 }}>{role.desc}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: isSelected ? BRAND_GOLD : BRAND_SUBTEXT, fontSize: 18 }}>
                    {isSelected ? '▼' : '›'}
                  </div>
                </button>

                {/* Inline expanded form */}
                {isSelected && (
                  <form
                    onSubmit={handleSubmit}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '0 0 16px 16px',
                      border: `2px solid ${BRAND_GOLD}`,
                      borderTop: 'none',
                      padding: '20px 20px 16px',
                      marginTop: -4,
                    }}
                  >
                    {role.id === 'student' ? (
                      <>
                        <div style={{ marginBottom: 14 }}>
                          <label style={labelStyle}>Username</label>
                          <input
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            placeholder="e.g. alex2026"
                            autoComplete="username"
                            required
                            style={inputStyle()}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <label style={labelStyle}>4-digit PIN</label>
                          <input
                            name="pin"
                            value={form.pin}
                            onChange={handleChange}
                            placeholder="••••"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            pattern="[0-9]{4}"
                            autoComplete="current-password"
                            required
                            style={inputStyle()}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ marginBottom: 14 }}>
                          <label style={labelStyle}>Email address</label>
                          <input
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                            style={inputStyle()}
                          />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label style={labelStyle}>Password</label>
                          <input
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                            style={inputStyle()}
                          />
                        </div>
                        <div style={{ textAlign: 'right', marginBottom: 16 }}>
                          <a
                            href="/forgot-password"
                            style={{ color: 'var(--accent-gold)', fontSize: 13,
                              textDecoration: 'none', fontWeight: 600 }}
                          >
                            Forgot password?
                          </a>
                        </div>
                      </>
                    )}

                    {pendingInfo && role.id === 'teacher' && (
                      <div style={{
                        background: 'var(--accent-gold-light)',
                        border: `1px solid ${BRAND_GOLD}`,
                        borderRadius: 10,
                        padding: '14px 16px',
                        marginBottom: 14,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>🕐</span>
                          <span style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 14 }}>
                            Account Under Review
                          </span>
                        </div>
                        <p style={{ color: BRAND_DARK, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 }}>
                          We&apos;re reviewing your application
                          {pendingInfo.school ? ` for ${pendingInfo.school}` : ''}.
                          You&apos;ll hear from us within 24 hours at{' '}
                          <strong>{pendingInfo.email}</strong>.
                        </p>
                        <a href="/" style={{ color: BRAND_GOLD, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                          ← Return to Home
                        </a>
                      </div>
                    )}

                    {error && (
                      <div style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: 10,
                        padding: '10px 14px',
                        color: '#B91C1C',
                        fontSize: 14,
                        marginBottom: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span>⚠️</span> {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '13px',
                        borderRadius: 12,
                        border: 'none',
                        background: loading ? '#94A3B8' : BRAND_DARK,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = BRAND_GOLD }}
                      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = BRAND_DARK }}
                    >
                      {loading ? (
                        <>
                          <Spinner />
                          Signing in…
                        </>
                      ) : (
                        `Sign in as ${activeRole?.label.replace("I'm a ", '')}`
                      )}
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>

        {/* Onboarding link */}
        <p style={{ textAlign: 'center', marginTop: 28, color: BRAND_SUBTEXT, fontSize: 14 }}>
          Don&apos;t have an account?{' '}
          <a
            href="/onboarding"
            style={{ color: BRAND_GOLD, fontWeight: 600, textDecoration: 'none' }}
          >
            Get started →
          </a>
        </p>
      </div>

      {/* Footer */}
      <p style={{ color: BRAND_SUBTEXT, fontSize: 12, marginTop: 24 }}>
        © {new Date().getFullYear()} MyMathsHero · Safe learning for every child
      </p>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  color: BRAND_SUBTEXT,
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
}

function inputStyle() {
  return {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${BRAND_BORDER}`,
    background: 'var(--bg-card)',
    color: BRAND_DARK,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }
}

function Spinner() {
  return (
    <span style={{
      width: 18, height: 18,
      border: '2.5px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}
