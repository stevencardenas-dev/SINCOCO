import api from './api'
import { datos, sinVacios } from './recurso'

const ruta = '/solicitudes-materiales'

export const solicitudesMaterialesApi = {
  listar: (filtros) => datos(api.get(ruta, { params: sinVacios(filtros) })),
  crear: (cuerpo) => datos(api.post(ruta, cuerpo)),
  aprobar: (id, cuerpo) => datos(api.patch(`${ruta}/${id}/aprobar`, cuerpo)),
  rechazar: (id, observaciones) => datos(api.patch(`${ruta}/${id}/rechazar`, { observaciones })),
  despachar: (id, cuerpo) => datos(api.patch(`${ruta}/${id}/despachar`, cuerpo)),
  cancelar: (id) => datos(api.patch(`${ruta}/${id}/cancelar`)),
}
