import api from './api'
import { datos, sinVacios } from './recurso'

/** HU-14: incidencias de obra (avería, accidente o retraso). */
export const incidenciasApi = {
  listar: (filtros) => datos(api.get('/incidencias', { params: sinVacios(filtros) })),
  /** Registra una incidencia; la respuesta indica si se generó alerta y correo. */
  crear: (cuerpo) => datos(api.post('/incidencias', cuerpo)),
  /** Seguimiento: estado y fecha de resolución. */
  actualizar: (id, cuerpo) => datos(api.patch(`/incidencias/${id}`, cuerpo)),
  /** Ids de las actividades del proyecto con una incidencia grave sin resolver. */
  afectadas: (proyectoId) => datos(api.get('/incidencias/afectadas', { params: { proyecto_id: proyectoId } })),
}
