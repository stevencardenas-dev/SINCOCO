import api from './api'
import { datos } from './recurso'

/** Bitácora de trazabilidad, paginada en el backend. */
export const auditoriaApi = {
  listar: (params) => datos(api.get('/auditoria', { params })),
}
