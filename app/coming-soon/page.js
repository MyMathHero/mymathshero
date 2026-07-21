'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MathCountdownBar from '@/components/MathCountdownBar'
import { LAUNCH_DATE_DISPLAY } from '@/lib/launchDate'
import { Analytics } from '@/lib/analytics'
import { useScrollProgress, range, lerp } from './useScrollScene'
import Reveal from './Reveal'
import ScrubReveal from '@/components/scroll/ScrubReveal'
import ScrollVideo from '@/components/scroll/ScrollVideo'
import { FAQS, FAMILY_TRUST, TESTIMONIALS, OFFER_POINTS, FLOAT_SYMBOLS } from './comingSoonData'
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
      // Off to the dedicated thank-you page. The URL stays CLEAN (/thankyou with
      // no query string) — the personalisation is handed over in sessionStorage
      // instead, so no name/status is exposed in the URL, analytics, or if the
      // link is shared. (We also never pass the waitlist number — deliberate.)
      try {
        const founding = !!(data?.foundingFamily || (data?.position && Number(data.position) <= 1000))
        sessionStorage.setItem('mmh_ty', JSON.stringify({
          name: firstName.trim() || '',
          founding,
        }))
      } catch { /* storage blocked — the page just shows the generic version */ }
      setSubmitted(true)
      router.push('/thankyou')
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

      {/* ══════════════ MOBILE HERO (≤820px only) ══════════════ */}
      {/* Different structure for phones: a navy top band (logo + launch pill + CTA),
          then the FULL image as its own block (uncropped), a floating pill over
          its base, and all the text stacked below on white. Desktop hero above is
          hidden at this width. */}
      <section className="cs-mhero" aria-hidden={false}>
        <div className="cs-mhero-top">
          <div className="cs-mhero-brand">
            <img src="/assets/logos/logo-icon.png?v=2" alt="" className="cs-mhero-logoimg" />
            <div>
              <div className="cs-mhero-word"><span style={{ color: '#fff' }}>MyMaths</span><span style={{ color: GOLD }}>Hero</span></div>
              <div className="cs-mhero-tag">PERSONALISED MATHS LEARNING</div>
            </div>
          </div>
          <div className="cs-mhero-launch">
            <span>🚀</span> LAUNCHING <b style={{ color: GOLD }}>{LAUNCH_DATE_DISPLAY}</b>
          </div>
          <a href="#waitlist" className="cs-btn-gold cs-mhero-cta">Join the Waitlist →</a>
        </div>

        <div className="cs-mhero-imgwrap">
          <img src="/assets/comingsoonnew.JPG" alt="Hero, the MyMathsHero AI maths tutor, helping two children with maths at home"
            className="cs-mhero-img" draggable={false} />
          <div className="cs-mhero-eyebrow">
            <span style={{ width: 8, height: 8, borderRadius: 99, background: GOLD, flexShrink: 0 }} />
            <span>Australia's AI maths tutor<br />Launching <b style={{ color: '#2563EB' }}>{LAUNCH_DATE_DISPLAY}</b></span>
          </div>
        </div>

        <div className="cs-mhero-body">
          <h1 className="cs-mhero-h1">
            Confidence starts when <span style={{ color: '#2563EB' }}>maths</span> makes <span style={{ color: GOLD }}>sense.</span>
          </h1>
          <p className="cs-mhero-sub">
            MyMathsHero is Australia's AI maths tutor for primary school children Prep to Year 6 — personalised learning that helps your child{' '}
            <b style={{ color: '#2563EB' }}>understand</b>, <b style={{ color: '#16A34A' }}>improve</b> and <b style={{ color: GOLD }}>thrive</b>.
          </p>
          <a href="#waitlist" className="cs-btn-gold cs-mhero-cta2">Join the Waitlist →</a>
          <a href="#meet-hero" className="cs-mhero-see">See how it works ⌄</a>
        </div>
      </section>

      {/* Everything below the hero sits on a solid CREAM slab. (The old -100vh
          pull-up compensated for the previous 190vh pinned hero; the new hero is
          normal height, so no pull-up.) */}
      <div style={{ position: 'relative', zIndex: 3, background: CREAM, paddingTop: 20 }}>

      {/* ══════════════ MEET-HERO MARKETING VIDEO ══════════════ */}
      {/* Big animated title above a video that plays only when scrolled into view. */}
      <section className="cs-section cs-video-section">
        <div className="cs-wrap">
          <Reveal from="up">
            <h2 className="cs-video-title">
              Meet <span className="cs-video-title-hero">Hero</span>
            </h2>
          </Reveal>
          {/* VP9/Opus WebM (3.3 MB) with an H.264 MP4 fallback (2.0 MB) for
              Safari/iOS, which has patchy VP9 support. Browsers pick the first
              source they can play. */}
          <ScrollVideo
            src="/assets/robot/meetherovideo.webm"
            fallbackSrc="/assets/robot/meetherovideobackup.mp4"
            loop
          />
        </div>
      </section>

      {/* ══════════════ SCENE 2 — MEET HERO + DASHBOARD ══════════════ */}
      <section id="meet-hero" className="cs-section">
        <div className="cs-wrap cs-meet">
          <Reveal from="right" style={{ minWidth: 0 }}>
            <ScrubReveal as="h2" className="cs-h2">Your child's <span style={{ color: '#2563EB' }}>AI maths partner</span></ScrubReveal>
            <p className="cs-p">
              Hero gets to know your child, creates personalised maths tasks and provides step-by-step guidance whenever they need help — building understanding, not memorisation.
            </p>
            {/* The four things we sell — highlighted so they pop. */}
            <ul className="cs-sell-list">
              {[
                { t: 'Personalised daily learning tasks', d: 'Built around exactly what your child needs next.', c: '#2563EB' },
                { t: 'Step-by-step hints when stuck', d: 'Hero guides, never just gives the answer.', c: '#16A34A' },
                { t: 'Adaptive difficulty that grows with your child', d: 'Never too easy, never too hard.', c: GOLD },
                { t: 'Progress reports parents can understand', d: 'See exactly how your child is improving.', c: '#7C3AED' },
              ].map((item, i) => (
                <li key={i} className="cs-sell-item" style={{ '--sell-accent': item.c }}>
                  <span className="cs-sell-check">✓</span>
                  <div>
                    <div className="cs-sell-title">{item.t}</div>
                    <div className="cs-sell-desc">{item.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal from="left" delay={0.1} style={{ display: 'flex', justifyContent: 'center' }}>
            {/* Cropped + edge-feathered Hero artwork (transparent PNG) so it
                melts into the cream page instead of reading as a rectangle. */}
            <img
              src="/assets/robot/meethero-cut.png"
              alt="Hero, the MyMathsHero AI maths tutor, surrounded by floating maths symbols"
              className="cs-meet-hero-art"
              draggable={false}
            />
          </Reveal>
        </div>
      </section>

      {/* ══════════════ DESIGNED FOR AUSTRALIAN FAMILIES ══════════════ */}
      <section className="cs-section cs-family-section">
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
                    <span>
                      {f.label}
                      {f.sub && <span className="cs-family-sub">{f.sub}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Curriculum coverage line — sits under the trust row. */}
            <p className="cs-family-note">
              Aligned with every Australian state and territory curriculum
            </p>
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
        {/* Wider container than the rest of the page — this section carries three
            columns (offer / form / artwork) and reads cramped at 1120px. */}
        <div className="cs-wrap cs-wrap-wide">
          <div className="cs-offer">
            {/* Left — the offer card */}
            <Reveal from="right">
              <div className="cs-offer-card">
                <div className="cs-offer-pill">🏅 Founding Family</div>
                <h2 className="cs-offer-title">
                  Become One of Our First 1,000 Founding Families
                </h2>
                <p className="cs-offer-sub">
                  Join Australia’s next-generation AI maths platform before public
                  launch and receive exclusive founding benefits.
                </p>

                <div className="cs-perks">
                  {[
                    { icon: '🎁', label: '1 Month FREE' },
                    { icon: '💰', label: 'Exclusive First-Year Pricing' },
                    { icon: '🚀', label: 'Early Access Before Launch' },
                    { icon: '⭐', label: 'Behind-the-Scenes Updates' },
                  ].map((p) => (
                    <div key={p.label} className="cs-perk">
                      <span className="cs-perk-icon">{p.icon}</span>
                      <span className="cs-perk-label">{p.label}</span>
                    </div>
                  ))}
                </div>

                <a href="#waitlist-form" className="cs-offer-save">Reserve My Founding Family Spot</a>
                <ul className="cs-trust-list">
                  <li><span>🇦🇺</span> Australian Curriculum Aligned</li>
                  <li><span>🤖</span> AI Personalised Learning</li>
                  <li><span>🔒</span> Secure &amp; Child Safe</li>
                </ul>
              </div>
            </Reveal>

            {/* Right — the working form (preserved contract) */}
            <Reveal from="left" delay={0.08}>
              <div className="cs-form-card">
                {!submitted ? (
                  <>
                    <h3 className="cs-form-title" id="waitlist-form">Join the Waitlist</h3>
                    <p className="cs-form-sub">
                      It takes less than 30 seconds. No payment required.
                    </p>
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
                      {/* Scarcity cue, right where the decision happens. */}
                      <p className="cs-urgency">
                        ⭐ Only the first 1,000 families receive Founding Family pricing
                      </p>
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

            {/* Right — Hero + kids artwork (feathered PNG, blends into the card).
                Sits beside the form so it's never covered. */}
            <img
              src="/assets/banneradd-cut.png"
              alt=""
              className="cs-offer-art"
              aria-hidden
              draggable={false}
            />
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
              {/* Hero peeks up over the navy card. Transparent WebM when present,
                  else the PNG. */}
              <HeroPeek
                webm="/assets/robot/Heropeekingfromdownwallani.webm"
                png="/assets/robot/Heropeekingfromdown.png"
                className="cs-final-peek"
              />
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

// ── HeroPeek ─────────────────────────────────────────────────────────────────
// A decorative peeking Hero. Prefers a TRANSPARENT WebM (real cutout — no box,
// no background keying needed); if that file is missing or can't play, it falls
// back to the still PNG so the page always looks right. Drop the .webm in and it
// upgrades itself automatically. (Solid-background MP4s can't be cleanly keyed
// on a light page — transparency is the only clean route, hence WebM w/ alpha.)
function HeroPeek({ webm, png, className }) {
  const [useVideo, setUseVideo] = useState(true)
  return (
    <div className={className} aria-hidden>
      {useVideo ? (
        <video
          src={webm}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setUseVideo(false)}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      ) : (
        <img src={png} alt="" draggable={false} style={{ width: '100%', height: 'auto', display: 'block' }} />
      )}
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
      /* Wider variant for the 3-column waitlist section. */
      .cs-wrap-wide { max-width: 1340px; }
      .cs-section { padding: 96px 0; }
      .cs-band { background: white; }
      .cs-center { text-align: center; }
      .cs-h1 { font-size: clamp(40px, 6vw, 76px); font-weight: 900; line-height: 1.02; letter-spacing: -2px; margin: 14px 0 20px; color: ${NAVY}; }
      .cs-h2 { font-size: clamp(28px, 3.6vw, 44px); font-weight: 900; letter-spacing: -1px; margin: 0 0 16px; color: ${NAVY}; }
      /* Bigger "Meet Hero" eyebrow tag. */
      .cs-tag-lg { font-size: 15px; padding: 8px 20px; letter-spacing: 1.5px; margin-bottom: 18px; }

      /* Big "Meet Hero" title above the marketing video. Gradient "Hero" with a
         soft sheen sweep; the whole title gently rises in via its Reveal wrapper. */
      .cs-video-title { text-align: center; font-size: clamp(40px, 6vw, 76px); font-weight: 900;
        letter-spacing: -2px; line-height: 1.02; color: ${NAVY}; margin: 0 auto 26px; }
      /* Tighten the video ↔ Meet-Hero seam: these two sections read as one beat,
         so they don't need a full 96px gap on each side. */
      .cs-video-section { padding-top: 64px; padding-bottom: 40px; }
      #meet-hero { padding-top: 40px; padding-bottom: 40px; }
      .cs-video-title-hero { position: relative;
        background: linear-gradient(100deg, #2563EB 0%, ${GOLD} 55%, #2563EB 100%);
        background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
        animation: csHeroSheen 5s ease-in-out infinite; }
      @keyframes csHeroSheen { 0%,100% { background-position: 0% 0; } 50% { background-position: 100% 0; } }
      @media (prefers-reduced-motion: reduce) {
        .cs-video-title-hero { animation: none; background-position: 0 0; }
      }
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
      @media (prefers-reduced-motion: reduce) {
        .cs-hero2-bg { transform: none !important; }
      }

      /* ── Mobile hero (≤820px) — a different structure to the desktop hero:
         navy top band, then the FULL image as a block, floating pill, text below.
         Hidden on desktop; the desktop hero is hidden at ≤820px. ── */
      .cs-mhero { display: none; }
      @media (max-width: 820px) {
        .cs-hero2 { display: none; }               /* hide the desktop full-bleed hero */
        .cs-countbar { display: none !important; }  /* override inline display:flex; the mobile navy band replaces the top strip */
        .cs-mhero { display: block; background: #fff; }

        .cs-mhero-top { background: ${NAVY}; padding: 20px 20px 26px; }
        .cs-mhero-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .cs-mhero-logoimg { width: 46px; height: 46px; object-fit: contain; flex-shrink: 0; }
        .cs-mhero-word { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
        .cs-mhero-tag { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.55); letter-spacing: 2px; margin-top: 4px; }
        .cs-mhero-launch { display: flex; align-items: center; justify-content: center; gap: 8px;
          border: 1px solid rgba(255,255,255,0.18); border-radius: 99px; padding: 12px 18px; margin: 0 auto 18px;
          width: fit-content; max-width: 100%; color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 700;
          letter-spacing: 1.5px; }
        .cs-mhero-cta { display: block; text-align: center; width: 100%; }

        .cs-mhero-imgwrap { position: relative; }
        .cs-mhero-img { display: block; width: 100%; height: auto; }
        .cs-mhero-eyebrow { position: absolute; left: 20px; right: 20px; bottom: -26px; z-index: 2;
          display: inline-flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #E7ECF3;
          box-shadow: 0 10px 30px rgba(27,43,75,0.14); border-radius: 18px; padding: 14px 20px;
          color: ${NAVY}; font-size: 15px; font-weight: 700; line-height: 1.35; width: fit-content; max-width: calc(100% - 40px); }

        .cs-mhero-body { padding: 46px 22px 30px; }
        .cs-mhero-h1 { font-size: clamp(38px, 12vw, 54px); font-weight: 900; line-height: 1.04; letter-spacing: -1.5px; color: ${NAVY}; margin: 0 0 18px; }
        .cs-mhero-sub { font-size: 17px; line-height: 1.6; color: #475569; margin: 0 0 26px; }
        .cs-mhero-cta2 { display: block; text-align: center; width: 100%; margin-bottom: 16px; }
        .cs-mhero-see { display: block; text-align: center; color: ${NAVY}; font-weight: 700; font-size: 15px; text-decoration: none; }
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

      /* Meet Hero — the four selling points, highlighted so they POP. Each is a
         card with a coloured accent bar + tinted check; lifts on hover. */
      .cs-sell-list { list-style: none; padding: 0; margin: 6px 0 0; display: flex; flex-direction: column; gap: 12px; }
      .cs-sell-item { position: relative; display: flex; align-items: flex-start; gap: 14px;
        background: #fff; border: 1px solid #E7ECF3; border-left: 4px solid var(--sell-accent);
        border-radius: 14px; padding: 14px 18px; box-shadow: 0 8px 22px rgba(27,43,75,0.07);
        transition: transform .2s ease, box-shadow .2s ease; }
      .cs-sell-item:hover { transform: translateX(4px); box-shadow: 0 14px 34px rgba(27,43,75,0.13); }
      .cs-sell-check { flex-shrink: 0; width: 26px; height: 26px; border-radius: 99px;
        background: color-mix(in srgb, var(--sell-accent) 15%, white); color: var(--sell-accent);
        display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; margin-top: 1px; }
      .cs-sell-title { font-weight: 800; font-size: 16px; color: ${NAVY}; line-height: 1.25; }
      .cs-sell-desc { font-size: 13.5px; color: #64748B; line-height: 1.45; margin-top: 3px; }

      /* Steps */
      .cs-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; position: relative; }
      .cs-step { background: white; border: 1px solid #E7ECF3; border-radius: 22px; padding: 32px 24px; text-align: center; height: 100%; box-shadow: 0 10px 30px rgba(27,43,75,0.06); }
      .cs-step-num { width: 34px; height: 34px; border-radius: 99px; color: white; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
      .cs-step-icon { font-size: 40px; margin-bottom: 10px; }
      .cs-step-title { font-weight: 800; font-size: 18px; color: ${NAVY}; margin-bottom: 8px; }
      .cs-step-desc { font-size: 14px; color: #64748B; line-height: 1.55; }
      .cs-step-arrow { display: none; }

      /* Australian families */
      /* Tighter seam: the trust strip follows straight on from Meet Hero, so it
         doesn't need a full 96px section gap above it. */
      .cs-family-section { padding-top: 40px; }
      /* "(Prep – Year 6)" on its own line under its label. */
      .cs-family-sub { display: block; font-weight: 600; color: #64748B; margin-top: 2px; }
      /* Curriculum coverage line under the trust strip. */
      .cs-family-note { text-align: center; margin: 18px auto 0; font-size: 14.5px; font-weight: 600; color: #64748B; }
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
      /* 3 columns: offer card | Hero+kids artwork | waitlist form. */
      /* 2 columns (offer card | form). The artwork is an absolutely-positioned
         layer BEHIND the card, so Hero + the kids overlap its right edge exactly
         like the reference. */
      /* Card left, form right, with a deliberate GAP between them where the
         artwork shows through from behind. */
      /* Card | form | artwork. The art sits to the RIGHT of the form (its own
         space), so Hero + the kids are never covered. */
      /* Wider offer card so the headline stops wrapping to 4 lines; artwork gets
         its own column and runs the FULL height of the card. */
      .cs-offer { position: relative; overflow: hidden; background: linear-gradient(135deg, #F6F8FE, #FFFDF7); border: 1px solid #E7ECF3; border-radius: 28px; padding: 0 0 0 44px; display: grid; grid-template-columns: minmax(0,1.2fr) minmax(340px,0.85fr) minmax(0,0.78fr); gap: 32px; align-items: center; box-shadow: 0 20px 60px rgba(27,43,75,0.10); }
      .cs-offer > div:first-of-type { padding: 48px 0; }   /* offer-card column */

      /* Hero + kids artwork sitting behind/between the two columns. Edges are
         feathered in the PNG, so it melts into the card. */
      /* Artwork sits in the MIDDLE of the card, between the offer and the form,
         so Hero + the kids are fully visible (never covered by the form). It's
         feathered in the PNG, so it melts into the card background. */
      /* Big artwork layer BEHIND everything (z-index 0 — the Reveal wrappers
         create their own stacking contexts, so the card/form sit above it via
         their own z-index). Anchored to the card's bottom edge, gently floating. */
      /* Artwork = the 3rd column, sitting to the RIGHT of the form. Scaled up
         (and allowed to bleed past its column + the card's padding) so Hero and
         the kids read big, while never overlapping the form. */
      /* Artwork spans the card top-to-bottom (its own column), so Hero + the kids
         meet both edges and the image reads as part of the card. */
      /* Taller than its slot and nudged down, so the float (which lifts it ~14px)
         can never expose white space under the image. The card clips the excess
         via overflow: hidden. */
      .cs-offer-art { position: relative; z-index: 1; grid-column: 3; align-self: stretch;
        width: 100%; height: calc(100% + 40px); margin-bottom: -40px; max-width: none;
        object-fit: cover; object-position: center bottom;
        border-radius: 0 28px 28px 0; pointer-events: none;
        animation: csOfferArtFloat 7s ease-in-out infinite; }
      @keyframes csOfferArtFloat {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-14px); }
      }
      @media (prefers-reduced-motion: reduce) { .cs-offer-art { animation: none; } }
      /* The two Reveal wrappers are direct grid children — lift BOTH above the
         artwork layer, otherwise the art paints over the card text and form. */
      .cs-offer > div { position: relative; z-index: 2; }

      /* Left offer card (glassy, sits above the artwork). */
      /* Frosted card in FRONT of the artwork — nearly opaque so the text stays
         crisp, with a blur so the art softly reads through the edges. */
      .cs-offer-card { position: relative; z-index: 2; background: rgba(255,255,255,0.9);
        -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15);
        border: 1px solid rgba(255,255,255,0.9); border-radius: 26px; padding: 36px 36px 32px;
        box-shadow: 0 24px 60px rgba(27,43,75,0.16); max-width: 100%; }
      .cs-offer-pill { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, ${GOLD}, #E9C349);
        color: ${NAVY}; font-weight: 800; font-size: 13px; padding: 7px 16px; border-radius: 99px; margin-bottom: 16px; }
      .cs-offer-title { font-size: clamp(26px, 2.6vw, 36px); font-weight: 900; letter-spacing: -1px;
        line-height: 1.14; color: ${NAVY}; margin: 0 0 14px; text-wrap: balance; }
      .cs-offer-sub { font-size: 15.5px; line-height: 1.6; color: #475569; margin: 0 0 22px; }

      /* 2x2 benefit tiles. */
      /* Benefit tiles ~18% larger so each one feels valuable. */
      .cs-perks { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
      .cs-perk { background: rgba(255,255,255,0.92); border: 1px solid #EEF2F7; border-radius: 18px;
        padding: 20px 14px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px;
        box-shadow: 0 8px 22px rgba(27,43,75,0.06); }
      .cs-perk-icon { font-size: 32px; line-height: 1; }
      .cs-perk-label { font-size: 15px; font-weight: 800; color: ${NAVY}; line-height: 1.3; }

      .cs-offer-save { display: block; text-align: center; background: linear-gradient(135deg, ${GOLD}, #FFD700);
        color: ${NAVY}; font-weight: 900; font-size: 17px; padding: 16px 22px; border-radius: 99px;
        box-shadow: 0 12px 28px rgba(245,158,11,0.38); margin-bottom: 16px; text-decoration: none; }

      /* Scannable trust row (icons instead of one long sentence). */
      .cs-trust-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
      .cs-trust-list li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 700; color: #475569; }
      .cs-trust-list span { font-size: 16px; line-height: 1; }
      .cs-gift { font-size: 52px; margin-bottom: 8px; }
      .cs-save-badge { display: inline-block; margin-top: 18px; background: linear-gradient(135deg, ${GOLD}, #FFD700); color: ${NAVY}; font-weight: 900; font-size: 15px; padding: 12px 22px; border-radius: 99px; box-shadow: 0 10px 24px rgba(245,158,11,0.35); }

      /* Big animated gift — gentle idle float + tilt, soft glow behind it. */
      .cs-gift-wrap { position: relative; width: 120px; height: 120px; margin-bottom: 18px; }
      .cs-gift-glow { position: absolute; inset: -14px; border-radius: 50%; background: radial-gradient(circle, rgba(245,158,11,0.45), transparent 68%); filter: blur(6px); animation: csGlow 3.4s ease-in-out infinite; }
      .cs-gift-big { position: relative; width: 120px; height: 120px; border-radius: 30px; display: flex; align-items: center; justify-content: center; font-size: 64px; background: linear-gradient(135deg, ${GOLD}, #FFD700); box-shadow: 0 18px 40px rgba(245,158,11,0.45); animation: csGiftFloat 4s ease-in-out infinite; transform-origin: center bottom; }
      @keyframes csGiftFloat { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-12px) rotate(4deg); } }
      @keyframes csGlow { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.95; transform: scale(1.08); } }

      /* Hero peeking video near the top-right of the offer card. The clip is
         portrait (960×1280); we size by width and let it float. */
      .cs-offer-hero { position: absolute; top: -128px; right: 20px; width: 150px; z-index: 4; animation: csPeekFloat 4.6s ease-in-out infinite; pointer-events: none; }
      .cs-offer-hero video { width: 100%; height: auto; display: block; }
      @keyframes csPeekFloat { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-9px) rotate(2deg); } }

      @media (prefers-reduced-motion: reduce) {
        .cs-gift-big, .cs-gift-glow, .cs-offer-hero { animation: none; }
      }

      /* Meet Hero image (replaces the old dashboard mock) */
      .cs-meet-hero-img { width: 100%; max-width: 380px; height: auto; filter: drop-shadow(0 24px 50px rgba(27,43,75,0.22)); }
      /* Meet-Hero artwork. Edges are already feathered in the PNG, so NO
         drop-shadow here (a shadow would trace the invisible bounding box).
         Gentle idle float keeps it feeling alive. */
      .cs-meet-hero-art { width: 100%; max-width: 460px; height: auto; display: block;
        animation: csHeroArtFloat 6s ease-in-out infinite; }
      @keyframes csHeroArtFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      @media (prefers-reduced-motion: reduce) { .cs-meet-hero-art { animation: none; } }

      /* Centered eyebrow tag for the How-it-works heading */
      .cs-center-tag { display: block; width: fit-content; margin: 0 auto 14px; }
      .cs-how-h2 { font-size: clamp(32px, 4.2vw, 52px); }

      /* Final CTA block */
      .cs-final-cta { position: relative; background: linear-gradient(135deg, ${NAVY}, #2D4A7A); border-radius: 28px; padding: 90px 40px 44px; text-align: center; box-shadow: 0 24px 60px rgba(27,43,75,0.28); overflow: visible; }
      .cs-final-peek { position: absolute; top: -132px; left: 50%; transform: translateX(-50%); width: 160px; z-index: 4; pointer-events: none; }
      .cs-final-peek video { width: 100%; height: auto; display: block; }
      .cs-final-perks { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
      .cs-final-perk { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); color: white; font-weight: 700; font-size: 15px; padding: 10px 18px; border-radius: 14px; }
      .cs-final-perk span { font-size: 18px; }
      .cs-form-card { position: relative; z-index: 2; background: white; border-radius: 22px; padding: 30px 28px; box-shadow: 0 20px 50px rgba(27,43,75,0.14); border: 1px solid #E7ECF3; }
      /* Form headline ~20% larger for hierarchy. */
      .cs-form-title { font-size: 27px; font-weight: 900; color: ${NAVY}; margin: 0 0 6px; letter-spacing: -0.5px; }
      /* Scarcity cue directly above the submit button. */
      .cs-urgency { display: flex; align-items: flex-start; gap: 8px; margin: 4px 0 12px;
        background: rgba(196,154,26,0.10); border: 1px solid rgba(196,154,26,0.28); border-radius: 12px;
        padding: 10px 12px; font-size: 12.5px; font-weight: 700; color: #7A5E10; line-height: 1.4; }
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
        /* Stack on phones: offer card → artwork → form (art returns to flow so
           it never sits behind the text on a narrow screen). */
        .cs-offer { grid-template-columns: 1fr; padding: 24px 18px; gap: 18px; }
        .cs-offer > div:first-of-type { padding: 0; }
        .cs-offer-art { position: static; grid-column: auto; height: auto; width: 100%;
          max-width: 320px; margin: 0 auto; display: block; align-self: auto;
          object-fit: contain; border-radius: 18px; }
        .cs-offer-card { max-width: 100%; padding: 24px 20px; background: rgba(255,255,255,0.9); }
        .cs-perks { gap: 10px; }
        .cs-perk { padding: 14px 10px; }
        /* On mobile the peeking Hero moves up top-right, smaller, over the corner. */
        .cs-offer-hero { top: -96px; right: 6px; width: 108px; }
        .cs-meet-hero-img { max-width: 260px; }
        .cs-dash { grid-template-columns: 1fr !important; }
        .cs-section { padding: 64px 0; }
        /* Same tightened seam on mobile. */
        .cs-video-section { padding-top: 48px; padding-bottom: 28px; }
        #meet-hero { padding-top: 28px; padding-bottom: 28px; }
        .cs-family-section { padding-top: 28px; }
      }
      @media (max-width: 560px) {
        .cs-pillars, .cs-family-items { grid-template-columns: 1fr; }
        .cs-name-row { flex-direction: column; }
        .cs-footer { flex-direction: column; text-align: center; }
      }
    `
