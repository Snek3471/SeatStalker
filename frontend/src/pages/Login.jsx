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

      login(response.data?.access_token)
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
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 font-mono text-white sm:px-6 lg:px-8">
      <div className="w-full max-w-md border-4 border-[#8a8a8a] bg-[#171717] p-6 shadow-[10px_10px_0_#606060,-8px_-8px_0_#2d2d2d] sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-black uppercase tracking-normal text-white [text-shadow:3px_3px_0_#8b8b8b]">
            Welcome back
          </h1>
          <p className="mt-3 text-sm font-bold text-[#d8d8d8]">Login with your UMD account</p>
        </div>

        {successMessage ? (
          <p className="mt-5 border-2 border-[#bfbfbf] bg-[#101010] px-3 py-2 text-xs font-bold text-white">
            {successMessage}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-lg font-black text-white">
              Email
            </label>
            <p className="mt-1 text-xs font-bold text-[#bfbfbf]">your @umd.edu</p>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#9f9f9f] focus:border-white focus:ring-4 focus:ring-white/20"
              placeholder="yourname@umd.edu"
              required
            />
          </div>

          <div>
            <div className="flex items-center gap-4">
              <label htmlFor="password" className="block text-lg font-black text-white">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="ml-auto text-xs font-black text-white underline underline-offset-4 hover:text-[#bfbfbf]"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none focus:border-white focus:ring-4 focus:ring-white/20"
              required
            />
          </div>

          {error ? (
            <p className="border-2 border-[#bfbfbf] bg-[#101010] px-3 py-2 text-xs font-bold text-white">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full border-4 border-[#f5f5f5] bg-white px-4 py-3 text-base font-black text-[#111111] shadow-[6px_6px_0_#8f8f8f] transition hover:-translate-y-0.5 hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm font-black text-white">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="underline underline-offset-4 hover:text-[#bfbfbf]">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Login
