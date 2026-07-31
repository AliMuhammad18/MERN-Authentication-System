import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import GoogleIcon from '../components/GoogleIcon.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { authApi } from '../api/auth.js'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      const result = await login({ email, password })
      if (result.requires2fa) {
        navigate('/verify-2fa')
        return
      }
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use your email and password to continue."
      footer={
        <>
          <Link to="/signup">Create an account</Link>
          <span className="dot">·</span>
          <Link to="/forgot-password">Forgot password?</Link>
        </>
      }
    >
      <form className="form" onSubmit={onSubmit}>
        {error ? <p className="form-error">{error}</p> : null}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>

        <a className="btn btn-secondary btn-google" href={authApi.googleUrl}>
          <GoogleIcon />
          Continue with Google
        </a>
      </form>
    </AuthShell>
  )
}
