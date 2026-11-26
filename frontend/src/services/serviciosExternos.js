import api from './api'
import { datos, sinVacios } from './recurso'

/** HU-28 y HU-32: servicios externos contratados y su autorización por sobrecosto. */
export const serviciosExternosApi = {
  listar: (filtros) => datos(api.get('/servicios-externos', { params: sinVacios(filtros) })),
  /** Si el valor excede el presupuesto de la actividad, queda pendiente de autorización (HU-32). */
  crear: (cuerpo) => datos(api.post('/servicios-externos', cuerpo)),
  autorizar: (id, cuerpo) => datos(api.patch(`/servicios-externos/${id}/autorizar`, cuerpo)),
  rechazar: (id, cuerpo) => datos(api.patch(`/servicios-externos/${id}/rechazar`, cuerpo)),
  reajustar: (id, cuerpo) => datos(api.patch(`/servicios-externos/${id}/valor`, cuerpo)),
}

/** HU-13: catálogo de proveedores, para elegir a quién se contrata el servicio. */
export const proveedoresApi = {
  listar: () => datos(api.get('/proveedores')),
}
