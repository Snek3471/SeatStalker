import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'seatstalker_user_email'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedEmail = localStorage.getItem(STORAGE_KEY)
    return storedEmail ? { email: storedEmail } : null
  })

  const login = (email) => {
    const normalizedEmail = email.trim().toLowerCase()
    localStorage.setItem(STORAGE_KEY, normalizedEmail)
    setUser({ email: normalizedEmail })
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const value = useMemo(() => ({ user, login, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
