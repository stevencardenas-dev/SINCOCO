import api from './api'
import { datos } from './recurso'

export const notificacionesApi = {
  listar: ({ soloNoLeidas = false } = {}) => datos(api.get('/notificaciones', { params: soloNoLeidas ? { leida: 0 } : {} })),
  marcarLeida: (id) => datos(api.patch(`/notificaciones/${id}/leida`)),
}
