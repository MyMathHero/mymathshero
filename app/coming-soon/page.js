'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MathCountdownBar from '@/components/MathCountdownBar'
import { LAUNCH_DATE_DISPLAY } from '@/lib/launchDate'
import { Analytics } from '@/lib/analytics'
import { useScrollProgress, range, lerp } from './useScrollScene'
import Reveal from './Reveal'
import DashboardMock from './DashboardMock'
import { FAQS, PILLARS, STEPS, FAMILY_TRUST, TESTIMONIALS, OFFER_POINTS, FLOAT_SYMBOLS } from './comingSoonData'

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
    return () => { clearTimeout(t); window.removeEventListener('resize', check) }
  }, [])

  // Phases mapped so the whole two-act animation completes by hp≈0.7 and then
  // HOLDS — the pinned scene stays as "Act 2" for the last stretch, then un-pins
  // and scrolls up into the pillars with no empty gap. On mobile everything is
  // forced to its "rest" state (no scroll-driven transforms).
  const symbolT = isMobile ? 0 : range(hp, 0, 0.6)   // symbols drift outward
  const act1Out = isMobile ? 0 : range(hp, 0.1, 0.42) // headline fades as act 1 ends
  const robotZoom = isMobile ? 0 : range(hp, 0.1, 0.66) // robot scales up + centres
  const act2In = isMobile ? 0 : range(hp, 0.46, 0.72) // cinematic tagline fades in

  return (
    // overflow-x: clip (NOT hidden) — clip contains the drifting symbols without
    // creating a scroll container, which would break position: sticky pinning.
    <div style={{ background: CREAM, color: NAVY, fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif", overflowX: 'clip' }}>
      <GlobalCss />
      <MathCountdownBar />

      {/* ══════════════ SCENE 1 — CINEMATIC PINNED HERO ══════════════ */}
      {/* 190vh section, 100vh sticky child → 90vh of pinned scroll runway for the
          two-act transform. The content BELOW is pulled up a full 100vh (cream
          slab) so it exactly covers the sticky child's final screen — no gap. */}
      {/* Desktop: 190vh pinned runway. Mobile: auto height, no pin — a normal
          stacked hero (the cinematic pin doesn't suit small screens). */}
      <section ref={heroRef} style={{ position: 'relative', height: isMobile ? 'auto' : '190vh' }}>
        <div style={{
          position: isMobile ? 'relative' : 'sticky', top: 0,
          minHeight: isMobile ? 0 : '100vh', height: isMobile ? 'auto' : '100vh',
          overflow: isMobile ? 'visible' : 'hidden',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? '32px 0 40px' : 0,
        }}>
          {/* soft brand aura */}
          <div className="cs-aura" aria-hidden />

          {/* Brand logo + wordmark — top-left, like the original version */}
          <div className="cs-hero-logo" style={{
            opacity: (entered ? 1 : 0) * lerp(1, 0, act1Out),
            transform: entered ? 'none' : 'translateY(-10px)',
            transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <img src="/assets/logos/logo-icon.png" alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
            <div>
              <div className="cs-hero-logo-word"><span style={{ color: NAVY }}>MyMaths</span><span style={{ color: GOLD }}>Hero</span></div>
              <div className="cs-hero-logo-tag">PERSONALISED MATHS LEARNING</div>
            </div>
          </div>

          {/* Floating maths symbols — decorative BACKGROUND (zIndex 0, behind all
              content). Confined to the right/edge zones; hidden on mobile. */}
          {FLOAT_SYMBOLS.map((s, i) => (
            <span key={i} aria-hidden className="cs-float-sym" style={{
              position: 'absolute', left: s.x, top: s.y, zIndex: 0,
              fontSize: s.size, fontWeight: 800, color: s.color,
              opacity: (entered ? 0.85 : 0) * lerp(1, 0, range(hp, 0.3, 0.6)),
              transform: `translate(${lerp(0, s.dx, symbolT)}px, ${lerp(0, s.dy, symbolT)}px)`,
              filter: 'drop-shadow(0 6px 14px rgba(27,43,75,0.10))',
              animation: `csDrift ${s.dur}s ease-in-out ${i * 0.3}s infinite`,
              transition: 'opacity 0.8s ease',
              userSelect: 'none', pointerEvents: 'none',
            }}>{s.ch}</span>
          ))}

          <div className="cs-hero-grid">
            {/* Left — headline (fades out as Act 1 ends) */}
            <div style={{
              opacity: (entered ? 1 : 0) * lerp(1, 0, act1Out),
              transform: entered ? `translateY(${lerp(0, -30, act1Out)}px)` : 'translateY(28px)',
              transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
              pointerEvents: act1Out > 0.5 ? 'none' : 'auto',
            }}>
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
                MyMathsHero is Australia's AI maths tutor for primary school children — personalised learning that helps your child{' '}
                <b style={{ color: '#2563EB' }}>understand</b>, <b style={{ color: '#16A34A' }}>improve</b> and <b style={{ color: GOLD }}>thrive</b>.
              </p>
              <div className="cs-hero-cta-row">
                <a href="#waitlist" className="cs-btn-gold">Join the Waitlist →</a>
                <a href="#meet-hero" className="cs-btn-ghost">See how it works</a>
              </div>
              <div className="cs-scrollcue" aria-hidden>
                <span>Scroll to explore</span>
                <span className="cs-scrollcue-dot" />
              </div>
            </div>

            {/* Right — the hero robot. Zooms up + drifts to centre through Act 2. */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                position: 'relative',
                opacity: entered ? 1 : 0,
                transform: entered
                  ? `translateX(${lerp(0, -46, robotZoom)}%) translateY(${lerp(0, 9, robotZoom)}vh) scale(${lerp(1, 1.34, robotZoom)})`
                  : 'scale(0.9) translateY(20px)',
                transition: entered
                  ? 'transform 0.15s linear'
                  : 'opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s',
                transformOrigin: 'center center',
                willChange: 'transform',
              }}>
                <img src="/assets/coming-soon-hero-removebg.png" alt="Hero, the MyMathsHero AI maths tutor"
                  className="cs-hero-robot" draggable={false} />
                {/* Founding-family badge — tucked under the robot, fades as it zooms */}
                <div className="cs-hero-badge" style={{ opacity: (entered ? 1 : 0) * (isMobile ? 1 : lerp(1, 0, range(hp, 0.14, 0.32))) }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 13.5 }}>
                    <span>👨‍👩‍👧</span> First 1,000 Families Only!
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.45 }}>
                    <b style={{ color: '#FFD766' }}>One month FREE</b> + Founding Family pricing for your first year.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Act 2 — cinematic tagline crossfades in over the zoomed robot, filling
              the scroll runway with motion (Apple Vision Pro style). */}
          <div className="cs-hero-act2" style={{
            opacity: act2In,
            transform: `translateY(${lerp(40, 0, act2In)}px)`,
            pointerEvents: 'none',
          }} aria-hidden>
            <div className="cs-act2-eyebrow">Meet Hero</div>
            <div className="cs-act2-title">Your child's own<br /><span style={{ color: GOLD }}>AI maths tutor.</span></div>
          </div>
        </div>
      </section>

      {/* Everything below the hero rides on a solid CREAM slab pulled up a full
          100vh so it exactly covers the sticky child's final (post-animation)
          screen — guaranteeing no empty gap after the pinned hero. On mobile
          there's no pin, so no pull-up. */}
      <div style={{ position: 'relative', zIndex: 3, background: CREAM, marginTop: isMobile ? 0 : '-100vh', paddingTop: 20 }}>

      {/* ══════════════ 4 PILLARS ══════════════ */}
      {/* No Reveal wrapper here — these sit right at the hero→content seam, so they
          must always be painted (a reveal that hasn't fired would read as a gap). */}
      <section className="cs-wrap" style={{ position: 'relative', paddingTop: 24 }}>
        <div className="cs-pillars">
          {PILLARS.map((p) => (
            <div key={p.title} className="cs-pillar">
              <div className="cs-pillar-icon" style={{ background: p.bg, color: p.fg }}>{p.emoji}</div>
              <div className="cs-pillar-title">{p.title}</div>
              <div className="cs-pillar-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ SCENE 2 — MEET HERO + DASHBOARD ══════════════ */}
      <section id="meet-hero" className="cs-section">
        <div className="cs-wrap cs-meet">
          <Reveal from="right" style={{ minWidth: 0 }}>
            <span className="cs-tag">Meet Hero</span>
            <h2 className="cs-h2">Your child's <span style={{ color: '#2563EB' }}>AI maths partner</span></h2>
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
            <DashboardMock />
          </Reveal>
        </div>
      </section>

      {/* ══════════════ SCENE 3 — HOW IT WORKS ══════════════ */}
      <section className="cs-section cs-band">
        <div className="cs-wrap">
          <Reveal><h2 className="cs-h2 cs-center">How MyMaths<span style={{ color: GOLD }}>Hero</span> works</h2></Reveal>
          <Reveal delay={0.05}><p className="cs-p cs-center" style={{ maxWidth: 620, margin: '0 auto 44px' }}>Three simple steps, built around your child.</p></Reveal>
          <div className="cs-steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.14} from="up">
                <div className="cs-step">
                  <div className="cs-step-num" style={{ background: s.color }}>{i + 1}</div>
                  <div className="cs-step-icon">{s.emoji}</div>
                  <div className="cs-step-title">{s.title}</div>
                  <div className="cs-step-desc">{s.desc}</div>
                </div>
                {i < STEPS.length - 1 && <div className="cs-step-arrow" aria-hidden>→</div>}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

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
            {/* Left — the offer */}
            <Reveal from="right">
              <div className="cs-gift" aria-hidden>🎁</div>
              <h2 className="cs-h2" style={{ color: '#2563EB' }}>Become a Founding Family</h2>
              <p className="cs-p">Join the first 1,000 Australian families and receive:</p>
              <ul className="cs-check-list">
                {OFFER_POINTS.map((o, i) => <li key={i}><span className="cs-check">✓</span>{o}</li>)}
              </ul>
              <div className="cs-save-badge">Save $5/month for your first year!</div>
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

      </div>{/* end cream slab wrapper */}

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="cs-footer">
        <div className="cs-footer-brand">
          <img src="/assets/logos/logo-icon.png" alt="" style={{ width: 34, height: 34 }} />
          <div>
            <div style={{ fontWeight: 800 }}>MyMaths<span style={{ color: GOLD }}>Hero</span></div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>AI maths tutoring that builds confidence for life.</div>
          </div>
        </div>
        <div className="cs-footer-mid">Made with <span style={{ color: '#EF4444' }}>❤</span> in Australia 🇦🇺</div>
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
      .cs-p { font-size: 17px; line-height: 1.6; color: #475569; margin: 0 0 20px; }
      .cs-tag { display: inline-block; background: rgba(37,99,235,0.1); color: #2563EB; font-weight: 800; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 14px; border-radius: 99px; margin-bottom: 14px; }

      /* Hero */
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
      .cs-offer { background: linear-gradient(135deg, #EFF4FF, #FFF8E8); border: 1px solid #E7ECF3; border-radius: 28px; padding: 44px; display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: center; box-shadow: 0 20px 60px rgba(27,43,75,0.10); }
      .cs-gift { font-size: 52px; margin-bottom: 8px; }
      .cs-save-badge { display: inline-block; margin-top: 18px; background: linear-gradient(135deg, ${GOLD}, #FFD700); color: ${NAVY}; font-weight: 900; font-size: 14px; padding: 12px 22px; border-radius: 99px; box-shadow: 0 10px 24px rgba(245,158,11,0.35); }
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
        .cs-dash { grid-template-columns: 1fr !important; }
        .cs-section { padding: 64px 0; }
      }
      @media (max-width: 560px) {
        .cs-pillars, .cs-family-items { grid-template-columns: 1fr; }
        .cs-name-row { flex-direction: column; }
        .cs-footer { flex-direction: column; text-align: center; }
      }
    `
