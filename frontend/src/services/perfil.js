import api from './api'
import { datos } from './recurso'

/** Información personal y contraseña del usuario que inició sesión. */
export const perfilApi = {
  obtener: () => datos(api.get('/perfil')),
  actualizar: (cuerpo) => datos(api.patch('/perfil', cuerpo)),
}
