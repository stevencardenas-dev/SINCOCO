import api from './api'
import { datos, sinVacios } from './recurso'

const ruta = '/solicitudes-herramientas'

export const solicitudesHerramientasApi = {
  listar: (filtros) => datos(api.get(ruta, { params: sinVacios(filtros) })),
  crear: (cuerpo) => datos(api.post(ruta, cuerpo)),
  aprobar: (id) => datos(api.patch(`${ruta}/${id}/aprobar`)),
  rechazar: (id, observaciones) => datos(api.patch(`${ruta}/${id}/rechazar`, { observaciones })),
  atender: (id) => datos(api.patch(`${ruta}/${id}/atender`)),
  cancelar: (id) => datos(api.patch(`${ruta}/${id}/cancelar`)),
}
