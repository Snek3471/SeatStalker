import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL

function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tokenParam = searchParams.get('token')
  const emailParam = searchParams.get('email')

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Determine if we are in reset mode based on URL parameters
  const isResetMode = !!(tokenParam && emailParam)

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [emailParam])

  const requestResetLink = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail.endsWith('@umd.edu')) {
      setError('Please use your @umd.edu email address.')
      return
    }

    setIsLoading(true)
    try {
      await axios.post(`${API_URL}/auth/password-reset/request`, {
        email: normalizedEmail,
      })
      setSuccess('If that email exists in our directory, a reset link has been sent. (Remember to check your spam folder too!)')
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Could not start password reset.')
    } finally {
      setIsLoading(false)
    }
  }

  const confirmReset = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail.endsWith('@umd.edu')) {
      setError('Please use your @umd.edu email address.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      await axios.post(`${API_URL}/auth/password-reset/confirm`, {
        email: normalizedEmail,
        otp: tokenParam.trim(),
        new_password: newPassword,
      })
      setSuccess('Password reset successfully. Redirecting to login...')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        navigate('/login', { replace: true, state: { successMessage: 'Password reset successfully. You can log in now.' } })
      }, 2000)
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Could not reset password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#E03a3e] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/30 bg-white p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-[#E03a3e]">
          {isResetMode ? 'Set New Password' : 'Reset Your Password'}
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          {isResetMode
            ? 'Enter your new password below.'
            : 'We’ll email a reset link to your registered @umd.edu address.'}
        </p>

        <form onSubmit={isResetMode ? confirmReset : requestResetLink} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">
              UMD Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isResetMode}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#E03a3e]/25 focus:ring disabled:bg-slate-100 disabled:text-slate-500"
              placeholder="example@umd.edu"
              required
            />
          </div>

          {isResetMode ? (
            <>
              <div>
                <label htmlFor="newPassword" className="mb-1 block text-sm font-semibold text-slate-700">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#E03a3e]/25 focus:ring"
                  placeholder="Enter a new password"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold text-slate-700">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#E03a3e]/25 focus:ring"
                  placeholder="Re-enter your new password"
                  required
                />
              </div>
            </>
          ) : null}

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-[#E03a3e] px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Processing...' : isResetMode ? 'Reset Password' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-700">
          <Link to="/login" className="font-semibold text-[#E03a3e] underline-offset-4 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  )
}

export default ForgotPassword