import api from './api'
import { datos, recurso } from './recurso'

export const asignacionesApi = {
  ...recurso('/asignaciones'),
  // HU-31: fecha fin original y extensiones de una asignación; prórroga de la fecha fin.
  historial: (id) => datos(api.get(`/asignaciones/${id}/historial`)),
  extender: (id, cuerpo) => datos(api.post(`/asignaciones/${id}/extender`, cuerpo)),
}
