import { useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL
const USER_NAME_STORAGE_KEY = 'seatstalker_user_name'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

      login(normalizedEmail)
      localStorage.setItem(USER_NAME_STORAGE_KEY, response.data?.name || '')
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        setError('Wrong email or password.')
      } else {
        setError(requestError?.response?.data?.detail || 'Unable to log in. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#E03a3e] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/30 bg-white p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-[#E03a3e]">Welcome Back</h1>
        <p className="mt-2 text-sm text-slate-700">Log in with your UMD account to access your dashboard.</p>

        {successMessage ? (
          <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">
              UMD Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#E03a3e]/25 focus:ring"
              placeholder="yourname@umd.edu"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#E03a3e]/25 focus:ring"
              placeholder="Enter your password"
              required
            />
          </div>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-[#E03a3e] px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-700">
          New user?{' '}
          <Link to="/register" className="font-semibold text-[#E03a3e] underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Login
