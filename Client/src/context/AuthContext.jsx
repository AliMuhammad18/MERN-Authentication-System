import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth.js'

const AuthContext = createContext(null)

const REFRESH_INTERVAL_MS = 14 * 60 * 1000 // 14 minutes (Access token expires in 15m)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadUser() {
    try {
      const data = await authApi.me()
      setUser(data.user)
      return data.user
    } catch {
      try {
        await authApi.refresh()
        const data = await authApi.me()
        setUser(data.user)
        return data.user
      } catch {
        setUser(null)
        return null
      }
    }
  }

  useEffect(() => {
    loadUser().finally(() => setLoading(false))
  }, [])

  // Proactive silent refresh timer & tab visibility check
  useEffect(() => {
    if (!user) return

    const intervalId = setInterval(async () => {
      try {
        await authApi.refresh()
      } catch {
        setUser(null)
      }
    }, REFRESH_INTERVAL_MS)

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await authApi.me()
        } catch {
          try {
            await authApi.refresh()
          } catch {
            setUser(null)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  async function sendSignupOtp(email) {
    return authApi.sendSignupOtp({ email })
  }

  async function verifySignupOtp(otp) {
    return authApi.verifySignupOtp({ otp })
  }

  async function finishSignup(form) {
    await authApi.finishSignup(form)
    return loadUser()
  }

  async function login(form) {
    const data = await authApi.login(form)
    if (data.message === '2FA is required') {
      return { requires2fa: true }
    }
    const nextUser = await loadUser()
    return { requires2fa: false, user: nextUser }
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  async function complete2fa() {
    return loadUser()
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, sendSignupOtp, verifySignupOtp, finishSignup, login, logout, complete2fa, loadUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
