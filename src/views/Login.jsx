import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import logo from '../assets/mpointe-3.svg'
import { loginUser } from '../services/auth'
import { saveSession } from '../services/session'

const AUTH_ERROR_MESSAGES = {
  EXPIRED_TOKEN: 'Session has expired',
  INVALID_TOKEN: 'Unauthorized access',
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const authError = searchParams.get('authError')
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState(() => AUTH_ERROR_MESSAGES[authError] || '')
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
      if (session.status != 200)
        setError(session.data.message)
      else{
        saveSession(session.data)
        navigate(redirectTo, { replace: true })
      }
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
            <img className="block h-full w-full" src={logo} alt="MedPointe" />
          </div>

          <h2 className="title" id="login-title">
            Sign In
          </h2>
          <p className="subtitle">Enter your credentials to access the dashboard.</p>

          <form onSubmit={handleSubmit}>
            <label className="mx-auto mb-6 flex h-[63px] w-[498px] max-w-[90%] items-center gap-3 rounded-[31.5px] border border-[#9491b6] bg-white px-[18px] max-[1200px]:w-[480px] max-[980px]:mb-5 max-[980px]:w-full max-[980px]:max-w-[520px] max-[640px]:h-14 max-[640px]:px-4 max-[400px]:h-[52px] max-[400px]:gap-2.5 max-[400px]:px-3.5 [@media(max-height:600px)_and_(orientation:landscape)]:mb-4 [@media(max-height:600px)_and_(orientation:landscape)]:h-12">
              <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center text-[#9491b6]">
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
                className="h-10 min-w-0 flex-1 appearance-none border-0 bg-transparent text-xl text-[#425166] outline-0 placeholder:text-[#9491b6] max-[640px]:text-lg max-[400px]:text-base max-[360px]:text-[15px]"
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

            <label className="mx-auto mb-6 flex h-[63px] w-[498px] max-w-[90%] items-center gap-3 rounded-[31.5px] border border-[#9491b6] bg-white px-[18px] max-[1200px]:w-[480px] max-[980px]:mb-5 max-[980px]:w-full max-[980px]:max-w-[520px] max-[640px]:h-14 max-[640px]:px-4 max-[400px]:h-[52px] max-[400px]:gap-2.5 max-[400px]:px-3.5 [@media(max-height:600px)_and_(orientation:landscape)]:mb-4 [@media(max-height:600px)_and_(orientation:landscape)]:h-12">
              <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center text-[#9491b6]">
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
                className="h-10 min-w-0 flex-1 appearance-none border-0 bg-transparent text-xl text-[#425166] outline-0 placeholder:text-[#9491b6] max-[640px]:text-lg max-[400px]:text-base max-[360px]:text-[15px]"
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
                className="cursor-pointer border-0 bg-transparent px-0 py-2 text-base font-semibold text-[#2b66da] max-[400px]:py-1.5 max-[400px]:text-sm"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </label>

            <div className="my-[18px] text-center text-lg italic text-[#9491b6] max-[640px]:my-3.5 max-[640px]:text-base max-[400px]:text-[15px] [@media(max-height:600px)_and_(orientation:landscape)]:my-3 [@media(max-height:600px)_and_(orientation:landscape)]:text-sm">Forgot your password?</div>

            <button className="mx-auto my-6 block h-[63px] w-[498px] max-w-[90%] cursor-pointer rounded-[31.5px] border-0 bg-[#4190f5] text-[22px] font-semibold text-white shadow-[0_10px_18px_rgba(65,144,245,0.25)] disabled:cursor-default disabled:opacity-60 max-[980px]:w-full max-[980px]:max-w-[520px] max-[640px]:h-14 max-[640px]:text-xl max-[400px]:h-[52px] max-[400px]:text-lg [@media(max-height:600px)_and_(orientation:landscape)]:my-4 [@media(max-height:600px)_and_(orientation:landscape)]:h-12" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in' : 'Login'}
            </button>

            <div id="lg-message" className="mx-5 my-4 min-h-[22px] text-center text-[15px] text-[#b91c1c] max-[400px]:text-sm" role="status">
              {error}
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
