import api from './api'
import { datos, sinVacios } from './recurso'

/** Indicadores del panel principal. */
export const dashboardApi = {
  obtener: () => datos(api.get('/dashboard')),
  /** HU-16: indicadores gerenciales filtrables por proyecto, estado y fechas. */
  indicadores: (filtros) => datos(api.get('/dashboard/indicadores', { params: sinVacios(filtros) })),
}
