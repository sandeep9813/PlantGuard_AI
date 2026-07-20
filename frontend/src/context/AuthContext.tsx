import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react'
import { api, type UserInfo } from '../services/api'

const TOKEN_KEY = 'plantguard_token'
const SESSION_KEY = 'plantguard_session'

interface AuthUser {
  name: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      api.getMe()
        .then((info: UserInfo) => {
          const session = { name: info.name, email: info.email }
          localStorage.setItem(SESSION_KEY, JSON.stringify(session))
          setUser(session)
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(SESSION_KEY)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const result = await api.login(email, password)
      localStorage.setItem(TOKEN_KEY, result.token)
      const session = { name: result.user.name, email: result.user.email }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      setUser(session)
      return { ok: true }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Login failed'
      return { ok: false, message: msg }
    }
  }

  const signup = async (name: string, email: string, password: string) => {
    try {
      const result = await api.signup(name, email, password)
      localStorage.setItem(TOKEN_KEY, result.token)
      const session = { name: result.user.name, email: result.user.email }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      setUser(session)
      return { ok: true }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Signup failed'
      return { ok: false, message: msg }
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, login, signup, logout,
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
