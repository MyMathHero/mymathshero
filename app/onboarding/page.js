'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RoboVideo from '@/components/RoboVideo'
import { useFeatureFlags } from '@/lib/useFeatureFlags'
import { Analytics } from '@/lib/analytics'

// Theme-aware CSS vars (inline styles → must adapt for dark mode).
const BRAND_DARK = 'var(--text-primary)'
const BRAND_GOLD = 'var(--accent-gold)'
const BRAND_BG = 'var(--bg-primary)'
const BRAND_BORDER = 'var(--border-color)'
const BRAND_SUBTEXT = 'var(--text-secondary)'
// Always-dark surface (the login-details card), independent of theme.
const BRAND_NAVY = '#1B2B4B'

const AVATARS = ['🦊', '🐱', '🐶', '🦁', '🐼', '🦄', '🐸', '🦋']
const GRADES = ['Prep', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6']

// The <Select> binds to a label string ("Year 3") for display, but children
// in Mongo MUST store an integer grade so the recommender, questions API and
// SKILL_ID_MAP all line up. Teacher.grade keeps the label form — it's a
// different domain (which year do they teach) and the teacher UI renders it.
function gradeLabelToInt(label) {
  if (!label) return null
  if (label === 'Prep') return 0
  const m = String(label).match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }

const PATHS = [
  { id: 'parent',  emoji: '👨‍👩‍👧', label: "I'm a Parent",    desc: 'Create an account and add your child' },
  // Teacher registration — hidden until teachersEnabled flag is on. TeacherFlow
  // component below is kept intact so it can be restored by toggling the flag.
  { id: 'teacher', emoji: '📚',     label: "I'm a Teacher",   desc: 'Register and get your class set up', flag: 'teachersEnabled' },
  { id: 'join',    emoji: '🔑',     label: 'I have a join code', desc: 'Enter your 6-digit class code' },
]

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${BRAND_BORDER}`,
      borderRadius: 24,
      padding: '32px 28px',
      width: '100%',
      maxWidth: 480,
      boxSizing: 'border-box',
      boxShadow: '0 12px 32px rgba(27,43,75,0.08)',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', color: BRAND_SUBTEXT, fontSize: 12, fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ color: '#DC2626', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}
    </div>
  )
}

function Input({ style, ...props }) {
  return (
    <input style={{
      width: '100%', padding: '11px 14px', borderRadius: 10,
      border: `1.5px solid ${BRAND_BORDER}`,
      background: 'var(--bg-card)', color: BRAND_DARK,
      fontSize: 15, outline: 'none', boxSizing: 'border-box', ...style,
    }} {...props} />
  )
}

function Select({ style, children, ...props }) {
  return (
    <select style={{
      width: '100%', padding: '11px 14px', borderRadius: 10,
      border: `1.5px solid ${BRAND_BORDER}`,
      background: 'var(--bg-card)', color: BRAND_DARK,
      fontSize: 15, outline: 'none', boxSizing: 'border-box', ...style,
    }} {...props}>
      {children}
    </select>
  )
}

function Btn({ children, loading, disabled, outline, small, style, ...props }) {
  return (
    <button disabled={disabled || loading} style={{
      padding: small ? '9px 18px' : '13px 0',
      width: small ? 'auto' : '100%',
      borderRadius: 12, border: outline ? `2px solid ${BRAND_GOLD}` : 'none',
      background: outline ? 'transparent' : loading || disabled ? '#94A3B8' : BRAND_DARK,
      color: outline ? BRAND_GOLD : '#fff',
      fontWeight: 700, fontSize: small ? 14 : 16,
      cursor: loading || disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'all 0.15s', ...style,
    }}
      onMouseEnter={(e) => { if (!disabled && !loading && !outline) e.currentTarget.style.background = BRAND_GOLD }}
      onMouseLeave={(e) => { if (!disabled && !loading && !outline) e.currentTarget.style.background = BRAND_DARK }}
      {...props}>
      {loading ? <><Spinner /> Saving…</> : children}
    </button>
  )
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{
        width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
        animation: '_spin 0.7s linear infinite',
      }} />
    </>
  )
}

function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 10, padding: '10px 14px', color: '#B91C1C',
      fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
    }}>⚠️ {msg}</div>
  )
}

function BackBtn({ onBack }) {
  return (
    <button onClick={onBack} style={{
      background: 'none', border: 'none', color: BRAND_GOLD,
      fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center',
      gap: 6, padding: 0, marginBottom: 24, fontWeight: 600,
    }}>← Back</button>
  )
}

function ProgressBar({ steps, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: steps }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 99,
          background: i <= current ? BRAND_GOLD : BRAND_BORDER,
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  )
}

function AvatarPicker({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      {AVATARS.map(a => (
        <button key={a} type="button" onClick={() => onChange(a)} style={{
          fontSize: 28, padding: 10, borderRadius: 14,
          border: value === a ? `4px solid ${BRAND_GOLD}` : `2px solid ${BRAND_BORDER}`,
          background: 'var(--bg-card)',
          cursor: 'pointer', transition: 'all 0.15s',
          lineHeight: 1,
        }}>{a}</button>
      ))}
    </div>
  )
}

function Slide({ children }) {
  return (
    <div style={{ animation: 'slideIn 0.25s ease', width: '100%', display: 'flex',
      flexDirection: 'column', alignItems: 'center' }}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:none}}`}</style>
      {children}
    </div>
  )
}

function ParentFlow({ onBack }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [childName, setChildName] = useState('')
  const [grade, setGrade] = useState('')
  const [avatar, setAvatar] = useState('🦊')
  const [parentId, setParentId] = useState('')
  // Parent insight — feeds AI placement so we don't trust the enrolled grade alone.
  const [perceivedLevel, setPerceivedLevel] = useState('at')
  const [confidence, setConfidence] = useState('medium')

  const [credentials, setCredentials] = useState(null)
  const [pinVisible, setPinVisible] = useState(false)

  function validateAccount() {
    const errs = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!isEmail(email)) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'At least 6 characters required'
    return errs
  }

  async function submitAccount(e) {
    e.preventDefault()
    const errs = validateAccount()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setLoading(true); setError('')
    try {
      // Carry a founding-family invite token through, if the user arrived via
      // /join?invite=… — so the server can mark this waitlister as signed up.
      let inviteToken = ''
      try { inviteToken = sessionStorage.getItem('mmh_invite') || '' } catch { /* ignore */ }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'parent', name, email, password, inviteToken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); return }
      setParentId(data.data.id)
      setStep(1)
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  function validateChild() {
    const errs = {}
    if (!childName.trim()) errs.childName = "Child's name is required"
    if (!grade) errs.grade = 'Please select a year'
    return errs
  }

  async function submitChild(e) {
    e.preventDefault()
    const errs = validateChild()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: parentId, child_name: childName, grade: gradeLabelToInt(grade), avatar, perceivedLevel, confidence }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to add child'); return }
      setCredentials({ username: data.data.username, pin: data.data.pin })
      setStep(2)
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const stepCount = 3

  if (step === 0) return (
    <Slide>
      <Card>
        <BackBtn onBack={onBack} />
        <ProgressBar steps={stepCount} current={0} />
        <h2 style={{ color: BRAND_DARK, fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Create your account</h2>
        <p style={{ color: BRAND_SUBTEXT, fontSize: 14, margin: '0 0 24px' }}>Step 1 of 3 · Parent account</p>
        <form onSubmit={submitAccount} noValidate>
          <ErrorBox msg={error} />
          <Field label="Your name" error={fieldErrors.name}>
            <Input value={name} onChange={e => { setName(e.target.value); setFieldErrors(f => ({ ...f, name: '' })) }}
              placeholder="Jane Smith" autoComplete="name" />
          </Field>
          <Field label="Email address" error={fieldErrors.email}>
            <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: '' })) }}
              placeholder="jane@example.com" autoComplete="email" />
          </Field>
          <Field label="Password" error={fieldErrors.password}>
            <Input type="password" value={password} onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: '' })) }}
              placeholder="At least 6 characters" autoComplete="new-password" />
          </Field>
          <Btn type="submit" loading={loading} style={{ marginTop: 8 }}>
            Continue →
          </Btn>
        </form>
      </Card>
    </Slide>
  )

  if (step === 1) return (
    <Slide>
      <Card>
        <BackBtn onBack={() => setStep(0)} />
        <ProgressBar steps={stepCount} current={1} />
        <h2 style={{ color: BRAND_DARK, fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Add your child</h2>
        <p style={{ color: BRAND_SUBTEXT, fontSize: 14, margin: '0 0 24px' }}>Step 2 of 3 · Their learning profile</p>
        <form onSubmit={submitChild} noValidate>
          <ErrorBox msg={error} />
          <Field label="Child's name" error={fieldErrors.childName}>
            <Input value={childName} onChange={e => { setChildName(e.target.value); setFieldErrors(f => ({ ...f, childName: '' })) }}
              placeholder="e.g. Alex" autoComplete="off" />
          </Field>
          <Field label="Year level" error={fieldErrors.grade}>
            <Select value={grade} onChange={e => { setGrade(e.target.value); setFieldErrors(f => ({ ...f, grade: '' })) }}>
              <option value="">Select year…</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </Field>
          <Field label={`How is ${childName.trim() ? childName.split(' ')[0] : 'your child'} performing in maths?`}>
            <Select value={perceivedLevel} onChange={e => setPerceivedLevel(e.target.value)}>
              <option value="below">Below year level</option>
              <option value="at">At year level</option>
              <option value="above">Above year level</option>
            </Select>
          </Field>
          <Field label="How confident are you about that?">
            <Select value={confidence} onChange={e => setConfidence(e.target.value)}>
              <option value="low">Not very sure</option>
              <option value="medium">Fairly sure</option>
              <option value="high">Very sure</option>
            </Select>
          </Field>
          <Field label="Pick an avatar">
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </Field>
          <Btn type="submit" loading={loading} style={{ marginTop: 8 }}>
            Create account →
          </Btn>
        </form>
      </Card>
    </Slide>
  )

  return (
    <Slide>
      <Card>
        <ProgressBar steps={stepCount} current={2} />
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{avatar}</div>
          <h2 style={{ color: BRAND_DARK, fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
            All set, {childName.split(' ')[0]}! 🎉
          </h2>
          <p style={{ color: BRAND_SUBTEXT, fontSize: 14, margin: 0 }}>Step 3 of 3 · Save these login details</p>
        </div>

        <div style={{
          background: BRAND_NAVY, // always-dark login-details card
          border: `2px solid ${BRAND_GOLD}`,
          borderRadius: 20, padding: '28px 24px', marginBottom: 16, textAlign: 'center',
        }}>
          <p style={{ color: BRAND_GOLD, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', margin: '0 0 20px' }}>Login details for {childName.split(' ')[0]}</p>

          <div style={{ marginBottom: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 4px', textTransform: 'uppercase',
              letterSpacing: '0.08em', fontWeight: 600 }}>Username</p>
            <p style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: 1 }}>
              {credentials?.username}
            </p>
          </div>

          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 4px', textTransform: 'uppercase',
              letterSpacing: '0.08em', fontWeight: 600 }}>PIN</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <p style={{ color: BRAND_GOLD, fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: 6 }}>
                {pinVisible ? credentials?.pin : '••••'}
              </p>
              <button onClick={() => setPinVisible(v => !v)} style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
                padding: '6px 10px', color: '#fff', cursor: 'pointer', fontSize: 16,
              }}>
                {pinVisible ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        </div>

        <p style={{ color: BRAND_SUBTEXT, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
          📸 Screenshot this and keep it safe!
        </p>

        <Btn onClick={() => { Analytics.onboardingCompleted('parent'); router.push('/parent-dashboard') }}>
          Go to Dashboard →
        </Btn>
      </Card>
    </Slide>
  )
}

function TeacherFlow({ onBack }) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!school.trim()) errs.school = 'School name is required'
    if (!grade) errs.grade = 'Please select a year'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!isEmail(email)) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'At least 6 characters required'
    return errs
  }

  async function submit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'teacher', name, school, grade, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); return }
      setRegisteredEmail(email.trim().toLowerCase())
      setStep(1)
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  if (step === 0) return (
    <Slide>
      <Card>
        <BackBtn onBack={onBack} />
        <ProgressBar steps={2} current={0} />
        <h2 style={{ color: BRAND_DARK, fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Teacher registration</h2>
        <p style={{ color: BRAND_SUBTEXT, fontSize: 14, margin: '0 0 24px' }}>Step 1 of 2 · Your details</p>
        <form onSubmit={submit} noValidate>
          <ErrorBox msg={error} />
          <Field label="Full name" error={fieldErrors.name}>
            <Input value={name} onChange={e => { setName(e.target.value); setFieldErrors(f => ({ ...f, name: '' })) }}
              placeholder="Ms Johnson" autoComplete="name" />
          </Field>
          <Field label="School name" error={fieldErrors.school}>
            <Input value={school} onChange={e => { setSchool(e.target.value); setFieldErrors(f => ({ ...f, school: '' })) }}
              placeholder="Sunrise Primary School" autoComplete="organization" />
          </Field>
          <Field label="Year you teach" error={fieldErrors.grade}>
            <Select value={grade} onChange={e => { setGrade(e.target.value); setFieldErrors(f => ({ ...f, grade: '' })) }}>
              <option value="">Select year…</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </Field>
          <Field label="Email address" error={fieldErrors.email}>
            <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: '' })) }}
              placeholder="teacher@school.edu" autoComplete="email" />
          </Field>
          <Field label="Password" error={fieldErrors.password}>
            <Input type="password" value={password} onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: '' })) }}
              placeholder="At least 6 characters" autoComplete="new-password" />
          </Field>
          <Btn type="submit" loading={loading} style={{ marginTop: 8 }}>
            Submit application →
          </Btn>
        </form>
      </Card>
    </Slide>
  )

  return (
    <Slide>
      <Card style={{ textAlign: 'center' }}>
        <ProgressBar steps={2} current={1} />
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
        <h2 style={{ color: BRAND_DARK, fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>
          Your account is being reviewed
        </h2>
        <p style={{ color: BRAND_SUBTEXT, fontSize: 15, margin: '0 0 8px', lineHeight: 1.6 }}>
          We&apos;ll email you at
        </p>
        <p style={{ color: BRAND_GOLD, fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
          {registeredEmail}
        </p>
        <p style={{ color: BRAND_SUBTEXT, fontSize: 14, margin: '0 0 32px', lineHeight: 1.6 }}>
          within 24 hours once your account is approved.
        </p>
        <a href="/" style={{ color: BRAND_GOLD, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
          ← Return to Home
        </a>
      </Card>
    </Slide>
  )
}

function JoinFlow({ onBack }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')

  const [joinName, setJoinName] = useState('')
  const [joinAvatar, setJoinAvatar] = useState('🦊')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleCodeChange(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(v)
    setCodeError('')
  }

  function submitCode(e) {
    e.preventDefault()
    if (code.length !== 6) { setCodeError('Please enter a 6-digit code'); return }
    setStep(1)
  }

  function submitJoin(e) {
    e.preventDefault()
    if (!joinName.trim()) { setNameError('Please enter your name'); return }
    setLoading(true)
    Analytics.onboardingCompleted('join')
    setTimeout(() => router.push('/student-dashboard'), 800)
  }

  if (step === 0) return (
    <Slide>
      <Card>
        <BackBtn onBack={onBack} />
        <ProgressBar steps={2} current={0} />
        <h2 style={{ color: BRAND_DARK, fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Enter your class code</h2>
        <p style={{ color: BRAND_SUBTEXT, fontSize: 14, margin: '0 0 28px' }}>Step 1 of 2 · Your teacher gave you this code</p>
        <form onSubmit={submitCode}>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              style={{
                width: '100%', padding: '18px 56px 18px 20px', borderRadius: 14,
                border: `2px solid ${code.length === 6 ? BRAND_GOLD : BRAND_BORDER}`,
                background: 'var(--bg-card)', color: BRAND_DARK,
                fontSize: 32, fontWeight: 800, letterSpacing: 10, outline: 'none',
                boxSizing: 'border-box', textAlign: 'center', transition: 'border 0.2s',
              }}
            />
            {code.length === 6 && (
              <span style={{ position: 'absolute', right: 16, top: '50%',
                transform: 'translateY(-50%)', fontSize: 24 }}>✅</span>
            )}
          </div>
          {codeError && <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 12px' }}>{codeError}</p>}
          <Btn type="submit" disabled={code.length !== 6} style={{ marginTop: 8 }}>
            Join Class →
          </Btn>
        </form>
      </Card>
    </Slide>
  )

  return (
    <Slide>
      <Card>
        <BackBtn onBack={() => setStep(0)} />
        <ProgressBar steps={2} current={1} />
        <h2 style={{ color: BRAND_DARK, fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Almost there!</h2>
        <p style={{ color: BRAND_SUBTEXT, fontSize: 14, margin: '0 0 24px' }}>Step 2 of 2 · Tell us who you are</p>
        <form onSubmit={submitJoin}>
          <Field label="Your name" error={nameError}>
            <Input value={joinName} onChange={e => { setJoinName(e.target.value); setNameError('') }}
              placeholder="e.g. Sam" autoComplete="given-name" />
          </Field>
          <Field label="Pick your avatar">
            <AvatarPicker value={joinAvatar} onChange={setJoinAvatar} />
          </Field>
          <Btn type="submit" loading={loading} style={{ marginTop: 8 }}>
            Start Learning 🚀
          </Btn>
        </form>
      </Card>
    </Slide>
  )
}

function PathPicker({ onSelect, flags }) {
  const visiblePaths = PATHS.filter(p => !p.flag || flags[p.flag])
  return (
    <Slide>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img
          src="/assets/logos/logo-full.png?v=2"
          alt="MyMathsHero"
          style={{ height: 48, width: 'auto', margin: '0 auto 14px', display: 'block' }}
        />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <RoboVideo src="/assets/robot/wavingrobo2.MP4" width={160} loop={true} />
        </div>
        <p style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 16, margin: '0 0 12px' }}>
          Let&apos;s get you started!
        </p>
        <h1 style={{ color: BRAND_DARK, fontSize: 26, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          Welcome to MyMathsHero
        </h1>
        <p style={{ color: BRAND_SUBTEXT, fontSize: 15, margin: 0 }}>How would you like to get started?</p>
      </div>

      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visiblePaths.map(p => (
          <button key={p.id} onClick={() => onSelect(p.id)} style={{
            background: 'var(--bg-card)',
            border: `2px solid ${BRAND_BORDER}`,
            borderRadius: 18, padding: '18px 20px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
            textAlign: 'left', transition: 'all 0.15s', width: '100%',
          }}
            onMouseEnter={e => { e.currentTarget.style.border = `2px solid ${BRAND_GOLD}` }}
            onMouseLeave={e => { e.currentTarget.style.border = `2px solid ${BRAND_BORDER}` }}
          >
            <span style={{
              fontSize: 28, width: 52, height: 52, borderRadius: 14,
              background: 'var(--accent-gold-light)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>{p.emoji}</span>
            <div>
              <div style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 16 }}>{p.label}</div>
              <div style={{ color: BRAND_SUBTEXT, fontSize: 13, marginTop: 2 }}>{p.desc}</div>
            </div>
            <span style={{ marginLeft: 'auto', color: BRAND_GOLD, fontSize: 20 }}>›</span>
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: 28, color: BRAND_SUBTEXT, fontSize: 14 }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: BRAND_GOLD, fontWeight: 600, textDecoration: 'none' }}>
          Sign in →
        </a>
      </p>
    </Slide>
  )
}

export default function OnboardingPage() {
  const [path, setPath] = useState(null)
  const { flags } = useFeatureFlags()

  return (
    <div style={{
      minHeight: '100vh',
      background: BRAND_BG,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 16px',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      {!path && <PathPicker onSelect={(p) => { Analytics.onboardingStarted(); setPath(p) }} flags={flags} />}
      {path === 'parent'  && <ParentFlow  onBack={() => setPath(null)} />}
      {/* Teacher path only reachable when teachersEnabled flag is on */}
      {path === 'teacher' && flags.teachersEnabled && <TeacherFlow onBack={() => setPath(null)} />}
      {path === 'join'    && <JoinFlow    onBack={() => setPath(null)} />}

      <p style={{ color: BRAND_SUBTEXT, fontSize: 12, marginTop: 32 }}>
        © {new Date().getFullYear()} MyMathsHero · Safe learning for every child
      </p>
    </div>
  )
}
