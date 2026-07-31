import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { authApi } from '../api/auth.js'

const STEPS = ['email', 'otp', 'password']

function EyeIcon({ show }) {
  return show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function CheckIcon({ valid }) {
  return valid ? (
    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isAccountNotFound, setIsAccountNotFound] = useState(false)
  const [isResetComplete, setIsResetComplete] = useState(false)

  const stepIndex = STEPS.indexOf(step)

  // Resend OTP countdown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  /* ── Password validation criteria ── */
  const hasMinLength = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && passwordsMatch

  /* ── Step 1: Send OTP ── */
  async function onSendOtp(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsAccountNotFound(false)
    setPending(true)
    try {
      await authApi.sendPasswordResetOtp({ email })
      setSuccess(`A 6-digit verification code has been sent to ${email}`)
      setStep('otp')
      setResendCooldown(60)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  /* ── Step 2: Verify OTP ── */
  async function onVerifyOtp(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsAccountNotFound(false)
    setPending(true)
    try {
      await authApi.verifyPasswordResetOtp({ otp })
      setSuccess('OTP verified successfully! Create your new password.')
      setStep('password')
    } catch (err) {
      setError(err.message)
      if (
        err.message?.toLowerCase().includes("user doesn't exist") ||
        err.message?.toLowerCase().includes("user not found") ||
        err.status === 404
      ) {
        setIsAccountNotFound(true)
      }
    } finally {
      setPending(false)
    }
  }

  /* ── Resend OTP ── */
  async function onResendOtp() {
    if (resendCooldown > 0 || pending) return
    setError('')
    setSuccess('')
    setIsAccountNotFound(false)
    setPending(true)
    try {
      await authApi.sendPasswordResetOtp({ email })
      setSuccess(`A new verification code was sent to ${email}`)
      setResendCooldown(60)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  /* ── Step 3: Save New Password ── */
  async function onSavePassword(e) {
    e.preventDefault()
    if (!isPasswordValid) return
    setError('')
    setSuccess('')
    setPending(true)
    try {
      await authApi.resetPassword({ password })
      setIsResetComplete(true)
      setSuccess('Password updated successfully! Redirecting to sign in...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  const titles = {
    email: 'Forgot password',
    otp: 'Enter security code',
    password: 'Set new password',
  }

  const subtitles = {
    email: "Enter your email address and we'll send a 6-digit verification code.",
    otp: `Enter the code sent to ${email}`,
    password: 'Choose a strong new password for your account.',
  }

  return (
    <AuthShell
      title={titles[step]}
      subtitle={subtitles[step]}
      footer={
        <>
          Remembered your password? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {/* Progress dots */}
      <div className="signup-steps" aria-label="Reset password progress">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`signup-step-dot ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'active' : ''}`}
          />
        ))}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      {/* ── STEP 1: Email ── */}
      {step === 'email' && (
        <form className="form" onSubmit={onSendOtp}>
          <label className="field">
            <span>Email address</span>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <button className="btn btn-primary" type="submit" disabled={pending} id="send-reset-otp-btn">
            {pending ? 'Sending code…' : 'Send verification code'}
          </button>
        </form>
      )}

      {/* ── STEP 2: OTP ── */}
      {step === 'otp' && (
        <form className="form" onSubmit={onVerifyOtp}>
          <label className="field">
            <span>6-digit verification code</span>
            <input
              id="reset-otp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="otp-input"
            />
          </label>

          {isAccountNotFound && (
            <div className="not-found-card">
              <p>No registered account was found with this email address.</p>
              <Link to="/signup" className="btn btn-secondary">
                Create an account
              </Link>
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending || otp.length !== 6}
            id="verify-reset-otp-btn"
          >
            {pending ? 'Verifying…' : 'Verify code'}
          </button>

          <div className="signup-row">
            <button
              type="button"
              className="btn btn-ghost"
              id="back-to-email-btn"
              onClick={() => {
                setStep('email')
                setError('')
                setSuccess('')
                setOtp('')
                setIsAccountNotFound(false)
              }}
            >
              ← Change email
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              id="resend-reset-otp-btn"
              disabled={pending || resendCooldown > 0}
              onClick={onResendOtp}
            >
              {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: New Password ── */}
      {step === 'password' && (
        <form className="form" onSubmit={onSavePassword}>
          <label className="field">
            <span>New password</span>
            <div className="input-with-action">
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon show={showPassword} />
              </button>
            </div>
          </label>

          <label className="field">
            <span>Confirm new password</span>
            <input
              id="reset-confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </label>

          {/* Password requirement checklist */}
          <div className="password-checklist">
            <div className={`checklist-item ${hasMinLength ? 'valid' : ''}`}>
              <CheckIcon valid={hasMinLength} /> At least 8 characters
            </div>
            <div className={`checklist-item ${hasUpper ? 'valid' : ''}`}>
              <CheckIcon valid={hasUpper} /> At least one uppercase letter (A-Z)
            </div>
            <div className={`checklist-item ${hasLower ? 'valid' : ''}`}>
              <CheckIcon valid={hasLower} /> At least one lowercase letter (a-z)
            </div>
            <div className={`checklist-item ${hasNumber ? 'valid' : ''}`}>
              <CheckIcon valid={hasNumber} /> At least one number (0-9)
            </div>
            <div className={`checklist-item ${passwordsMatch ? 'valid' : ''}`}>
              <CheckIcon valid={passwordsMatch} /> Passwords match
            </div>
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending || !isPasswordValid || isResetComplete}
            id="finish-reset-btn"
          >
            {pending ? 'Updating password…' : isResetComplete ? 'Password Updated!' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
