import axios from 'axios'

/**
 * Cliente HTTP de SCOPI.
 * El backend (Express + JWT) aún no existe: mientras tanto las páginas
 * usan datos de demostración en src/lib/mockData.js.
 *
 * Cuando esté listo, descomentar el proxy en vite.config.js y quitar el
 * interceptor de token falso de abajo.
 */
const api = axios.create({
  baseURL: '/api',
})

// Interceptor para adjuntar el JWT (RF1 · RNF5)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('scopi_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Respuesta 401 → cerrar sesión
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('scopi_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api