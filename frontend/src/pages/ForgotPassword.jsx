import { useState } from 'react'
import axios from 'axios'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

import { API_URL } from '../config/api'
import Button from '../components/ui/Button'
import FormInput from '../components/ui/FormInput'
import SectionCard from '../components/ui/SectionCard'

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
      setError(requestError?.response?.data?.detail || "Couldn't send the link. Try again.")
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
      setSuccess('Password reset successfully. Redirecting to login…')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        navigate('/login', { replace: true, state: { successMessage: 'Password reset successfully. You can log in now.' } })
      }, 2000)
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Reset failed. Try requesting a new link.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-10 font-mono text-white sm:px-6 lg:px-8">
      <SectionCard className="w-full max-w-md shadow-pixel-auth sm:p-8">
        <h1 className="text-balance text-center text-3xl font-black uppercase tracking-normal text-white [text-shadow:3px_3px_0_#8b8b8b]">
          {isResetMode ? 'New password' : 'Reset password'}
        </h1>
        <p className="mt-3 text-center text-sm font-bold text-ss-text">
          {isResetMode
            ? 'Enter your new password below.'
            : "We'll email a reset link to your registered @gmail.com address."}
        </p>

        <form onSubmit={isResetMode ? confirmReset : requestResetLink} className="mt-8 space-y-6">
          <FormInput
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="yourname@gmail.com"
            autoComplete="email"
            disabled={isResetMode}
            required
          />

          {isResetMode ? (
            <>
              <FormInput
                id="newPassword"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter a new password"
                autoComplete="new-password"
                required
              />

              <FormInput
                id="confirmPassword"
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                required
              />
            </>
          ) : null}

          {error ? (
            <p role="alert" aria-live="assertive" className="border-2 border-ss-muted bg-ss-deep px-3 py-2 text-xs font-bold text-white">{error}</p>
          ) : null}
          {success ? (
            <p role="status" aria-live="polite" className="border-2 border-ss-muted bg-ss-deep px-3 py-2 text-xs font-bold text-white">
              {success}
            </p>
          ) : null}

          <Button type="submit" fullWidth disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? (isResetMode ? 'Resetting…' : 'Sending link…') : isResetMode ? 'Reset Password' : 'Send Reset Link'}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm font-black text-white">
          <Link to="/login" className="underline underline-offset-4 hover:text-ss-muted">
            Back to login
          </Link>
        </p>
      </SectionCard>
    </main>
  )
}

export default ForgotPassword
