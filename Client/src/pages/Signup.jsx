import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import GoogleIcon from '../components/GoogleIcon.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { authApi } from '../api/auth.js'

const STEPS = ['email', 'otp', 'details']

export default function Signup() {
  const { sendSignupOtp, verifySignupOtp, finishSignup } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)

  const stepIndex = STEPS.indexOf(step)

  /* ── Step 1 – send OTP ── */
  async function onSendOtp(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setPending(true)
    try {
      await sendSignupOtp(email)
      setSuccess(`A 6-digit code was sent to ${email}`)
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  /* ── Step 2 – verify OTP ── */
  async function onVerifyOtp(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setPending(true)
    try {
      await verifySignupOtp(otp)
      setSuccess('Email verified! Now set your name and password.')
      setStep('details')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  /* ── Step 3 – finish signup ── */
  async function onFinish(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setPending(true)
    try {
      await finishSignup({ name, password })
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  /* ── Resend OTP ── */
  async function onResend() {
    setError('')
    setSuccess('')
    setPending(true)
    try {
      await sendSignupOtp(email)
      setSuccess('A new code was sent!')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  /* ── Titles per step ── */
  const titles = {
    email: 'Create account',
    otp: 'Verify your email',
    details: 'Almost there!',
  }
  const subtitles = {
    email: 'Enter your email and we\'ll send a verification code.',
    otp: `Enter the 6-digit code we sent to ${email}`,
    details: 'Choose a name and a strong password to finish.',
  }

  return (
    <AuthShell
      title={titles[step]}
      subtitle={subtitles[step]}
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {/* Step progress indicator */}
      <div className="signup-steps" aria-label="Signup progress">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`signup-step-dot ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'active' : ''}`}
          />
        ))}
      </div>

      {/* ── STEP 1: Email ── */}
      {step === 'email' && (
        <form className="form" onSubmit={onSendOtp}>
          {error && <p className="form-error">{error}</p>}

          <label className="field">
            <span>Email address</span>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <button className="btn btn-primary" type="submit" disabled={pending} id="send-otp-btn">
            {pending ? 'Sending…' : 'Send verification code'}
          </button>

          <a className="btn btn-secondary btn-google" href={authApi.googleUrl} id="google-signup-btn">
            <GoogleIcon />
            Continue with Google
          </a>
        </form>
      )}

      {/* ── STEP 2: OTP ── */}
      {step === 'otp' && (
        <form className="form" onSubmit={onVerifyOtp}>
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <label className="field">
            <span>6-digit code</span>
            <input
              id="signup-otp"
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

          <button className="btn btn-primary" type="submit" disabled={pending || otp.length !== 6} id="verify-otp-btn">
            {pending ? 'Verifying…' : 'Verify code'}
          </button>

          <div className="signup-row">
            <button
              type="button"
              className="btn btn-ghost"
              id="back-to-email-btn"
              onClick={() => { setStep('email'); setError(''); setSuccess(''); setOtp('') }}
            >
              ← Change email
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              id="resend-otp-btn"
              disabled={pending}
              onClick={onResend}
            >
              Resend code
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: Name + Password ── */}
      {step === 'details' && (
        <form className="form" onSubmit={onFinish}>
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <label className="field">
            <span>Full name</span>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              required
              minLength={3}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <small className="hint">At least 8 characters, with upper, lower, and a number.</small>
          </label>

          <button className="btn btn-primary" type="submit" disabled={pending} id="finish-signup-btn">
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
