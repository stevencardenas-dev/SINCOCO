import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

/**
 * Auth context — HU-01 / RF01.
 * Autentica contra POST /api/auth/login; el rol viaja en el JWT y es la base
 * del control de acceso por rol en la interfaz (RNF05 · RBAC).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('sincoco_user')
    const token = localStorage.getItem('sincoco_token')
    if (stored && token) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('sincoco_user')
        localStorage.removeItem('sincoco_token')
      }
    }
    setLoading(false)
  }, [])

  /**
   * @returns {Promise<{ok: true} | {ok: false, error: string}>}
   */
  const login = async (username, password) => {
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('sincoco_token', data.token)
      localStorage.setItem('sincoco_user', JSON.stringify(data.user))
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.response?.data?.error ?? 'No se pudo conectar con el servidor' }
    }
  }

  const logout = () => {
    localStorage.removeItem('sincoco_token')
    localStorage.removeItem('sincoco_user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
