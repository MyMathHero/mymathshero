'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// Inner component uses useSearchParams() — wrap in Suspense at the page boundary.
function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function handleReset() {
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('done')
      } else {
        setError(data.error || 'Something went wrong')
        setStatus('idle')
      }
    } catch {
      setError('Connection error. Please try again.')
      setStatus('idle')
    }
  }

  if (!token) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ color: '#EF4444', textAlign: 'center', marginBottom: 16 }}>
            Invalid reset link. Please request a new one.
          </p>
          <a href="/login" style={styles.btn}>Back to Login</a>
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 48 }}>✅</span>
          </div>
          <h1 style={styles.title}>Password Reset!</h1>
          <p style={styles.text}>
            Your password has been updated successfully.
          </p>
          <a href="/login" style={styles.btn}>Login Now →</a>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={styles.logo}>
            MyMaths<span style={{ color: '#C49A1A' }}>Hero</span>
          </p>
        </div>
        <h1 style={styles.title}>Reset Password 🔐</h1>
        <p style={styles.text}>Enter your new password below.</p>

        <input
          type="password"
          placeholder="New password (min 8 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleReset()}
          style={styles.input}
        />

        {error && (
          <p style={{ color: '#EF4444', fontSize: 14, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          onClick={handleReset}
          disabled={status === 'loading'}
          style={{ ...styles.btn, cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}
        >
          {status === 'loading' ? 'Resetting...' : 'Reset Password →'}
        </button>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.text}>Loading…</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
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
    width: '100%',
    padding: '14px 16px',
    border: '1.5px solid #E2E8F0',
    borderRadius: 10,
    fontSize: 15,
    color: '#1B2B4B',
    marginBottom: 12,
    outline: 'none',
    display: 'block',
  },
  btn: {
    display: 'block',
    width: '100%',
    background: '#1B2B4B',
    color: 'white',
    border: '2px solid #C49A1A',
    borderRadius: 12,
    padding: '14px 24px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    marginTop: 8,
  },
}
