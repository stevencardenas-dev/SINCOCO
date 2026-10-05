import api from './api'
import { datos, recurso } from './recurso'

export const trabajadoresApi = {
  ...recurso('/trabajadores'),
  cambiarEstado: (id, estado) => datos(api.patch(`/trabajadores/${id}/estado`, { estado })),
}
