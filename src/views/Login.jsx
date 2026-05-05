import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/mpointe-3.svg'
import { loginUser } from '../services/auth'
import { saveSession } from '../services/session'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const redirectTo = location.state?.from?.pathname || '/'

  function handleChange(event) {
    setCredentials((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const session = await loginUser({
        username: credentials.username.trim(),
        password: credentials.password,
      })

      saveSession(session)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="legacy-login-stage">
      <div className="welcome-container">
        <h1 className="welcome">Welcome!</h1>
        <p className="welcome-sub">
          Please sign in to access your patients and appointments.
        </p>
      </div>

      <section className="panel" aria-labelledby="login-title">
        <div className="panel-inner">
          <div className="brand">
            <img src={logo} alt="MedPointe" />
          </div>

          <h2 className="title" id="login-title">
            Sign In
          </h2>
          <p className="subtitle">Enter your credentials to access the dashboard.</p>

          <form onSubmit={handleSubmit}>
            <label className="field user">
              <span className="icon">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path
                    d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm7 9a7 7 0 0 0-14 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              <input
                className="pill-input"
                name="username"
                type="text"
                value={credentials.username}
                autoComplete="username"
                placeholder="Username"
                onChange={handleChange}
                required
                autoFocus
              />
            </label>

            <label className="field pass">
              <span className="icon">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <rect
                    x="3"
                    y="10"
                    width="18"
                    height="10"
                    rx="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M7 10V7a5 5 0 0 1 10 0v3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              <input
                className="pill-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                autoComplete="current-password"
                placeholder="Password"
                onChange={handleChange}
                required
              />
              <button
                id="lg-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </label>

            <div className="forgot">Forgot your password?</div>

            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in' : 'Login'}
            </button>

            <div id="lg-message" role="status">
              {error}
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}