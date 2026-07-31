import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-top">
        <span className="brand">Ali Auth</span>
      </header>

      <main className="landing-hero">
        <h1 className="landing-brand">Ali Auth</h1>
        <p className="landing-tagline">
          Secure sign-in for your account — email, Google, and two-factor ready.
        </p>
        <div className="landing-actions">
          <Link className="btn btn-primary" to="/login">
            Log in
          </Link>
          <Link className="btn btn-secondary" to="/signup">
            Sign up
          </Link>
        </div>
      </main>
    </div>
  )
}
