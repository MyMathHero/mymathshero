'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

// Premium 3D Hero mascot — client-only (WebGL), 2D image shown until it loads.
const Hero3D = dynamic(() => import('@/components/Hero3D'), { ssr: false })
import MathCountdownBar from '@/components/MathCountdownBar'
import { LAUNCH_DATE_DISPLAY } from '@/lib/launchDate'
import { Analytics } from '@/lib/analytics'
import { useScrollProgress, range, lerp } from './useScrollScene'
import Reveal from './Reveal'
import ScrubReveal from '@/components/scroll/ScrubReveal'
import WordSwap from '@/components/scroll/WordSwap'
import HorizontalReel from '@/components/scroll/HorizontalReel'
import { FAQS, PILLARS, FAMILY_TRUST, TESTIMONIALS, OFFER_POINTS, FLOAT_SYMBOLS } from './comingSoonData'
import { SOCIAL_LINKS } from '@/lib/social'

// Inline brand glyphs — this page is deliberately self-contained (no icon
// library) to keep its bundle tiny. Keyed by the names in lib/social.js.
const SOCIAL_PATHS = {
  Facebook: 'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z',
  Instagram: 'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm6.3-8.3a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0z',
  TikTok: 'M16.5 3c.3 2.1 1.6 3.8 3.7 4.1v2.6c-1.2 0-2.4-.4-3.5-1v6.6a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v2.7a3.2 3.2 0 1 0 2.3 3V3h2.5z',
  YouTube: 'M23 12s0-3.2-.4-4.7c-.2-.8-.9-1.5-1.7-1.7C19.4 5.2 12 5.2 12 5.2s-7.4 0-8.9.4c-.8.2-1.5.9-1.7 1.7C1 8.8 1 12 1 12s0 3.2.4 4.7c.2.8.9 1.5 1.7 1.7 1.5.4 8.9.4 8.9.4s7.4 0 8.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.5.4-4.7.4-4.7zM9.7 15.3V8.7l5.7 3.3-5.7 3.3z',
}

const NAVY = '#1B2B4B', GOLD = '#C49A1A', CREAM = '#F4EFE3'

export default function ComingSoonPage() {
  const router = useRouter()
  // ── Waitlist form state (UNCHANGED contract: POST /api/waitlist) ──────────
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [childGrade, setChildGrade] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  useEffect(() => { setHydrated(true) }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email'); return }
    if (!firstName.trim()) { setError('Please enter your first name'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: email.trim().toLowerCase(),
          childGrade,
        }),
      })
      const data = await res.json().catch(() => ({}))
      Analytics.waitlistJoined(childGrade || null)
      // Off to the dedicated thank-you page. Pass the waitlist position + first
      // name so it can personalise + show their spot. (submitted flag kept so the
      // button shows "Reserving…" until the route change completes.)
      const params = new URLSearchParams()
      if (data?.position) params.set('pos', String(data.position))
      if (firstName.trim()) params.set('name', firstName.trim())
      setSubmitted(true)
      router.push(`/thankyou${params.toString() ? `?${params}` : ''}`)
    } catch {
      // Network error — still send them to a friendly thank-you rather than a
      // dead end (their email may well have been captured).
      Analytics.waitlistJoined(childGrade || null)
      setSubmitted(true)
      router.push('/thankyou')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Cinematic pinned hero (Apple-Vision-Pro style two-act scroll) ─────────
  // The hero PINS and TRANSFORMS through its scroll runway, so the tall section
  // reads as intentional motion, not empty space:
  //   Act 1 (hp 0→0.45): the hero at rest (logo + headline + robot + pillars).
  //   Act 2 (hp 0.45→1): text fades, the robot scales up + centres, and a short
  //                      cinematic tagline crossfades in.
  // Content is fully visible at rest (hp=0) via a one-time `entered` flag.
  const [heroRef, hp] = useScrollProgress()
  const [entered, setEntered] = useState(false)
  // On phones the cinematic pin/zoom is disabled — a clean stacked hero reads far
  // better and avoids the tall pinned section breaking on small screens.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60)
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 900)
    check(); window.addEventListener('resize', check)

    // Subtle hero-image parallax: the photo drifts up ~half scroll speed, giving
    // depth as you scroll off the hero. Pure CSS var + rAF, no library. Disabled
    // for reduced-motion and on phones (where the hero isn't full-bleed).
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (reduce || window.innerWidth <= 820) { document.documentElement.style.setProperty('--cs-hero-par', '0px'); return }
        const y = Math.min(window.scrollY, window.innerHeight)
        document.documentElement.style.setProperty('--cs-hero-par', `${(y * -0.12).toFixed(1)}px`)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(t); window.removeEventListener('resize', check)
      window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf)
    }
  }, [])


  return (
    // overflow-x: clip (NOT hidden) — clip contains the drifting symbols without
    // creating a scroll container, which would break position: sticky pinning.
    <div style={{ background: CREAM, color: NAVY, fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif", overflowX: 'clip' }}>
      <GlobalCss />
      <MathCountdownBar />

      {/* ══════════════ SCENE 1 — FULL-BLEED PHOTO HERO ══════════════ */}
      {/* The scene photo fills the hero left→right as a background; the headline,
          logo and CTA sit in the empty LEFT area of the photo, in front of it.
          A left-weighted scrim keeps the text readable over the image. */}
      <section ref={heroRef} className="cs-hero2">
        <img src="/assets/comingsoonnew.JPG" alt="Hero, the MyMathsHero AI maths tutor, helping two children with maths at home"
          className="cs-hero2-bg" draggable={false} />
        <div className="cs-hero2-scrim" aria-hidden />

        <div className="cs-hero2-inner">
         <div className="cs-hero2-card" style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'none' : 'translateY(24px)',
          transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
         }}>
          {/* Brand logo + wordmark */}
          <div className="cs-hero-logo" style={{ position: 'static', marginBottom: 22 }}>
            <img src="/assets/logos/logo-icon.png?v=2" alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
            <div>
              <div className="cs-hero-logo-word"><span style={{ color: NAVY }}>MyMaths</span><span style={{ color: GOLD }}>Hero</span></div>
              <div className="cs-hero-logo-tag">PERSONALISED MATHS LEARNING</div>
            </div>
          </div>

          <div className="cs-eyebrow">
            <span style={{ width: 8, height: 8, borderRadius: 99, background: GOLD }} />
            Australia's AI maths tutor · Launching {LAUNCH_DATE_DISPLAY}
          </div>
          <h1 className="cs-h1">
            Confidence starts<br />
            when <span style={{ color: '#2563EB' }}>maths</span><br />
            makes <span style={{ color: GOLD }}>sense.</span>
          </h1>
          <p className="cs-hero-sub">
            MyMathsHero is Australia's AI maths tutor for primary school children Prep to Year 6 — personalised learning that helps your child{' '}
            <b style={{ color: '#2563EB' }}>understand</b>, <b style={{ color: '#16A34A' }}>improve</b> and <b style={{ color: GOLD }}>thrive</b>.
          </p>
          <div className="cs-hero-cta-row">
            <a href="#waitlist" className="cs-btn-gold">Join the Waitlist →</a>
            <a href="#meet-hero" className="cs-btn-ghost">See how it works</a>
          </div>
          <div className="cs-hero2-badge">
            <span>👨‍👩‍👧</span> First 1,000 families: <b style={{ color: GOLD }}>one month FREE</b> + founding pricing.
          </div>
         </div>
        </div>
      </section>

      {/* Everything below the hero sits on a solid CREAM slab. (The old -100vh
          pull-up compensated for the previous 190vh pinned hero; the new hero is
          normal height, so no pull-up.) */}
      <div style={{ position: 'relative', zIndex: 3, background: CREAM, paddingTop: 20 }}>

      {/* The old 4-pillar card row now lives in the horizontal reel below. */}

      {/* ══════════════ WORD-SWAP MOMENT ══════════════ */}
      {/* One compact pinned beat between the hero and Meet Hero — the key word
          cycles as you scroll, then releases fast. Collapses to a static line on
          phones / reduced-motion. */}
      <WordSwap
        eyebrow="Why families choose Hero"
        headingClassName="cs-ws-heading"
        prefix={<>Hero helps every child<br /></>}
        words={[
          { text: 'understand.', color: '#2563EB' },
          { text: 'improve.', color: GOLD },
          { text: 'thrive.', color: '#16A34A' },
        ]}
      />

      {/* ══════════════ SCENE 2 — MEET HERO + DASHBOARD ══════════════ */}
      <section id="meet-hero" className="cs-section">
        <div className="cs-wrap cs-meet">
          <Reveal from="right" style={{ minWidth: 0 }}>
            <span className="cs-tag">Meet Hero</span>
            <ScrubReveal as="h2" className="cs-h2">Your child's <span style={{ color: '#2563EB' }}>AI maths partner</span></ScrubReveal>
            <p className="cs-p">
              Hero gets to know your child, creates personalised maths tasks and provides step-by-step guidance whenever they need help — building understanding, not memorisation.
            </p>
            <ul className="cs-check-list">
              {['Personalised daily learning tasks', 'Step-by-step hints when stuck', 'Adaptive difficulty that grows with your child', 'Progress reports parents can understand'].map((t, i) => (
                <li key={i}><span className="cs-check">✓</span>{t}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal from="left" delay={0.1} style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="cs-meet-hero-3d">
              <Hero3D height={440} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════ WHY HERO (horizontal reel) ══════════════ */}
      {/* Vertical scroll drives the pillar cards sideways; collapses to a stack on
          phones / reduced-motion. Data from PILLARS (this replaces the old static
          4-pillar row up top). No heading — the moving cards carry the section. */}
      <HorizontalReel
        items={PILLARS.map((p, i) => ({
          n: null,
          art: ['target', 'book', 'chat', 'star'][i],
          title: p.title,
          desc: p.desc,
          color: p.fg,
        }))}
      />

      {/* ══════════════ DESIGNED FOR AUSTRALIAN FAMILIES ══════════════ */}
      <section className="cs-section">
        <div className="cs-wrap">
          <Reveal>
            <div className="cs-family">
              <div className="cs-family-head">
                Designed for<br /><span style={{ color: GOLD, borderBottom: `3px solid ${GOLD}`, paddingBottom: 2 }}>Australian Families</span>
              </div>
              <div className="cs-family-items">
                {FAMILY_TRUST.map((f, i) => (
                  <div key={i} className="cs-family-item">
                    <span className="cs-family-emoji">{f.emoji}</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section className="cs-section cs-band">
        <div className="cs-wrap">
          <Reveal><h2 className="cs-h2 cs-center">Trusted by Australian families <span className="cs-beta">(Beta Testing)</span></h2></Reveal>
          <div className="cs-testimonials">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 0.1} from="up">
                <div className="cs-testimonial">
                  <div className="cs-stars">{'★★★★★'}</div>
                  <p className="cs-quote">“{t.quote}”</p>
                  <div className="cs-author">
                    <span className="cs-avatar" style={{ background: t.avatarBg }}>{t.initials}</span>
                    <span>{t.author}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FOUNDING FAMILY + WAITLIST FORM ══════════════ */}
      <section id="waitlist" className="cs-section">
        <div className="cs-wrap">
          <div className="cs-offer">
            {/* Hero peeks over the top of the form card — decorative, floats gently. */}
            <img src="/assets/robot/Heropeekingfromdown.png" alt="" className="cs-offer-hero" aria-hidden draggable={false} />

            {/* Left — the offer */}
            <Reveal from="right">
              <div className="cs-gift-wrap" aria-hidden>
                <div className="cs-gift-glow" />
                <div className="cs-gift-big">🎁</div>
              </div>
              <ScrubReveal as="h2" className="cs-h2" style={{ color: '#2563EB' }}>Become a Founding Family</ScrubReveal>
              <p className="cs-p">Join the first 1,000 Australian families and receive:</p>
              <ul className="cs-check-list">
                {OFFER_POINTS.map((o, i) => <li key={i}><span className="cs-check">✓</span>{o}</li>)}
              </ul>
              <div className="cs-save-badge">🎉 $60 off for the year!</div>
            </Reveal>

            {/* Right — the working form (preserved contract) */}
            <Reveal from="left" delay={0.08}>
              <div className="cs-form-card">
                {!submitted ? (
                  <>
                    <h3 className="cs-form-title">Join the Waitlist</h3>
                    <p className="cs-form-sub">Secure your founding member benefits.</p>
                    <form onSubmit={handleSubmit} className="cs-form" noValidate>
                      <div className="cs-name-row">
                        <input type="text" placeholder="Parent's First Name" autoComplete="given-name"
                          value={firstName} onChange={e => { setFirstName(e.target.value); setError('') }}
                          aria-label="First name" required className="cs-input" disabled={submitting} />
                        <input type="text" placeholder="Last Name" autoComplete="family-name"
                          value={lastName} onChange={e => setLastName(e.target.value)}
                          aria-label="Last name" className="cs-input" disabled={submitting} />
                      </div>
                      <input type="email" inputMode="email" autoComplete="email" placeholder="Email Address"
                        value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                        aria-label="Email address" required className="cs-input" disabled={submitting} />
                      <select value={childGrade} onChange={e => setChildGrade(e.target.value)}
                        aria-label="Child's year level" className="cs-input cs-select"
                        style={{ color: childGrade ? NAVY : '#94A3B8' }} disabled={submitting}>
                        <option value="" disabled>Select Year Level</option>
                        <option value="prep">Prep</option>
                        <option value="1">Year 1</option>
                        <option value="2">Year 2</option>
                        <option value="3">Year 3</option>
                        <option value="4">Year 4</option>
                        <option value="5">Year 5</option>
                        <option value="6">Year 6</option>
                      </select>
                      <button type="submit" disabled={submitting || !email || !firstName}
                        className="cs-submit" style={{ opacity: submitting ? 0.7 : 1 }}>
                        {submitting ? 'Reserving…' : 'Yes! Reserve My Spot →'}
                      </button>
                    </form>
                    {error && <p className="cs-err">{error}</p>}
                    <p className="cs-fineprint">🔒 We'll send occasional launch updates, early information and helpful maths tips. Unsubscribe anytime.</p>
                  </>
                ) : (
                  // Brief state while we navigate to /thankyou.
                  <div style={{ textAlign: 'center', padding: '18px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
                    <h3 className="cs-form-title">Reserving your spot…</h3>
                    <p className="cs-form-sub">Taking you to your confirmation.</p>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════ FAQ ══════════════ */}
      <section className="cs-section cs-band">
        <div className="cs-wrap" style={{ maxWidth: 860 }}>
          <Reveal><h2 className="cs-h2 cs-center">Frequently Asked Questions</h2></Reveal>
          <div className="cs-faq-list">
            {FAQS.map((f, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="cs-faq-item">
                  <button className="cs-faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>
                    <span>{f.q}</span>
                    <span className="cs-faq-chev" style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>⌄</span>
                  </button>
                  {openFaq === i && <div className="cs-faq-a">{f.a}</div>}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FINAL CTA — ready to help your child? ══════════════ */}
      <section className="cs-section">
        <div className="cs-wrap">
          <Reveal>
            <div className="cs-final-cta">
              <img src="/assets/robot/Heropeekingfromdown.png" alt="" className="cs-final-peek" aria-hidden draggable={false} />
              <h2 className="cs-h2 cs-center" style={{ color: 'white' }}>Ready to help your child enjoy maths?</h2>
              <p className="cs-p cs-center" style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 560, margin: '0 auto 22px' }}>
                Join Australia's first 1,000 Founding Families and receive:
              </p>
              <div className="cs-final-perks">
                <div className="cs-final-perk"><span>🎁</span> One month FREE</div>
                <div className="cs-final-perk"><span>💰</span> Exclusive first-year pricing</div>
                <div className="cs-final-perk"><span>🚀</span> Early access</div>
              </div>
              <a href="#waitlist" className="cs-btn-gold" style={{ marginTop: 26 }}>Join the Waitlist →</a>
            </div>
          </Reveal>
        </div>
      </section>

      </div>{/* end cream slab wrapper */}

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="cs-footer">
        <div className="cs-footer-brand">
          <img src="/assets/logos/logo-icon.png?v=2" alt="" style={{ width: 34, height: 34 }} />
          <div>
            <div style={{ fontWeight: 800 }}>MyMaths<span style={{ color: GOLD }}>Hero</span></div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>AI maths tutoring that builds confidence for life.</div>
          </div>
        </div>
        <div className="cs-footer-social">
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginRight: 4 }}>Follow us</span>
          {SOCIAL_LINKS.map(({ name, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`MyMathsHero on ${name}`}
              className="cs-social-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={SOCIAL_PATHS[name]} />
              </svg>
            </a>
          ))}
        </div>
        <div className="cs-footer-mid">Australia 🇦🇺</div>
        <div className="cs-footer-copy">© {hydrated ? new Date().getFullYear() : 2026} MyMathsHero · mymathshero.com.au</div>
      </footer>
    </div>
  )
}

// ── Scoped styles (media queries + keyframes the inline approach can't do) ───
// Rendered via dangerouslySetInnerHTML so React treats the CSS as opaque and
// never tries to reconcile it char-by-char (which caused a hydration warning).
function GlobalCss() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />
}

const CSS = `
      .cs-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
      .cs-section { padding: 96px 0; }
      .cs-band { background: white; }
      .cs-center { text-align: center; }
      .cs-h1 { font-size: clamp(40px, 6vw, 76px); font-weight: 900; line-height: 1.02; letter-spacing: -2px; margin: 14px 0 20px; color: ${NAVY}; }
      .cs-h2 { font-size: clamp(28px, 3.6vw, 44px); font-weight: 900; letter-spacing: -1px; margin: 0 0 16px; color: ${NAVY}; }
      .cs-ws-heading { font-size: clamp(30px, 5.4vw, 66px); font-weight: 900; letter-spacing: -0.03em; line-height: 1.08; color: ${NAVY}; }
      .cs-p { font-size: 17px; line-height: 1.6; color: #475569; margin: 0 0 20px; }
      .cs-tag { display: inline-block; background: rgba(37,99,235,0.1); color: #2563EB; font-weight: 800; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 14px; border-radius: 99px; margin-bottom: 14px; }

      /* Full-bleed photo hero — image fills left→right; a frosted glass card of
         copy is PINNED to the left, so on ultrawide the content hugs the edge
         instead of floating in a centred column. */
      .cs-hero2 { position: relative; min-height: 100vh; display: flex; align-items: center; overflow: hidden; }
      .cs-hero2-bg { position: absolute; inset: 0; width: 100%; height: 108%; object-fit: cover; object-position: 74% center; z-index: 0;
        will-change: transform; transform: translateY(var(--cs-hero-par, 0px)); }
      /* Left-weighted scrim: heavy near the card, clears well before the photo's
         right side so the robot + kids stay bright at any width. */
      .cs-hero2-scrim { position: absolute; inset: 0; z-index: 1; background:
        linear-gradient(90deg, rgba(244,239,227,0.98) 0%, rgba(244,239,227,0.9) 30%, rgba(244,239,227,0.4) 48%, rgba(244,239,227,0) 64%); }
      /* Pin the content LEFT with page-consistent gutters (not auto-centred). */
      .cs-hero2-inner { position: relative; z-index: 2; width: 100%;
        padding-inline: clamp(24px, 5vw, 96px); display: flex; justify-content: flex-start; }
      .cs-hero2-card { width: 100%; max-width: 540px;
        background: rgba(255,255,255,0.55);
        -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
        border: 1px solid rgba(255,255,255,0.7); border-radius: 28px;
        padding: 34px 36px 30px; box-shadow: 0 30px 80px rgba(27,43,75,0.16); }
      .cs-hero2-card > * { max-width: 100%; }
      .cs-hero2-badge { display: inline-flex; align-items: center; gap: 8px; margin-top: 22px; background: ${NAVY}; color: white; font-size: 13.5px; font-weight: 700; padding: 10px 16px; border-radius: 12px; box-shadow: 0 10px 30px rgba(27,43,75,0.25); }
      @media (max-width: 820px) {
        .cs-hero2 { min-height: auto; }
        .cs-hero2-bg { height: 100%; object-position: 68% center; transform: none; }
        .cs-hero2-scrim { background: linear-gradient(180deg, rgba(244,239,227,0.96) 0%, rgba(244,239,227,0.9) 46%, rgba(244,239,227,0.55) 72%, rgba(244,239,227,0.15) 100%); }
        .cs-hero2-inner { padding: 108px 20px 150px; justify-content: center; }
        .cs-hero2-card { max-width: 520px; background: rgba(255,255,255,0.42); padding: 26px 24px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .cs-hero2-bg { transform: none !important; }
      }

      /* Hero (legacy classes still used by the logo/eyebrow/h1/sub/cta) */
      .cs-aura { position: absolute; width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.10), rgba(196,154,26,0.06) 40%, transparent 68%); filter: blur(10px); }
      .cs-hero-logo { position: absolute; top: 32px; left: max(32px, calc((100vw - 1180px) / 2 + 32px)); display: flex; align-items: center; gap: 12px; z-index: 4; }
      .cs-hero-logo-word { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
      .cs-hero-logo-tag { font-size: 9.5px; font-weight: 700; color: #64748B; letter-spacing: 2px; margin-top: 4px; }
      /* Tagline sits in the CLEAR upper band so it never collides with the
         centred, zoomed robot below it. */
      .cs-hero-act2 { position: absolute; z-index: 5; text-align: center; top: 12vh; left: 0; right: 0; }
      .cs-act2-eyebrow { color: #2563EB; font-weight: 800; font-size: 14px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px; }
      .cs-act2-title { font-size: clamp(36px, 5.5vw, 66px); font-weight: 900; letter-spacing: -2px; line-height: 1.05; color: ${NAVY}; text-shadow: 0 2px 30px rgba(244,239,227,0.9); }
      .cs-hero-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 40px; align-items: center; max-width: 1180px; padding: 0 32px; width: 100%; }
      .cs-eyebrow { display: inline-flex; align-items: center; gap: 8px; background: white; border: 1px solid #E7ECF3; box-shadow: 0 4px 14px rgba(27,43,75,0.06); color: #475569; font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 99px; }
      .cs-hero-sub { font-size: 18px; line-height: 1.6; color: #475569; max-width: 520px; margin: 0 0 28px; }
      .cs-hero-cta-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
      .cs-hero-robot { width: min(560px, 52vw); height: auto; display: block; filter: drop-shadow(0 30px 60px rgba(27,43,75,0.28)); animation: csFloat 5s ease-in-out infinite; }
      /* Badge tucked UNDER the robot (not over the kids' faces). */
      .cs-hero-badge { position: absolute; right: 50%; transform: translateX(50%); bottom: -58px; background: #2563EB; color: white; border-radius: 16px; padding: 12px 20px; max-width: 360px; width: max-content; text-align: center; box-shadow: 0 18px 40px rgba(37,99,235,0.4); z-index: 3; }
      .cs-scrollcue { display: flex; align-items: center; gap: 10px; margin-top: 34px; color: #94A3B8; font-size: 13px; font-weight: 600; }
      .cs-scrollcue-dot { width: 22px; height: 34px; border: 2px solid #CBD5E1; border-radius: 99px; position: relative; }
      .cs-scrollcue-dot::after { content: ''; position: absolute; left: 50%; top: 7px; transform: translateX(-50%); width: 4px; height: 6px; border-radius: 99px; background: ${GOLD}; animation: csCue 1.5s ease-in-out infinite; }

      .cs-btn-gold { background: linear-gradient(135deg, ${GOLD}, #FFD700); color: ${NAVY}; font-weight: 800; font-size: 16px; padding: 15px 30px; border-radius: 14px; text-decoration: none; box-shadow: 0 10px 26px rgba(245,158,11,0.4); transition: transform .15s ease, box-shadow .2s ease; display: inline-block; }
      .cs-btn-gold:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(245,158,11,0.5); }
      .cs-btn-ghost { color: ${NAVY}; font-weight: 700; font-size: 15px; text-decoration: none; padding: 15px 8px; border-bottom: 2px solid transparent; }
      .cs-btn-ghost:hover { border-bottom-color: ${GOLD}; }

      /* Pillars */
      .cs-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
      .cs-pillar { background: white; border: 1px solid #E7ECF3; border-radius: 20px; padding: 24px 20px; box-shadow: 0 10px 30px rgba(27,43,75,0.06); height: 100%; transition: transform .2s ease, box-shadow .2s ease; }
      .cs-pillar:hover { transform: translateY(-4px); box-shadow: 0 18px 44px rgba(27,43,75,0.12); }
      .cs-pillar-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 14px; }
      .cs-pillar-title { font-weight: 800; font-size: 16px; color: ${NAVY}; margin-bottom: 6px; }
      .cs-pillar-desc { font-size: 13.5px; color: #64748B; line-height: 1.5; }

      /* Meet Hero */
      .cs-meet { display: grid; grid-template-columns: 1fr 1.15fr; gap: 48px; align-items: center; }
      .cs-check-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
      .cs-check-list li { display: flex; align-items: flex-start; gap: 12px; color: ${NAVY}; font-weight: 600; font-size: 15.5px; }
      .cs-check { flex-shrink: 0; width: 22px; height: 22px; border-radius: 99px; background: #ECFDF5; color: #16A34A; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; }

      /* Steps */
      .cs-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; position: relative; }
      .cs-step { background: white; border: 1px solid #E7ECF3; border-radius: 22px; padding: 32px 24px; text-align: center; height: 100%; box-shadow: 0 10px 30px rgba(27,43,75,0.06); }
      .cs-step-num { width: 34px; height: 34px; border-radius: 99px; color: white; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
      .cs-step-icon { font-size: 40px; margin-bottom: 10px; }
      .cs-step-title { font-weight: 800; font-size: 18px; color: ${NAVY}; margin-bottom: 8px; }
      .cs-step-desc { font-size: 14px; color: #64748B; line-height: 1.55; }
      .cs-step-arrow { display: none; }

      /* Australian families */
      .cs-family { background: white; border: 1px solid #E7ECF3; border-radius: 24px; padding: 32px 36px; display: grid; grid-template-columns: auto 1fr; gap: 40px; align-items: center; box-shadow: 0 12px 34px rgba(27,43,75,0.07); }
      .cs-family-head { font-size: 24px; font-weight: 900; color: ${NAVY}; line-height: 1.2; white-space: nowrap; }
      .cs-family-items { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
      .cs-family-item { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; font-size: 13px; font-weight: 700; color: #475569; }
      .cs-family-emoji { font-size: 26px; }

      /* Testimonials */
      .cs-beta { color: #2563EB; font-size: 0.55em; font-weight: 800; vertical-align: middle; }
      .cs-testimonials { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; }
      .cs-testimonial { background: white; border: 1px solid #E7ECF3; border-radius: 20px; padding: 26px; box-shadow: 0 10px 30px rgba(27,43,75,0.06); height: 100%; }
      .cs-stars { color: ${GOLD}; letter-spacing: 2px; margin-bottom: 12px; }
      .cs-quote { font-size: 15px; line-height: 1.6; color: ${NAVY}; margin: 0 0 18px; font-weight: 500; }
      .cs-author { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: #64748B; }
      .cs-avatar { width: 40px; height: 40px; border-radius: 99px; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; }

      /* Offer + form */
      .cs-offer { position: relative; overflow: visible; background: linear-gradient(135deg, #EFF4FF, #FFF8E8); border: 1px solid #E7ECF3; border-radius: 28px; padding: 44px; display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: center; box-shadow: 0 20px 60px rgba(27,43,75,0.10); }
      .cs-gift { font-size: 52px; margin-bottom: 8px; }
      .cs-save-badge { display: inline-block; margin-top: 18px; background: linear-gradient(135deg, ${GOLD}, #FFD700); color: ${NAVY}; font-weight: 900; font-size: 15px; padding: 12px 22px; border-radius: 99px; box-shadow: 0 10px 24px rgba(245,158,11,0.35); }

      /* Big animated gift — gentle idle float + tilt, soft glow behind it. */
      .cs-gift-wrap { position: relative; width: 120px; height: 120px; margin-bottom: 18px; }
      .cs-gift-glow { position: absolute; inset: -14px; border-radius: 50%; background: radial-gradient(circle, rgba(245,158,11,0.45), transparent 68%); filter: blur(6px); animation: csGlow 3.4s ease-in-out infinite; }
      .cs-gift-big { position: relative; width: 120px; height: 120px; border-radius: 30px; display: flex; align-items: center; justify-content: center; font-size: 64px; background: linear-gradient(135deg, ${GOLD}, #FFD700); box-shadow: 0 18px 40px rgba(245,158,11,0.45); animation: csGiftFloat 4s ease-in-out infinite; transform-origin: center bottom; }
      @keyframes csGiftFloat { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-12px) rotate(4deg); } }
      @keyframes csGlow { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.95; transform: scale(1.08); } }

      /* Hero peeking over the top-right of the offer card, near the form. Floats. */
      .cs-offer-hero { position: absolute; top: -78px; right: 46px; height: 168px; width: auto; z-index: 4; filter: drop-shadow(0 18px 30px rgba(27,43,75,0.28)); animation: csPeekFloat 4.6s ease-in-out infinite; pointer-events: none; }
      @keyframes csPeekFloat { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-9px) rotate(2deg); } }

      @media (prefers-reduced-motion: reduce) {
        .cs-gift-big, .cs-gift-glow, .cs-offer-hero { animation: none; }
      }

      /* Meet Hero image (replaces the old dashboard mock) */
      .cs-meet-hero-img { width: 100%; max-width: 380px; height: auto; filter: drop-shadow(0 24px 50px rgba(27,43,75,0.22)); }
      .cs-meet-hero-3d { width: 100%; max-width: 440px; filter: drop-shadow(0 24px 50px rgba(27,43,75,0.22)); }

      /* Centered eyebrow tag for the How-it-works heading */
      .cs-center-tag { display: block; width: fit-content; margin: 0 auto 14px; }
      .cs-how-h2 { font-size: clamp(32px, 4.2vw, 52px); }

      /* Final CTA block */
      .cs-final-cta { position: relative; background: linear-gradient(135deg, ${NAVY}, #2D4A7A); border-radius: 28px; padding: 90px 40px 44px; text-align: center; box-shadow: 0 24px 60px rgba(27,43,75,0.28); overflow: visible; }
      .cs-final-peek { position: absolute; top: -70px; left: 50%; transform: translateX(-50%); height: 150px; width: auto; filter: drop-shadow(0 16px 30px rgba(0,0,0,0.35)); }
      .cs-final-perks { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
      .cs-final-perk { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); color: white; font-weight: 700; font-size: 15px; padding: 10px 18px; border-radius: 14px; }
      .cs-final-perk span { font-size: 18px; }
      .cs-form-card { background: white; border-radius: 22px; padding: 30px; box-shadow: 0 20px 50px rgba(27,43,75,0.14); border: 1px solid #E7ECF3; }
      .cs-form-title { font-size: 22px; font-weight: 900; color: ${NAVY}; margin: 0 0 4px; }
      .cs-form-sub { font-size: 14px; color: #64748B; margin: 0 0 18px; }
      .cs-form { display: flex; flex-direction: column; gap: 12px; }
      .cs-name-row { display: flex; gap: 12px; }
      .cs-input { flex: 1; width: 100%; min-width: 0; background: #F7F9FC; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; color: ${NAVY}; font-size: 15px; outline: none; font-family: inherit; transition: border-color .15s ease, box-shadow .15s ease; }
      .cs-input:focus { border-color: ${GOLD}; box-shadow: 0 0 0 3px rgba(196,154,26,0.15); }
      .cs-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394A3B8' d='M6 8L0 0h12z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
      .cs-submit { margin-top: 4px; width: 100%; background: linear-gradient(135deg, ${GOLD}, #FFD700); color: ${NAVY}; border: none; border-radius: 12px; padding: 16px; font-weight: 900; font-size: 16px; cursor: pointer; box-shadow: 0 10px 26px rgba(245,158,11,0.4); font-family: inherit; transition: transform .15s ease; }
      .cs-submit:hover:not(:disabled) { transform: translateY(-1px); }
      .cs-err { color: #DC2626; font-size: 13px; margin: 10px 0 0; }
      .cs-fineprint { color: #94A3B8; font-size: 11.5px; margin: 14px 0 0; line-height: 1.5; }

      /* FAQ */
      .cs-faq-list { display: flex; flex-direction: column; gap: 12px; margin-top: 40px; }
      .cs-faq-item { background: white; border: 1px solid #E7ECF3; border-radius: 16px; overflow: hidden; }
      .cs-faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; background: none; border: none; text-align: left; padding: 18px 22px; font-size: 15.5px; font-weight: 700; color: ${NAVY}; cursor: pointer; font-family: inherit; }
      .cs-faq-chev { color: ${GOLD}; font-size: 20px; transition: transform .25s ease; flex-shrink: 0; }
      .cs-faq-a { padding: 0 22px 20px; color: #64748B; font-size: 14.5px; line-height: 1.6; animation: csFade .3s ease; }

      /* Footer */
      .cs-footer { background: ${NAVY}; color: white; padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
      .cs-footer-brand { display: flex; align-items: center; gap: 12px; }
      .cs-footer-mid { font-size: 14px; color: rgba(255,255,255,0.85); }
      .cs-footer-copy { font-size: 12px; color: rgba(255,255,255,0.5); }
      .cs-footer-social { display: flex; align-items: center; gap: 10px; }
      .cs-social-btn { width: 36px; height: 36px; border-radius: 9px; background: rgba(255,255,255,0.10); color: white; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease, transform 0.2s ease; }
      .cs-social-btn:hover { background: ${GOLD}; color: ${NAVY}; transform: translateY(-2px); }

      /* Keyframes */
      @keyframes csFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
      @keyframes csDrift { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(4deg); } }
      @keyframes csCue { 0%,100% { transform: translate(-50%, 0); opacity: 1; } 50% { transform: translate(-50%, 8px); opacity: 0.3; } }
      @keyframes csFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

      /* Responsive */
      @media (max-width: 900px) {
        /* Hide the decorative maths symbols — no room on phones, and they'd
           collide with the stacked content. */
        .cs-float-sym { display: none !important; }
        .cs-hero-logo { position: static; margin: 0 auto 8px; justify-content: center; }
        .cs-hero-logo-word { font-size: 22px; }
        .cs-hero-grid { grid-template-columns: 1fr; text-align: center; gap: 22px; padding: 0 20px; }
        .cs-hero-grid .cs-eyebrow { margin: 0 auto; }
        .cs-hero-sub { margin-left: auto; margin-right: auto; }
        .cs-hero-cta-row, .cs-scrollcue { justify-content: center; }
        /* Bigger robot on mobile, and give room under it for the badge. */
        .cs-hero-robot { width: min(360px, 82vw); margin: 0 auto; }
        .cs-hero-badge { position: static; transform: none; margin: 20px auto 0; max-width: 320px; }
        .cs-scrollcue { display: none; }
        .cs-pillars { grid-template-columns: 1fr 1fr; }
        .cs-meet { grid-template-columns: 1fr; gap: 32px; }
        .cs-steps { grid-template-columns: 1fr; }
        .cs-family { grid-template-columns: 1fr; gap: 24px; text-align: center; }
        .cs-family-head { white-space: normal; }
        .cs-family-items { grid-template-columns: 1fr 1fr; }
        .cs-testimonials { grid-template-columns: 1fr; }
        .cs-offer { grid-template-columns: 1fr; padding: 30px; }
        /* On mobile the peeking Hero moves up top-right, smaller, over the corner. */
        .cs-offer-hero { top: -54px; right: 10px; height: 108px; }
        .cs-meet-hero-img { max-width: 260px; }
        .cs-dash { grid-template-columns: 1fr !important; }
        .cs-section { padding: 64px 0; }
      }
      @media (max-width: 560px) {
        .cs-pillars, .cs-family-items { grid-template-columns: 1fr; }
        .cs-name-row { flex-direction: column; }
        .cs-footer { flex-direction: column; text-align: center; }
      }
    `
