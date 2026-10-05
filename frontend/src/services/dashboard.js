import api from './api'
import { datos } from './recurso'

/** Indicadores del panel principal. */
export const dashboardApi = {
  obtener: () => datos(api.get('/dashboard')),
}
