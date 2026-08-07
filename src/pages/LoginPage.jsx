import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { user, profile, login, signup, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [isSignup, setIsSignup] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [accountType, setAccountType] = useState('client') // 'client' or 'admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Already logged in — redirect based on role
  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/'} replace />
  }
  if (user && !profile) {
    // Profile still loading, wait
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      const cleanEmail = email.trim().toLowerCase()

      if (isForgot) {
        await resetPassword(cleanEmail)
        setMessage('Password reset email sent! Check your inbox.')
        setSubmitting(false)
        return
      }

      if (isSignup) {
        if (!displayName.trim()) {
          setError('Please enter your full name')
          setSubmitting(false)
          return
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setSubmitting(false)
          return
        }
        if (accountType === 'admin' && !adminCode.trim()) {
          setError('Please enter your Pre-Registered Admin ID')
          setSubmitting(false)
          return
        }

        await signup(cleanEmail, password, displayName.trim(), accountType, adminCode)
        setMessage(
          accountType === 'admin'
            ? 'Admin account created! Check your email to verify, then sign in.'
            : 'Account created! Check your email to verify your address, then sign in.'
        )
        setIsSignup(false)
        setSubmitting(false)
        return
      }

      // Login
      const { user: loggedInUser } = await login(cleanEmail, password)

      // Fetch the profile directly from the database to get definitive role
      let role = 'client'
      if (loggedInUser) {
        const { data: prof } = await (await import('../lib/supabase')).default
          .from('profiles')
          .select('role')
          .eq('id', loggedInUser.id)
          .single()
        role = prof?.role || loggedInUser?.user_metadata?.role || 'client'
      }
      navigate(role === 'admin' ? '/admin' : '/')
    } catch (err) {
      const msg = err?.message || 'Something went wrong'
      if (msg.includes('Invalid login')) {
        setError('Invalid email or password')
      } else if (msg.includes('Email not confirmed')) {
        setError('Please verify your email before signing in. Check your inbox.')
      } else if (msg.includes('already registered')) {
        setError('This email is already registered. Try signing in instead.')
      } else if (msg.includes('Invalid Admin Access Code')) {
        setError(msg)
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(mode) {
    setError('')
    setMessage('')
    setAdminCode('')
    setAccountType('client')
    if (mode === 'forgot') {
      setIsForgot(true)
      setIsSignup(false)
      setShowPassword(false)
    } else if (mode === 'signup') {
      setIsForgot(false)
      setIsSignup(true)
      setShowPassword(false)
    } else {
      setIsForgot(false)
      setIsSignup(false)
      setShowPassword(false)
    }
  }

  const title = isForgot
    ? 'Reset Password'
    : isSignup
      ? 'Create Account'
      : 'Welcome Back'

  const subtitle = isForgot
    ? 'Enter your email to receive a reset link'
    : isSignup
      ? accountType === 'admin'
        ? 'Register as a REVOSMART company worker'
        : 'Register to monitor your irrigation system'
      : 'Sign in to your REVOSMART dashboard'

  return (
    <div className={styles.page}>
      {/* Animated background orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      <div className={styles.card}>
        {/* Brand header */}
        <div className={styles.brandArea}>
          <div className={styles.logo}>R</div>
          <div className={styles.brandName}>REVOSMART</div>
          <div className={styles.brandSub}>Smart Irrigation System</div>
        </div>

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        {error && (
          <div className={styles.alert + ' ' + styles.alertError}>
            <span className={styles.alertIcon}>✕</span>
            {error}
          </div>
        )}

        {message && (
          <div className={styles.alert + ' ' + styles.alertSuccess}>
            <span className={styles.alertIcon}>✓</span>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Account type selector — only shown during signup */}
          {isSignup && (
            <div className={styles.field}>
              <label className={styles.label}>Account Type</label>
              <div className={styles.typeToggle}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${accountType === 'client' ? styles.typeBtnActive : ''}`}
                  onClick={() => { setAccountType('client'); setAdminCode('') }}
                >
                  <span className={styles.typeIcon}>🌱</span>
                  <span>Client</span>
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${accountType === 'admin' ? styles.typeBtnActiveAdmin : ''}`}
                  onClick={() => setAccountType('admin')}
                >
                  <span className={styles.typeIcon}>⚙</span>
                  <span>Company Worker</span>
                </button>
              </div>
            </div>
          )}

          {/* Admin code field — only when signup + admin selected */}
          {isSignup && accountType === 'admin' && (
            <div className={styles.field}>
              <label className={styles.label}>Pre-Registered Admin ID</label>
              <input
                type="text"
                className={styles.input + ' ' + styles.inputAdmin}
                placeholder="e.g. REVOSMART-2026 or ADM-001"
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
                required
                autoComplete="off"
              />
              <div className={styles.fieldHint}>
                Enter the access code provided by your company administrator
              </div>
            </div>
          )}

          {isSignup && (
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Enter your full name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {!isForgot && (
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input + ' ' + styles.passwordInput}
                  placeholder={isSignup ? 'Min 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className={styles.visibilityToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`${styles.submitBtn} ${isSignup && accountType === 'admin' ? styles.submitBtnAdmin : ''}`}
            disabled={submitting}
          >
            {submitting && <span className={styles.btnSpinner} />}
            {isForgot
              ? 'Send Reset Link'
              : isSignup
                ? accountType === 'admin'
                  ? '⚙ Create Admin Account'
                  : '🌱 Create Client Account'
                : 'Sign In'
            }
          </button>
        </form>

        <div className={styles.links}>
          {!isForgot && !isSignup && (
            <>
              <button className={styles.linkBtn} onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
              <span className={styles.linkDot}>·</span>
              <button className={styles.linkBtn} onClick={() => switchMode('signup')}>
                Create an account
              </button>
            </>
          )}

          {isSignup && (
            <button className={styles.linkBtn} onClick={() => switchMode('login')}>
              Already have an account? Sign in
            </button>
          )}

          {isForgot && (
            <button className={styles.linkBtn} onClick={() => switchMode('login')}>
              Back to sign in
            </button>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        © 2026 REVOSMART Integrated Services
      </div>
    </div>
  )
}
