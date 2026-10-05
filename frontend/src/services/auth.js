import api from './api'
import { datos } from './recurso'

/** Sesión y recuperación de contraseña (HU-01 · RF1). */
export const authApi = {
  login: (username, password) => datos(api.post('/auth/login', { username, password })),
  logout: () => datos(api.post('/auth/logout')),
  /** Latido que mantiene viva la sesión única. */
  sesion: () => datos(api.get('/auth/sesion')),
  permisos: () => datos(api.get('/auth/permisos')),
  solicitarReset: (usuario) => datos(api.post('/auth/solicitar-reset', { usuario })),
  restablecer: (cuerpo) => datos(api.post('/auth/restablecer', cuerpo)),
}
