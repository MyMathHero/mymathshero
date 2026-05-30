'use client'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')

  async function handleSubmit() {
    if (!email.trim()) return
    setStatus('loading')
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus('sent')
    } catch {
      setStatus('sent') // Always show success (security)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={styles.logo}>
            MyMaths<span style={{ color: '#C49A1A' }}>Hero</span>
          </p>
        </div>

        {status === 'sent' ? (
          <>
            <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 16 }}>
              📧
            </div>
            <h1 style={styles.title}>Check your email</h1>
            <p style={styles.text}>
              If an account exists for <strong>{email}</strong> you will
              receive a password reset link shortly.
            </p>
            <a href="/login" style={styles.btn}>Back to Login</a>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Forgot Password? 🔐</h1>
            <p style={styles.text}>
              Enter your email address and we will send you a
              link to reset your password.
            </p>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={styles.input}
            />
            <button
              onClick={handleSubmit}
              disabled={status === 'loading'}
              style={{ ...styles.btn, cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}
            >
              {status === 'loading' ? 'Sending...' : 'Send Reset Link →'}
            </button>
            <a href="/login"
              style={{ display: 'block', textAlign: 'center',
                color: '#64748B', fontSize: 14, marginTop: 16,
                textDecoration: 'none' }}>
              ← Back to Login
            </a>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#F0F4F8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: 'white',
    borderRadius: 20,
    padding: 40,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: '1px solid #E2E8F0',
  },
  logo: { fontSize: 28, fontWeight: 800, color: '#1B2B4B' },
  title: { fontSize: 24, fontWeight: 800, color: '#1B2B4B', marginBottom: 8 },
  text: { color: '#64748B', fontSize: 15, marginBottom: 20 },
  input: {
    width: '100%', padding: '14px 16px',
    border: '1.5px solid #E2E8F0', borderRadius: 10,
    fontSize: 15, color: '#1B2B4B', marginBottom: 12,
    outline: 'none', display: 'block',
  },
  btn: {
    display: 'block', width: '100%',
    background: '#1B2B4B', color: 'white',
    border: '2px solid #C49A1A', borderRadius: 12,
    padding: '14px 24px', fontWeight: 700,
    fontSize: 15, cursor: 'pointer',
    textAlign: 'center', textDecoration: 'none',
  },
}
