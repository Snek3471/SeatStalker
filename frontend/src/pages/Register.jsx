import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

import { API_URL } from '../config/api'
import Button from '../components/ui/Button'
import FormInput from '../components/ui/FormInput'
import SectionCard from '../components/ui/SectionCard'

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('input') // 'input' or 'verify'
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()

  const handleSendOtp = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()
    const isGmailEmail = normalizedEmail.endsWith('@gmail.com')
    if (!isGmailEmail) {
      setError('Please use a valid @gmail.com email address.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      await axios.post(`${API_URL}/auth/register/send-otp`, {
        email: normalizedEmail,
      })
      setStep('verify')
      setSuccess('A verification code has been sent to your email. (Remember to check your spam folder too!)')
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Couldn't send the code. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyAndRegister = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()

    setIsLoading(true)

    try {
      await axios.post(`${API_URL}/auth/register`, {
        name: name.trim() || null,
        email: normalizedEmail,
        password,
        otp: otp.trim(),
      })

      navigate('/login', {
        replace: true,
        state: { successMessage: 'Account created successfully. Please log in.' },
      })
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Wrong code or it expired. Hit ← Back and request a new one.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-10 font-mono text-white sm:px-6 lg:px-8">
      <SectionCard className="w-full max-w-md shadow-pixel-auth sm:p-8">
        <h1 className="text-balance text-center text-3xl font-black uppercase tracking-normal text-white [text-shadow:3px_3px_0_#8b8b8b]">
          {step === 'verify' ? 'Verify email' : 'Sign up'}
        </h1>
        <p className="mt-3 text-center text-sm font-bold text-ss-text">
          {step === 'verify'
            ? 'Enter the 6-digit verification code sent to your email.'
            : 'Beat the add/drop rush.'}
        </p>

        <form onSubmit={step === 'verify' ? handleVerifyAndRegister : handleSendOtp} className="mt-8 space-y-6">
          {step === 'input' ? (
            <>
              <FormInput
                id="name"
                label="Full Name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Terp Student"
                autoComplete="name"
                required
              />

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
              <p className="text-xs font-bold text-ss-border">
                Your email is only used to send seat alerts. Never shared.
              </p>

              <FormInput
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
                required
              />

              <FormInput
                id="confirmPassword"
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
              />

              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ss-text">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) => setShowPassword(event.target.checked)}
                  className="h-4 w-4 accent-white"
                />
                Show password
              </label>
            </>
          ) : (
            <>
              <FormInput
                id="otp"
                label="Verification Code"
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Enter the 6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
              <button
                type="button"
                onClick={() => setStep('input')}
                className="rounded text-sm font-black text-white underline underline-offset-4 hover:text-ss-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                ← Back
              </button>
            </>
          )}

          {error ? (
            <p role="alert" aria-live="assertive" className="border-2 border-ss-muted bg-ss-deep px-3 py-2 text-xs font-bold text-white">{error}</p>
          ) : null}
          {success ? (
            <p role="status" aria-live="polite" className="border-2 border-ss-muted bg-ss-deep px-3 py-2 text-xs font-bold text-white">
              {success}
            </p>
          ) : null}

          <Button type="submit" fullWidth disabled={isLoading} aria-busy={isLoading}>
            {isLoading
              ? (step === 'verify' ? 'Creating account…' : 'Sending code…')
              : step === 'verify'
                ? 'Verify & Register'
                : 'Send Verification Code'}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm font-black text-white">
          Already have an account?{' '}
          <Link to="/login" className="underline underline-offset-4 hover:text-ss-muted">
            Log in
          </Link>
        </p>
      </SectionCard>
    </main>
  )
}

export default Register
