import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

/**
 * Auth context — frontend-only for now.
 * Cuando exista el backend (RF1), esto se conecta a /api/auth/login
 * con JWT y los roles se resuelven desde el token (RNF5 · RBAC).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('scopi_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('scopi_user')
      }
    }
    setLoading(false)
  }, [])

  const login = (email) => {
    const mockUser = {
      id: 1,
      name: 'Administrador',
      email,
      role: 'admin', // roles: admin · ingeniero · maestro · compras
    }
    localStorage.setItem('scopi_user', JSON.stringify(mockUser))
    setUser(mockUser)
  }

  const logout = () => {
    localStorage.removeItem('scopi_user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}