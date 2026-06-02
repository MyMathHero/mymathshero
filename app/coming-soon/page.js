'use client'

import { useState, useEffect } from 'react'
import MathCountdownBar from '@/components/MathCountdownBar'
import { LAUNCH_DATE_DISPLAY } from '@/lib/launchDate'

export default function ComingSoonPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [position, setPosition] = useState(null)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const cleaned = email.trim().toLowerCase()
    if (!cleaned || !cleaned.includes('@') || cleaned.length < 5) {
      setError('Please enter a valid email')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleaned }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.position) setPosition(data.position)
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={S.root}>
      {/* Inline responsive overrides — the inline-style approach doesn't do media queries */}
      <style>{`
        @media (max-width: 980px) {
          .cs-hero-body { grid-template-columns: 1fr !important; padding: 24px !important; gap: 20px !important; }
          .cs-right { min-height: 280px !important; order: -1; }
          .cs-h1 { font-size: 34px !important; }
        }
        @media (min-width: 1400px) {
          .cs-hero-body { padding: 40px 56px !important; gap: 56px !important; }
        }
      `}</style>
      <MathCountdownBar />

      <main style={S.main}>
        {/* ── BIG HERO CARD ─────────────────────────────────────────── */}
        <div style={S.heroCard}>
          <div style={S.heroBody} className="cs-hero-body">
            {/* Left column: brand + headline + bullets */}
            <div style={S.left}>
              <div style={S.brandRow}>
                <img
                  src="/assets/logos/logo-icon.png"
                  alt=""
                  style={S.brandLogo}
                />
                <div>
                  <div style={S.brandWord}>
                    <span style={{ color: '#1B2B4B' }}>MyMaths</span>
                    <span style={{ color: '#C49A1A' }}>Hero</span>
                  </div>
                  <div style={S.brandTag}>PERSONALISED MATHS LEARNING</div>
                </div>
              </div>

              <h1 style={S.h1} className="cs-h1">
                Confidence starts<br/>
                when maths<br/>
                <span style={{ color: '#C49A1A' }}>makes sense.</span>
                <span style={S.sparkles} aria-hidden>✦</span>
              </h1>

              <p style={S.sub}>
                Personalised maths learning that helps<br/>
                your child{' '}
                <span style={{ color: '#2563EB', fontWeight: 700 }}>understand</span>,{' '}
                <span style={{ color: '#16A34A', fontWeight: 700 }}>improve</span>{' '}
                and{' '}
                <span style={{ color: '#DC2626', fontWeight: 700 }}>thrive</span>.
              </p>

              <div style={S.bullets}>
                {BULLETS.map(b => (
                  <div key={b.title} style={S.bullet}>
                    <div style={{ ...S.bulletIcon, background: b.bg, color: b.fg }}>
                      <span style={{ fontSize: 18 }}>{b.emoji}</span>
                    </div>
                    <div>
                      <div style={S.bulletTitle}>{b.title}</div>
                      <div style={S.bulletDesc}>{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: cropped kids+robot photo from the original artwork */}
            <div style={S.right} className="cs-right" aria-hidden>
              <div style={S.photoFrame}>
                <div
                  style={{
                    ...S.photoCrop,
                    backgroundImage: 'url("/assets/coming-soon-hero.png")',
                  }}
                />
              </div>
              {/* Floating "Great job!" speech bubble */}
              <div style={S.bubble}>
                <span style={{ color: '#F59E0B', marginRight: 6, fontSize: 16 }}>★</span>
                <strong style={{ color: '#1B2B4B' }}>Great job!</strong>
                <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>
                  You&apos;re getting<br/>better every day! <span style={{ color: '#EF4444' }}>❤</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gold footer band inside the card */}
          <div style={S.goldBand}>
            <div style={S.goldBandLeft}>
              <span style={{ fontSize: 26 }}>🛡️</span>
              <span>
                Join the first <strong>1,000 families</strong> and lock in{' '}
                <span style={{ color: '#C49A1A' }}>founding member pricing.</span>
              </span>
            </div>
            <div style={S.goldBandMid}>
              <span style={{ fontSize: 22 }}>🎁</span>
              <div>
                <div style={{ fontWeight: 800, color: '#1B2B4B' }}>1 MONTH FREE</div>
                <div style={{ fontSize: 11, color: '#475569' }}>for founding members</div>
              </div>
            </div>
            <a href="#waitlist" style={S.goldBandCta}>
              Join the Waitlist ›
            </a>
          </div>
        </div>

        {/* ── TRUST PILLS ──────────────────────────────────────────── */}
        <div style={S.pills}>
          {PILLS.map(p => (
            <div key={p.title} style={S.pill}>
              <div style={S.pillIcon}>{p.icon}</div>
              <div>
                <div style={S.pillTitle}>{p.title}</div>
                <div style={S.pillDesc}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── LIVE WAITLIST FORM ───────────────────────────────────── */}
        <section style={S.formCard} id="waitlist">
          {!submitted ? (
            <>
              <p style={S.formEyebrow}>Launching {LAUNCH_DATE_DISPLAY}</p>
              <h2 style={S.formTitle}>Join the founding family waitlist</h2>
              <p style={S.formSub}>
                Be one of our first 1,000 families — lock in founding-member pricing and your first month free.
              </p>
              <form onSubmit={handleSubmit} style={S.formRow} noValidate>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="parent@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  aria-label="Email address"
                  style={S.input}
                  disabled={submitting}
                />
                <button type="submit" disabled={submitting} style={S.cta}>
                  {submitting ? 'Joining…' : 'Join the Waitlist →'}
                </button>
              </form>
              {error && <p style={S.errorText}>{error}</p>}
              <p style={S.privacy}>We email once at launch. No spam — promise.</p>
            </>
          ) : (
            <div style={S.successWrap}>
              <div style={S.successIcon}>🎉</div>
              <h2 style={S.formTitle}>You&apos;re on the list!</h2>
              <p style={S.formSub}>
                {position
                  ? <>You&apos;re <strong style={{ color: '#C49A1A' }}>#{position}</strong> on the waitlist. Watch your inbox.</>
                  : 'Watch your inbox for launch updates and your founding-family discount.'}
              </p>
            </div>
          )}
        </section>

        <footer style={S.footer}>
          <p style={S.footerBrand}>
            MyMaths<span style={{ color: '#C49A1A' }}>Hero</span>
          </p>
          <p style={S.footerLine}>
            © {hydrated ? new Date().getFullYear() : 2026} MyMathsHero · mymathshero.com.au · Made in Australia
          </p>
        </footer>
      </main>
    </div>
  )
}

// ── Data ─────────────────────────────────────────────────────────────────────

const BULLETS = [
  { emoji: '👥', title: 'Personalised learning',
    desc: "Lessons adapt to your child's level and learning pace.",
    bg: '#EFF6FF', fg: '#2563EB' },
  { emoji: '🎯', title: 'Curriculum aligned',
    desc: 'Following the Australian Curriculum from Prep to Year 6.',
    bg: '#F0FDF4', fg: '#16A34A' },
  { emoji: '📈', title: 'Step-by-step support',
    desc: 'Clear explanations and hints that build understanding.',
    bg: '#FFFBEB', fg: '#C49A1A' },
  { emoji: '❤️', title: 'Builds confidence',
    desc: 'Encourages progress and celebrates every achievement.',
    bg: '#FEF2F2', fg: '#DC2626' },
]

const PILLS = [
  { icon: '🇦🇺', title: 'Australian Curriculum Aligned',
    desc: 'Relevant. Reliable. Trusted.' },
  { icon: '🎓', title: 'Designed for Prep to Year 6',
    desc: 'Age-appropriate and engaging.' },
  { icon: '👥', title: 'Built with educators and learning experts',
    desc: 'Created by people who understand learning.' },
  { icon: '🔒', title: 'Safe & secure',
    desc: "Your child's data is always protected." },
]

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  root: {
    minHeight: '100vh',
    background: '#F4EFE3',
    fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
    color: '#1B2B4B',
  },
  main: {
    maxWidth: 1600,
    margin: '0 auto',
    padding: '20px 32px 40px',
  },

  // Hero card
  heroCard: {
    background: 'white',
    borderRadius: 28,
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(27,43,75,0.15)',
    border: '1px solid #E2E8F0',
  },
  heroBody: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
    gap: 32,
    padding: '32px 40px',
    alignItems: 'stretch',
  },

  // Left column
  left: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 },
  brandRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  brandLogo: {
    width: 56, height: 56,
    objectFit: 'contain',
    display: 'block',
    flexShrink: 0,
  },
  brandWord: {
    fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1,
  },
  brandTag: {
    fontSize: 10, fontWeight: 700, color: '#64748B',
    letterSpacing: '2px', marginTop: 4,
  },

  h1: {
    fontSize: 'clamp(32px, 3.8vw, 52px)',
    fontWeight: 900,
    lineHeight: 1.06,
    letterSpacing: '-1.5px',
    margin: '0 0 14px',
    color: '#1B2B4B',
    position: 'relative',
  },
  sparkles: { color: '#F59E0B', marginLeft: 6, fontSize: 24 },
  sub: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 1.5,
    margin: '0 0 20px',
  },

  bullets: { display: 'flex', flexDirection: 'column', gap: 12 },
  bullet: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  bulletIcon: {
    width: 40, height: 40, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bulletTitle: { fontWeight: 800, color: '#1B2B4B', fontSize: 15, marginBottom: 2 },
  bulletDesc: { color: '#64748B', fontSize: 13, lineHeight: 1.45 },

  // Right column (photo)
  right: {
    position: 'relative',
    minHeight: 400,
    borderRadius: 20,
    overflow: 'visible',
  },
  photoFrame: {
    position: 'absolute',
    inset: 0,
    borderRadius: 20,
    overflow: 'hidden',
    background: '#F0F4F8',
  },
  photoCrop: {
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    // The kids+robot region sits in the right-centre of the source image.
    // If your saved file is cropped differently, tweak this one value.
    backgroundPosition: '72% 35%',
    transform: 'scale(1.25)',
    transformOrigin: '70% 40%',
  },
  bubble: {
    position: 'absolute',
    top: 20, right: 16,
    background: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: 14,
    padding: '10px 14px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    fontSize: 13,
    minWidth: 150,
  },

  // Gold band
  goldBand: {
    background: 'linear-gradient(180deg, #1B2B4B 0%, #243a66 100%)',
    color: 'white',
    padding: '16px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
  },
  goldBandLeft: {
    display: 'flex', alignItems: 'center', gap: 14,
    fontSize: 17, fontWeight: 600, flex: '1 1 320px',
  },
  goldBandMid: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'white', color: '#1B2B4B',
    padding: '10px 16px', borderRadius: 12,
  },
  goldBandCta: {
    background: '#F59E0B',
    color: 'white',
    fontWeight: 800,
    fontSize: 16,
    padding: '14px 26px',
    borderRadius: 14,
    textDecoration: 'none',
    boxShadow: '0 8px 24px rgba(245,158,11,0.4)',
    whiteSpace: 'nowrap',
  },

  // Trust pills row
  pills: {
    marginTop: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    background: 'white',
    borderRadius: 20,
    padding: '18px 24px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 8px 24px rgba(27,43,75,0.06)',
  },
  pill: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  pillIcon: {
    width: 40, height: 40, borderRadius: 10,
    background: '#EFF6FF', color: '#2563EB',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  },
  pillTitle: { fontWeight: 800, color: '#1B2B4B', fontSize: 14, marginBottom: 2 },
  pillDesc: { color: '#64748B', fontSize: 12, lineHeight: 1.4 },

  // Working form card
  formCard: {
    marginTop: 16,
    background: '#1B2B4B',
    color: 'white',
    borderRadius: 24,
    padding: '24px 32px 28px',
    border: '2px solid #C49A1A',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  },
  formEyebrow: {
    margin: 0, color: '#C49A1A',
    fontSize: 12, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '2px',
  },
  formTitle: { fontSize: 22, fontWeight: 800, margin: '4px 0 6px', letterSpacing: '-0.5px' },
  formSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.5, margin: '0 0 14px' },
  formRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  input: {
    flex: '1 1 240px', minWidth: 0,
    background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.18)',
    borderRadius: 12, padding: '14px 16px',
    color: 'white', fontSize: 15, outline: 'none',
    fontFamily: 'inherit',
  },
  cta: {
    background: '#F59E0B', color: 'white',
    border: 'none', borderRadius: 12,
    padding: '14px 24px', fontWeight: 800, fontSize: 15,
    cursor: 'pointer', whiteSpace: 'nowrap',
    boxShadow: '0 8px 24px rgba(245,158,11,0.4)',
    fontFamily: 'inherit',
  },
  errorText: { color: '#FCA5A5', fontSize: 13, margin: '10px 0 0' },
  privacy: { color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '14px 0 0' },
  successWrap: { textAlign: 'center', padding: '8px 0' },
  successIcon: { fontSize: 48, marginBottom: 8 },

  footer: {
    marginTop: 20,
    textAlign: 'center',
    padding: '16px 0 0',
  },
  footerBrand: { color: '#1B2B4B', fontWeight: 800, fontSize: 16, margin: '0 0 6px' },
  footerLine: { color: '#64748B', fontSize: 12, margin: 0 },
}
