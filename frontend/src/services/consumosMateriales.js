import api from './api'
import { datos, sinVacios } from './recurso'

const ruta = '/consumos-materiales'

export const consumosMaterialesApi = {
  listar: (filtros) => datos(api.get(ruta, { params: sinVacios(filtros) })),
  // Materiales despachados a la actividad y cuánto queda por consumir de cada uno.
  disponibles: (actividadId) => datos(api.get(`${ruta}/disponibles`, { params: { actividad_id: actividadId } })),
  // Costo de materiales consumidos por actividad y total del proyecto.
  consolidacion: (proyectoId) => datos(api.get(`${ruta}/consolidacion`, { params: { proyecto_id: proyectoId } })),
  registrar: (cuerpo) => datos(api.post(ruta, cuerpo)),
  solicitarAnulacion: (id, motivo) => datos(api.patch(`${ruta}/${id}/solicitar-anulacion`, { motivo })),
  autorizarAnulacion: (id, observaciones) => datos(api.patch(`${ruta}/${id}/autorizar-anulacion`, { observaciones })),
  rechazarAnulacion: (id, observaciones) => datos(api.patch(`${ruta}/${id}/rechazar-anulacion`, { observaciones })),
}
