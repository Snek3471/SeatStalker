import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    const isUmdEmail =
      normalizedEmail.endsWith('@umd.edu') || normalizedEmail.endsWith('@terpmail.umd.edu')
    if (!isUmdEmail) {
      setError('Please use a valid @umd.edu or @terpmail.umd.edu email address.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      await axios.post(`${API_URL}/auth/register`, {
        name: name.trim() || null,
        email: normalizedEmail,
        password,
      })

      navigate('/login', {
        replace: true,
        state: { successMessage: 'Account created successfully. Please log in.' },
      })
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#E03a3e] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/30 bg-white p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-[#E03a3e]">Create Your SeatStalker Account</h1>
        <p className="mt-2 text-sm text-slate-700">Use your UMD email to start tracking sections.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-semibold text-slate-700">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#E03a3e]/25 focus:ring"
              placeholder="Terp Student"
              required
            />
          </div>

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
              placeholder="Enter password"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold text-slate-700">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#E03a3e]/25 focus:ring"
              placeholder="Re-enter password"
              required
            />
          </div>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-[#E03a3e] px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-700">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#E03a3e] underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Register
