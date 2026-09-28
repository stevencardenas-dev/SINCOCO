import axios from 'axios'

/**
 * Cliente HTTP de SINCOCO.
 *
 * La ruta relativa `/api` funciona en los dos entornos: en desarrollo porque
 * Vite la reenvía al backend Express (ver vite.config.js) y en producción
 * porque CloudFront sirve el API en el mismo origen (comportamiento `/api/*`
 * apuntando a la EC2). VITE_API_URL está disponible por si algún día el API
 * vive en otro dominio, pero no hace falta definirla en el despliegue actual.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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