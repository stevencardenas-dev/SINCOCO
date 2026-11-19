import api from './api'
import { datos, recurso, sinVacios } from './recurso'

export const asignacionesApi = {
  ...recurso('/asignaciones'),
  // HU-31: fecha fin original y extensiones de una asignación; prórroga de la fecha fin.
  historial: (id) => datos(api.get(`/asignaciones/${id}/historial`)),
  extender: (id, cuerpo) => datos(api.post(`/asignaciones/${id}/extender`, cuerpo)),
}

/**
 * HU-06 · historial de asignaciones de un trabajador.
 * `documento` descarga el mismo historial como archivo (documento imprimible).
 */
export const historialAsignacionesApi = {
  deTrabajador: (trabajadorId, filtros) =>
    datos(api.get(`/trabajadores/${trabajadorId}/asignaciones`, { params: sinVacios(filtros) })),
  documento: (trabajadorId, filtros) =>
    api.get(`/trabajadores/${trabajadorId}/asignaciones/documento`, {
      params: sinVacios(filtros),
      responseType: 'blob',
    }),
}
