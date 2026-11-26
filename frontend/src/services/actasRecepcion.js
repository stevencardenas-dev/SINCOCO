import api from './api'
import { datos, sinVacios } from './recurso'

/** HU-40: actas de recepción de materiales en obra. */
export const actasRecepcionApi = {
  listar: (filtros) => datos(api.get('/actas-recepcion', { params: sinVacios(filtros) })),
  obtener: (id) => datos(api.get(`/actas-recepcion/${id}`)),
  firmar: (id, cuerpo) => datos(api.post(`/actas-recepcion/${id}/firmar`, cuerpo)),
}
