import { useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config/api'
import Button from '../components/ui/Button'
import FormInput from '../components/ui/FormInput'
import SectionCard from '../components/ui/SectionCard'

const USER_NAME_STORAGE_KEY = 'seatstalker_user_name'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.successMessage

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    const normalizedEmail = email.trim().toLowerCase()

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: normalizedEmail,
        password,
      })

      login(response.data?.access_token)
      localStorage.setItem(USER_NAME_STORAGE_KEY, response.data?.name || '')
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        setError('Wrong email or password.')
      } else {
        setError(requestError?.response?.data?.detail || 'Login failed. Check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <SectionCard className="w-full max-w-md shadow-pixel-auth sm:p-8">
        <div className="text-center">
          <h1 className="pf-h2 text-balance uppercase text-white [text-shadow:3px_3px_0_#606060]">
            Welcome back
          </h1>
          <p className="mt-4 pf-body-sm text-ss-text">Back on watch.</p>
        </div>

        {successMessage ? (
          <p role="status" aria-live="polite" className="mt-6 border-4 border-ss-rule bg-ss-deep px-3 py-3 pf-body-sm text-white shadow-pixel-sm">
            [ OK ] {successMessage}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <FormInput
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="yourname@gmail.com"
            autoComplete="email"
            required
          />

          <div>
            <div className="flex items-center gap-4">
              <label htmlFor="password" className="block pf-label uppercase text-white">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="ml-auto pf-label uppercase text-white underline underline-offset-4 hover:text-ss-muted"
              >
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full border-4 border-ss-rule bg-ss-inset px-4 py-3 text-[16px] text-white shadow-pixel-md outline-none placeholder:text-ss-subtle focus:border-white focus:shadow-pixel-white focus:ring-4 focus:ring-white/25"
              required
            />
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 border-2 border-ss-rule bg-ss-inset px-3 py-2 pf-label uppercase text-ss-text hover:border-white">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                className="h-3.5 w-3.5 appearance-none border-2 border-ss-rule bg-ss-deep checked:border-white checked:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              />
              Show password
            </label>
          </div>

          {error ? (
            <p role="alert" aria-live="assertive" className="border-4 border-white bg-ss-deep px-3 py-3 pf-body-sm text-white shadow-pixel-sm">
              [ ERR ] {error}
            </p>
          ) : null}

          <Button type="submit" fullWidth disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <p className="mt-8 text-center pf-body-sm text-white">
          No account?{' '}
          <Link to="/register" className="underline underline-offset-4 hover:text-ss-muted">
            Sign up
          </Link>
        </p>
      </SectionCard>
    </main>
  )
}

export default Login
