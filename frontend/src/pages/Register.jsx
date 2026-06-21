import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

import { API_URL } from '../config/api'

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
    const isUmdEmail = normalizedEmail.endsWith('@gmail.com')
    if (!isUmdEmail) {
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
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 font-mono text-white sm:px-6 lg:px-8">
      <div className="w-full max-w-md border-4 border-[#8a8a8a] bg-[#171717] p-6 shadow-[10px_10px_0_#606060,-8px_-8px_0_#2d2d2d] sm:p-8">
        <h1 className="text-center text-3xl font-black uppercase tracking-normal text-white [text-shadow:3px_3px_0_#8b8b8b]">
          {step === 'verify' ? 'Verify email' : 'Sign up'}
        </h1>
        <p className="mt-3 text-center text-sm font-bold text-[#d8d8d8]">
          {step === 'verify'
            ? 'Enter the 6-digit verification code sent to your UMD email.'
            : 'Use your UMD email to start tracking sections.'}
        </p>

        <form onSubmit={step === 'verify' ? handleVerifyAndRegister : handleSendOtp} className="mt-8 space-y-6">
          {step === 'input' ? (
            <>
              <div>
                <label htmlFor="name" className="block text-lg font-black text-white">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#9f9f9f] focus:border-white focus:ring-4 focus:ring-white/20"
                  placeholder="Terp Student"
                  required
                />
              </div>

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
                  className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#9f9f9f] focus:border-white focus:ring-4 focus:ring-white/20"
                  placeholder="yourname@gmail.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-lg font-black text-white">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#9f9f9f] focus:border-white focus:ring-4 focus:ring-white/20"
                  placeholder="Enter password"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-lg font-black text-white">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#9f9f9f] focus:border-white focus:ring-4 focus:ring-white/20"
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="otp" className="block text-lg font-black text-white">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="mt-3 w-full border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#9f9f9f] focus:border-white focus:ring-4 focus:ring-white/20"
                  placeholder="Enter the 6-digit code"
                  inputMode="numeric"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-sm font-black text-white underline underline-offset-4 hover:text-[#bfbfbf]"
              >
                Back to registration details
              </button>
            </>
          )}

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
            {isLoading
              ? 'Please wait...'
              : step === 'verify'
                ? 'Verify & Register'
                : 'Send Verification Code'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm font-black text-white">
          Already have an account?{' '}
          <Link to="/login" className="underline underline-offset-4 hover:text-[#bfbfbf]">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Register
