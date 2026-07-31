import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { authApi } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Verify2FA() {
  const navigate = useNavigate()
  const { complete2fa } = useAuth()
  const [mode, setMode] = useState('otp')
  const [otp, setOtp] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      if (mode === 'otp') {
        await authApi.complete2faLogin({ otp })
      } else {
        await authApi.loginWithBackupCode({ backupCode })
      }
      await complete2fa()
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      title="Two-factor verification"
      subtitle="Enter the code from your authenticator app to finish signing in."
      footer={
        <>
          <Link to="/login">Back to sign in</Link>
        </>
      }
    >
      <div className="tabs">
        <button
          type="button"
          className={mode === 'otp' ? 'tab active' : 'tab'}
          onClick={() => setMode('otp')}
        >
          Authenticator
        </button>
        <button
          type="button"
          className={mode === 'backup' ? 'tab active' : 'tab'}
          onClick={() => setMode('backup')}
        >
          Backup code
        </button>
      </div>

      <form className="form" onSubmit={onSubmit}>
        {error ? <p className="form-error">{error}</p> : null}

        {mode === 'otp' ? (
          <label className="field">
            <span>6-digit code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </label>
        ) : (
          <label className="field">
            <span>Backup code</span>
            <input
              type="text"
              required
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
            />
          </label>
        )}

        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </AuthShell>
  )
}
