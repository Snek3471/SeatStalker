import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL

function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await axios.get(`${API_URL}/watchlist/${encodeURIComponent(email.trim().toLowerCase())}`)
      login(email)
      navigate('/dashboard')
    } catch (requestError) {
      setError('Could not log in with that email. Please register first.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto mt-20 max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">SeatStalker Login</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your email to access your watchlist dashboard.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            placeholder="you@example.com"
            required
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          New here? <Link to="/register" className="font-semibold text-sky-700">Create an account</Link>
        </p>
      </div>
    </main>
  )
}

export default LoginPage
