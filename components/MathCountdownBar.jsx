'use client'

import { LAUNCH_DATE_DISPLAY } from '@/lib/launchDate'

// Top launch bar. We no longer commit to a ticking countdown to an exact date —
// the partner wants a relaxed "Launching September" instead. Shows the brand, a
// glowing "Launching September 2026" badge, and the waitlist CTA.
export default function MathCountdownBar() {
  return (
    <div style={S.bar} className="cs-countbar">
      {/* subtle drifting sparkles behind the badge */}
      <style>{`
        @keyframes csGlow { 0%,100% { box-shadow: 0 0 0 rgba(196,154,26,0.0), inset 0 0 0 rgba(255,255,255,0); }
          50% { box-shadow: 0 0 22px rgba(196,154,26,0.45); } }
        @keyframes csPulseDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.35); } }
        @keyframes csFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        .cs-badge { animation: csGlow 3s ease-in-out infinite, csFloat 4s ease-in-out infinite; }
        .cs-dot { animation: csPulseDot 1.6s ease-in-out infinite; }
      `}</style>

      {/* Logo */}
      <span style={S.brand}>
        MyMaths<span style={{ color: '#C49A1A' }}>Hero</span>
      </span>

      {/* Launching <Month Year> badge */}
      <div style={S.badge} className="cs-badge">
        <span style={S.dot} className="cs-dot" />
        <span style={S.rocket}>🚀</span>
        <span style={S.launchLabel}>Launching</span>
        <span style={S.launchDate}>{LAUNCH_DATE_DISPLAY}</span>
        <span style={S.spark}>✦</span>
      </div>

      {/* CTA — scrolls to the live waitlist form on /coming-soon */}
      <a href="#waitlist" style={S.cta}>Join the Waitlist →</a>
    </div>
  )
}

const S = {
  bar: {
    background: '#1B2B4B',
    borderBottom: '1px solid rgba(196,154,26,0.3)',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    gap: 12,
    flexWrap: 'wrap',
  },
  brand: {
    color: 'white',
    fontWeight: 800,
    fontSize: 16,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    flexShrink: 0,
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(196,154,26,0.12)',
    border: '1px solid rgba(196,154,26,0.5)',
    borderRadius: 999,
    padding: '6px 16px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#34D399', flexShrink: 0,
    boxShadow: '0 0 8px #34D399',
  },
  rocket: { fontSize: 15 },
  launchLabel: {
    color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '1.5px',
  },
  launchDate: {
    color: '#FFD700', fontSize: 15, fontWeight: 900, letterSpacing: '0.3px',
  },
  spark: { color: '#C49A1A', fontSize: 14 },
  cta: {
    color: 'white',
    fontWeight: 800,
    fontSize: 13,
    textDecoration: 'none',
    background: '#F59E0B',
    border: '1px solid #C49A1A',
    borderRadius: 10,
    padding: '7px 14px',
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
}
