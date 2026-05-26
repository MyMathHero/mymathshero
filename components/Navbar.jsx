'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  // null = loading, false = anonymous, object = authed user
  const [authState, setAuthState] = useState(null)
  const pathname = usePathname()

  useEffect(() => {
    let cancelled = false
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        const data = res.ok ? await res.json() : null
        if (cancelled) return
        if (data?.authenticated) setAuthState(data.user)
        else setAuthState(false)
      } catch {
        if (!cancelled) setAuthState(false)
      }
    }
    checkAuth()
    return () => { cancelled = true }
  }, [pathname])

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    window.location.href = '/'
  }

  // ── LOGGED IN ──────────────────────────────────────────────────────────────
  if (authState && authState.role) {
    return (
      <nav style={navShellStyle}>
        {/* Left — dashboard link */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {authState.role === 'student' && (
            <Link href="/student-dashboard" style={linkStyle(pathname === '/student-dashboard')}>Hero HQ</Link>
          )}
          {authState.role === 'parent' && (
            <Link href="/parent-dashboard" style={linkStyle(pathname === '/parent-dashboard')}>Parent Hub</Link>
          )}
          {authState.role === 'teacher' && (
            <Link href="/teacher-dashboard" style={linkStyle(pathname === '/teacher-dashboard')}>Teacher Hub</Link>
          )}
        </div>

        {/* Center — logo */}
        <Link href={getDashboardLink(authState.role)} style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/assets/logos/logo-full.png"
            alt="MyMathsHero"
            style={{ height: 64, width: 'auto', display: 'block' }}
          />
        </Link>

        {/* Right — logout */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleLogout} style={{
            background: 'none',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '6px 16px',
            color: '#64748B',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}>
            Log out
          </button>
        </div>
      </nav>
    )
  }

  // ── PUBLIC ─────────────────────────────────────────────────────────────────
  if (authState === false) {
    return (
      <nav style={navShellStyle}>
        {/* Left — marketing links */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/" style={linkStyle(pathname === '/')}>Home</Link>
          <Link href="/how-it-works" style={linkStyle(pathname === '/how-it-works')}>How It Works</Link>
          <Link href="/for-schools" style={linkStyle(pathname === '/for-schools')}>For Schools</Link>
        </div>

        {/* Center — logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/assets/logos/logo-full.png"
            alt="MyMathsHero"
            style={{ height: 72, width: 'auto', display: 'block' }}
          />
        </Link>

        {/* Right — demos + auth */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Link href="/student-dashboard" style={linkStyle(pathname === '/student-dashboard')}>Student Demo</Link>
          <Link href="/teacher-dashboard" style={linkStyle(pathname === '/teacher-dashboard')}>Teacher Demo</Link>
          <Link href="/login" style={{ color: '#1B2B4B', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            Login
          </Link>
          <Link href="/onboarding" style={{
            background: '#C49A1A', color: 'white',
            padding: '8px 20px', borderRadius: 8,
            textDecoration: 'none', fontWeight: 700, fontSize: 14,
          }}>
            Join Waitlist
          </Link>
        </div>
      </nav>
    )
  }

  // ── LOADING (auth check in flight) ─────────────────────────────────────────
  return (
    <nav style={navShellStyle}>
      <div />
      <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src="/assets/logos/logo-full.png"
          alt="MyMathsHero"
          style={{ height: 72, width: 'auto', display: 'block' }}
        />
      </Link>
      <div />
    </nav>
  )
}

const navShellStyle = {
  background: 'white',
  borderBottom: '1px solid #E2E8F0',
  padding: '0 24px',
  height: 80,
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 100,
}

function getDashboardLink(role) {
  if (role === 'student') return '/student-dashboard'
  if (role === 'parent') return '/parent-dashboard'
  if (role === 'teacher') return '/teacher-dashboard'
  return '/'
}

function linkStyle(active) {
  return {
    color: active ? '#C49A1A' : '#1B2B4B',
    textDecoration: 'none',
    fontWeight: active ? 700 : 600,
    fontSize: 14,
  }
}
