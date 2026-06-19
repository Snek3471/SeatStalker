import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    const isUmdEmail = normalizedEmail.endsWith('@umd.edu')
    if (!isUmdEmail) {
      setError('Please use a valid @umd.edu email address.')
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
      setSuccess('A verification code has been sent to your UMD email. (Remember to check your spam folder too!)')
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Failed to send verification code. Please try again.')
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
      setError(requestError?.response?.data?.detail || 'Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#E03a3e] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/30 bg-white p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-[#E03a3e]">Create Your SeatStalker Account</h1>
        <p className="mt-2 text-sm text-slate-700">
          {step === 'verify'
            ? 'Enter the 6-digit verification code sent to your UMD email.'
            : 'Use your UMD email to start tracking sections.'}
        </p>

        <form onSubmit={step === 'verify' ? handleVerifyAndRegister : handleSendOtp} className="mt-6 space-y-4">
          {step === 'input' ? (
            <>
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
                  placeholder="example@umd.edu"
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
            </>
          ) : (
            <>
              <div>
                <label htmlFor="otp" className="mb-1 block text-sm font-semibold text-slate-700">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-[#E03a3e]/25 focus:ring"
                  placeholder="Enter the 6-digit code"
                  inputMode="numeric"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-sm font-semibold text-[#E03a3e] hover:underline animate-fade-in"
              >
                ← Back to registration details
              </button>
            </>
          )}

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 animate-pulse">{error}</p> : null}
          {success ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-[#E03a3e] px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? 'Please wait...'
              : step === 'verify'
                ? 'Verify & Register'
                : 'Send Verification Code'}
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
