import { createContext, useContext, useState, useCallback } from 'react'
import backend from '../api/backend'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [donor, setDonor] = useState(() => {
    try {
      const stored = localStorage.getItem('plasmiq_donor')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (email, password) => {
    const { data } = await backend.post('/api/auth/login', { email, password })
    localStorage.setItem('plasmiq_token', data.access_token)
    localStorage.setItem('plasmiq_donor', JSON.stringify(data.donor))
    setDonor(data.donor)
    return data.donor
  }, [])

  const register = useCallback(async (formData) => {
    const { data } = await backend.post('/api/auth/register', formData)
    localStorage.setItem('plasmiq_token', data.access_token)
    localStorage.setItem('plasmiq_donor', JSON.stringify(data.donor))
    setDonor(data.donor)
    return data.donor
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('plasmiq_token')
    localStorage.removeItem('plasmiq_donor')
    setDonor(null)
  }, [])

  const refreshDonor = useCallback(async () => {
    try {
      const { data } = await backend.get('/api/donors/me')
      localStorage.setItem('plasmiq_donor', JSON.stringify(data))
      setDonor(data)
      return data
    } catch {
      return null
    }
  }, [])

  return (
    <AuthContext.Provider value={{ donor, login, register, logout, refreshDonor }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
