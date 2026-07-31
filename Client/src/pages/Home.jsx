import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase()

  async function onLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/home" className="brand">
          Ali Auth
        </Link>
        <nav className="topbar-actions">
          <Link to="/security" className="text-link">
            Security
          </Link>
          <button type="button" className="btn btn-logout" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>

      <main className="home">
        <section className="home-hero">
          <div className="home-avatar" aria-hidden="true">
            {initial}
          </div>
          <div>
            <p className="eyebrow">Your account</p>
            <h1>Welcome back, {user?.name}</h1>
            <p className="home-email">{user?.email}</p>
          </div>
        </section>

        <section className="home-grid" aria-label="Account overview">
          <article className="home-card">
            <span className="meta-label">Profile</span>
            <strong>{user?.name}</strong>
            <p>{user?.email}</p>
          </article>

          <article className="home-card">
            <span className="meta-label">Two-factor auth</span>
            <strong className={user?.mfaEnabled ? 'status-on' : 'status-off'}>
              {user?.mfaEnabled ? 'Enabled' : 'Off'}
            </strong>
            <p>
              {user?.mfaEnabled
                ? 'Extra protection is active on your account.'
                : 'Add an authenticator app for stronger security.'}
            </p>
          </article>

          <article className="home-card home-card-action">
            <span className="meta-label">Quick actions</span>
            <Link className="btn btn-primary" to="/security">
              Manage security
            </Link>
            {!user?.mfaEnabled ? (
              <p>Turn on 2FA from the security page.</p>
            ) : (
              <p>Review or disable 2FA anytime.</p>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}
