import api from './api'
import { datos, recurso } from './recurso'

export const trabajadoresApi = {
  ...recurso('/trabajadores'),
  /** `confirmar` autoriza pasar a vacaciones/licencia a quien tiene asignaciones vigentes. */
  cambiarEstado: (id, estado, confirmar = false) =>
    datos(api.patch(`/trabajadores/${id}/estado`, { estado, confirmar })),
}
