'use client'
// Shared themed UI primitives for the WEB app — the parity port of
// mobile/lib/ui.tsx. Every primitive reads the CSS theme variables defined in
// app/globals-themes.css (light / dark / colour-safe), so the whole app stays
// consistent and theme-aware. Visual only — no business logic.
//
// Use these instead of hardcoding brand colours: <Card>, <GlowBar>,
// <GradientButton>, <StatPill>, <SectionHeader>, <ScreenBackground>.

import React from 'react'

// ── ScreenBackground ────────────────────────────────────────────────────────
// Full-screen base painted with the theme's --bg-gradient (flat CSS gradient,
// mirroring mobile's bg image). Falls back to --bg-primary.
export function ScreenBackground({ children, style, className = '' }) {
  return (
    <div
      className={className}
      style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient, var(--bg-primary))',
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────
// Themed surface with soft radius + gentle shadow. `glow` adds a gold halo,
// `gold` a stronger gold border, `elevated` a raised surface.
export function Card({ children, style, glow = false, gold = false, elevated = false, className = '', ...rest }) {
  return (
    <div
      className={className}
      style={{
        background: elevated ? 'var(--bg-card-elevated)' : 'var(--bg-card)',
        borderRadius: 16,
        border: `1px solid ${gold ? 'var(--accent-gold-border)' : 'var(--border-color)'}`,
        boxShadow: glow ? '0 0 0 1px var(--accent-gold-border), 0 8px 28px var(--glow)' : 'var(--shadow)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

// ── GlowBar ─────────────────────────────────────────────────────────────────
// The signature glowing gold progress bar (Hero Points + skill progress).
// `progress` is 0..1.
export function GlowBar({ progress, height = 10, style }) {
  const pct = Math.max(0, Math.min(1, progress || 0))
  return (
    <div
      style={{
        height,
        borderRadius: height,
        background: 'var(--border-color)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height,
          background: 'var(--gold-gradient)',
          boxShadow: '0 0 10px var(--glow)',
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}

// ── StatPill ────────────────────────────────────────────────────────────────
// Rounded stat/value chip used in stats strips + skill chips.
export function StatPill({ children, style, active = false, className = '', ...rest }) {
  return (
    <div
      className={className}
      style={{
        background: active ? 'var(--accent-gold-light)' : 'var(--bg-card)',
        borderRadius: 16,
        border: `1px solid ${active ? 'var(--accent-gold-border)' : 'var(--border-color)'}`,
        boxShadow: 'var(--shadow)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

// ── GradientButton ──────────────────────────────────────────────────────────
// Gold gradient CTA. Pass `title` or children. Forwards button props.
export function GradientButton({ title, children, style, textStyle, className = '', ...rest }) {
  return (
    <button
      className={className}
      style={{
        border: 'none',
        borderRadius: 14,
        padding: '12px 18px',
        background: 'var(--cta-gradient, var(--gold-gradient))',
        boxShadow: '0 0 12px var(--glow)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      {...rest}
    >
      {title
        ? <span style={{ color: '#1B2B4B', fontWeight: 800, fontSize: 15, ...textStyle }}>{title}</span>
        : children}
    </button>
  )
}

// ── SectionHeader ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, right, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, ...style }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
        {subtitle ? <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{subtitle}</p> : null}
      </div>
      {right}
    </div>
  )
}
