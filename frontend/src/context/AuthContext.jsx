import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const TOKEN_KEY = 'seatstalker_token'

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null
    const payload = decodeToken(token)
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    return { token, email: payload.email, id: payload.id }
  })

  const login = (token) => {
    localStorage.setItem(TOKEN_KEY, token)
    const payload = decodeToken(token)
    setUser({ token, email: payload?.email, id: payload?.id })
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('seatstalker_user_email')
    localStorage.removeItem('seatstalker_user_name')
    setUser(null)
  }

  const value = useMemo(() => ({ user, login, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
