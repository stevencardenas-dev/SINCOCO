import api from './api'
import { datos, recurso } from './recurso'

export const actividadesApi = {
  ...recurso('/actividades'),
  /** Pendiente → en curso. */
  iniciar: (id) => datos(api.patch(`/actividades/${id}/iniciar`)),
  /** En curso → finalizada. */
  finalizar: (id) => datos(api.patch(`/actividades/${id}/finalizar`)),
  /** HU-21: nuevo porcentaje de avance (devuelve también el avance de la etapa y del proyecto). */
  registrarAvance: (id, cuerpo) => datos(api.post(`/actividades/${id}/avance`, cuerpo)),
  /** HU-21: historial de avance (porcentaje anterior y nuevo, quién y cuándo). */
  historialAvance: (id) => datos(api.get(`/actividades/${id}/avance`)),
  /** HU-34: nuevas fechas y motivo. */
  reprogramar: (id, cuerpo) => datos(api.patch(`/actividades/${id}/reprogramar`, cuerpo)),
  /** HU-34: historial de reprogramaciones de la actividad. */
  historial: (id) => datos(api.get(`/actividades/${id}/reprogramaciones`)),
}
