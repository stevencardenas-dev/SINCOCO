import api from './api'
import { datos, sinVacios } from './recurso'

/** HU-28: servicios externos contratados. */
export const serviciosExternosApi = {
  listar: (filtros) => datos(api.get('/servicios-externos', { params: sinVacios(filtros) })),
  /** Si excede el presupuesto de la actividad responde 409 (codigo EXCEDE_PRESUPUESTO) hasta enviar confirmar_exceso. */
  crear: (cuerpo) => datos(api.post('/servicios-externos', cuerpo)),
}

/** HU-13: catálogo de proveedores, para elegir a quién se contrata el servicio. */
export const proveedoresApi = {
  listar: () => datos(api.get('/proveedores')),
}
