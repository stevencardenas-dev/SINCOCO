import api from './api'
import { datos, sinVacios } from './recurso'

export const alertasApi = {
  listar: (filtros) => datos(api.get('/alertas', { params: sinVacios(filtros) })),
  atender: (id) => datos(api.patch(`/alertas/${id}/atender`)),
}
