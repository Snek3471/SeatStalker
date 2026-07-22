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

    const passwordErrors = []
    if (password.length < 8) passwordErrors.push('at least 8 characters')
    if (!/\d/.test(password)) passwordErrors.push('at least one number')
    if (!/[a-zA-Z]/.test(password)) passwordErrors.push('at least one letter')
    if (passwordErrors.length > 0) {
      setError(`Password must have: ${passwordErrors.join(', ')}.`)
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
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <SectionCard className="w-full max-w-md shadow-pixel-auth sm:p-8">
        <h1 className="pf-h2 text-balance text-center uppercase text-white [text-shadow:3px_3px_0_#606060]">
          {step === 'verify' ? 'Verify email' : 'Sign up'}
        </h1>
        <p className="mt-4 text-center pf-body-sm text-ss-text">
          {step === 'verify'
            ? 'Enter the 6-digit code sent to your email.'
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
              <p className="pf-tiny text-ss-border">
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

              <label className="inline-flex cursor-pointer items-center gap-2 border-2 border-ss-rule bg-ss-inset px-3 py-2 pf-label uppercase text-ss-text hover:border-white">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) => setShowPassword(event.target.checked)}
                  className="h-3.5 w-3.5 appearance-none border-2 border-ss-rule bg-ss-deep checked:border-white checked:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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
                className="pf-label uppercase text-white underline underline-offset-4 hover:text-ss-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                ← Back
              </button>
            </>
          )}

          {error ? (
            <p role="alert" aria-live="assertive" className="border-4 border-white bg-ss-deep px-3 py-3 pf-body-sm text-white shadow-pixel-sm">[ ERR ] {error}</p>
          ) : null}
          {success ? (
            <p role="status" aria-live="polite" className="border-4 border-ss-rule bg-ss-deep px-3 py-3 pf-body-sm text-white shadow-pixel-sm">
              [ OK ] {success}
            </p>
          ) : null}

          <Button type="submit" fullWidth disabled={isLoading} aria-busy={isLoading}>
            {isLoading
              ? (step === 'verify' ? 'Creating…' : 'Sending…')
              : step === 'verify'
                ? 'Verify & Register'
                : 'Send Code'}
          </Button>
        </form>

        <p className="mt-8 text-center pf-body-sm text-white">
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
