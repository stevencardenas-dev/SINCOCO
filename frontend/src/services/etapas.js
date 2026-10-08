import api from './api'
import { datos, recurso } from './recurso'

export const etapasApi = {
  ...recurso('/etapas'),
  /** HU-34: nuevas fechas y motivo; recalcula las etapas posteriores. */
  reprogramar: (id, cuerpo) => datos(api.patch(`/etapas/${id}/reprogramar`, cuerpo)),
  /** HU-34: historial de reprogramaciones de la etapa. */
  historial: (id) => datos(api.get(`/etapas/${id}/reprogramaciones`)),
}
