import { useState } from 'react'
import axios from 'axios'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

import { API_URL } from '../config/api'

function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tokenParam = searchParams.get('token')
  const emailParam = searchParams.get('email')

  const [email, setEmail] = useState(emailParam || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isResetMode = !!(tokenParam && emailParam)

  const requestResetLink = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail.endsWith('@gmail.com')) {
      setError('Please use your @gmail.com email address.')
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
    if (!normalizedEmail.endsWith('@gmail.com')) {
      setError('Please use your @gmail.com email address.')
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
    <main className="flex min-h-screen items-center justify-center bg-black/60 px-4 py-10 font-mono text-white sm:px-6 lg:px-8">
      <div className="w-full max-w-md border-4 border-[#8a8a8a] bg-[#171717] p-6 shadow-[10px_10px_0_#606060,-8px_-8px_0_#2d2d2d] sm:p-8">
        <h1 className="text-center text-3xl font-black uppercase tracking-normal text-white [text-shadow:3px_3px_0_#8b8b8b]">
          {isResetMode ? 'New password' : 'Reset password'}
        </h1>
        <p className="mt-3 text-center text-sm font-bold text-[#d8d8d8]">
          {isResetMode
            ? 'Enter your new password below.'
            : "We'll email a reset link to your registered @gmail.com address."}
        </p>

        <form onSubmit={isResetMode ? confirmReset : requestResetLink} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-lg font-black text-white">
              Email
            </label>
            <p className="mt-1 text-xs font-bold text-[#bfbfbf]">your @gmail.com</p>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isResetMode}
              className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#9f9f9f] focus:border-white focus:ring-4 focus:ring-white/20 disabled:bg-[#2b2b2b] disabled:text-[#bfbfbf]"
              placeholder="yourname@gmail.com"
              required
            />
          </div>

          {isResetMode ? (
            <>
              <div>
                <label htmlFor="newPassword" className="block text-lg font-black text-white">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#9f9f9f] focus:border-white focus:ring-4 focus:ring-white/20"
                  placeholder="Enter a new password"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-lg font-black text-white">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#9f9f9f] focus:border-white focus:ring-4 focus:ring-white/20"
                  placeholder="Re-enter your new password"
                  required
                />
              </div>
            </>
          ) : null}

          {error ? (
            <p className="border-2 border-[#bfbfbf] bg-[#101010] px-3 py-2 text-xs font-bold text-white">{error}</p>
          ) : null}
          {success ? (
            <p className="border-2 border-[#bfbfbf] bg-[#101010] px-3 py-2 text-xs font-bold text-white">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full border-4 border-[#f5f5f5] bg-white px-4 py-3 text-base font-black text-[#111111] shadow-[6px_6px_0_#8f8f8f] transition hover:-translate-y-0.5 hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Processing...' : isResetMode ? 'Reset Password' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm font-black text-white">
          <Link to="/login" className="underline underline-offset-4 hover:text-[#bfbfbf]">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  )
}

export default ForgotPassword
