import axios from 'axios'

/**
 * Cliente HTTP de SINCOCO. El proxy de Vite lo enruta al backend Express
 * (ver vite.config.js).
 */
const api = axios.create({
  baseURL: '/api',
})

// Interceptor para adjuntar el JWT (RF1 · RNF5)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sincoco_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 401 en una sesión ya iniciada (token vencido) → cerrar sesión.
// Se excluye /auth/login: ahí un 401 significa credenciales incorrectas y lo
// maneja el formulario; recargar la página borraría el mensaje de error.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const esLogin = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !esLogin) {
      localStorage.removeItem('sincoco_token')
      localStorage.removeItem('sincoco_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api