import api from './api'
import { datos, recurso } from './recurso'

export const actividadesApi = {
  ...recurso('/actividades'),
  /** Pendiente → en curso. */
  iniciar: (id) => datos(api.patch(`/actividades/${id}/iniciar`)),
  /** En curso → finalizada. */
  finalizar: (id) => datos(api.patch(`/actividades/${id}/finalizar`)),
}
