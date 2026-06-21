import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

import { API_URL } from '../config/api'

function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail.endsWith('@gmail.com')) {
      setError('Please use a valid @gmail.com email address.')
      return
    }

    setIsLoading(true)

    try {
      await axios.post(`${API_URL}/users`, {
        email: normalizedEmail,
        name: name.trim() || null,
      })
      navigate('/login')
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Failed to register user.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto mt-20 max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
        <p className="mt-2 text-sm text-slate-600">Register to start watching course sections.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            placeholder="Jane Doe"
          />

          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            placeholder="example@gmail.com"
            required
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-semibold text-sky-700">Log in</Link>
        </p>
      </div>
    </main>
  )
}

export default RegisterPage
