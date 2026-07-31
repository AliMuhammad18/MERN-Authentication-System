import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Security() {
  const { user, loadUser, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [otp, setOtp] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [disableMode, setDisableMode] = useState(null)
  const [disableValue, setDisableValue] = useState('')

  async function onLogout() {
    await logout()
    navigate('/')
  }

  async function startEnable() {
    setError('')
    setMessage('')
    setPending(true)
    try {
      const data = await authApi.enable2fa()
      setQrCodeDataUrl(data.qrCodeDataUrl)
      setMessage(data.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function confirmEnable(e) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      const data = await authApi.verifyMfaEnable({ otp })
      setBackupCodes(data.backupcodes || [])
      setQrCodeDataUrl('')
      setOtp('')
      setMessage(data.message)
      await loadUser()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  function startDisable() {
    setError('')
    setMessage('Enter the 6 digit OTP from your authenticator app to disable 2FA')
    setDisableMode('otp')
  }

  async function confirmDisable(e) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      const data =
        disableMode === 'otp'
          ? await authApi.verifyDisableOtp({ otp: disableValue })
          : await authApi.verifyDisableBackupCode({ backupCode: disableValue })
      setMessage(data.message)
      setDisableMode(null)
      setDisableValue('')
      await loadUser()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/home" className="brand">
          Ali Auth
        </Link>
        <nav className="topbar-actions">
          <Link to="/home" className="text-link">
            Home
          </Link>
          <button type="button" className="btn btn-logout" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>

      <main className="security">
        <p className="eyebrow">Account</p>
        <h1>Security</h1>
        <p className="lede">
          Two-factor authentication is currently{' '}
          <strong>{user?.mfaEnabled ? 'enabled' : 'disabled'}</strong>.
        </p>

        {error ? <p className="form-error">{error}</p> : null}
        {message && !qrCodeDataUrl ? (
          <p className="form-success">{message}</p>
        ) : null}

        {!user?.mfaEnabled && !qrCodeDataUrl && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={startEnable}
            disabled={pending}
          >
            {pending ? 'Working…' : 'Enable 2FA'}
          </button>
        )}

        {qrCodeDataUrl && (
          <section className="security-block">
            <h2>{message || 'Scan the QR code to enable MFA'}</h2>
            <img className="qr" src={qrCodeDataUrl} alt="2FA QR code" />
            <form className="form" onSubmit={confirmEnable}>
              <label className="field">
                <span>Authenticator code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={pending}>
                {pending ? 'Confirming…' : 'Confirm and enable'}
              </button>
            </form>
          </section>
        )}

        {backupCodes.length > 0 && (
          <section className="security-block">
            <h2>Save your backup codes</h2>
            <p className="lede">Shown once. Store them somewhere safe.</p>
            <ul className="backup-list">
              {backupCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </section>
        )}

        {user?.mfaEnabled && !disableMode && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={startDisable}
            disabled={pending}
          >
            Disable 2FA
          </button>
        )}

        {disableMode && (
          <section className="security-block">
            <div className="tabs">
              <button
                type="button"
                className={disableMode === 'otp' ? 'tab active' : 'tab'}
                onClick={() => setDisableMode('otp')}
              >
                Authenticator
              </button>
              <button
                type="button"
                className={disableMode === 'backup' ? 'tab active' : 'tab'}
                onClick={() => setDisableMode('backup')}
              >
                Backup code
              </button>
            </div>
            <form className="form" onSubmit={confirmDisable}>
              <label className="field">
                <span>{disableMode === 'otp' ? '6-digit code' : 'Backup code'}</span>
                <input
                  type="text"
                  required
                  value={disableValue}
                  onChange={(e) => setDisableValue(e.target.value)}
                />
              </label>
              <button className="btn btn-danger" type="submit" disabled={pending}>
                {pending ? 'Disabling…' : 'Confirm disable'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}
