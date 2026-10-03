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

  // Sesión única por cuenta: mientras la aplicación esté abierta se envía un
  // latido para que el servidor no dé la sesión por abandonada (y así otro
  // dispositivo no pueda ingresar). Si el navegador se cierra sin salir, la
  // cuenta se libera sola tras unos minutos sin actividad.
  useEffect(() => {
    if (!user) return undefined
    const latido = () => api.get('/auth/sesion').catch(() => {})
    const intervalo = setInterval(latido, 4 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [user])

  /**
   * Cierra la sesión en el servidor y en el navegador. El servidor invalida el
   * token (sesión única por cuenta), así que no queda utilizable si alguien lo
   * hubiera copiado; si la petición falla, igual se limpia el navegador.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Una sesión ya cerrada (o vencida) no debe impedir salir.
    }
    localStorage.removeItem('sincoco_token')
    localStorage.removeItem('sincoco_user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
