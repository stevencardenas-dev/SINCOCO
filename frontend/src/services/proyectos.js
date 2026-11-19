import api from './api'
import { datos, recurso } from './recurso'

export const proyectosApi = {
  ...recurso('/proyectos'),
  /** Qué puede hacer el usuario actual en el plan del proyecto. */
  miAcceso: (id) => datos(api.get(`/proyectos/${id}/mi-acceso`)),
  // HU-38: transiciones de estado; las tres exigen motivo.
  congelar: (id, cuerpo) => datos(api.patch(`/proyectos/${id}/congelar`, cuerpo)),
  reanudar: (id, cuerpo) => datos(api.patch(`/proyectos/${id}/reanudar`, cuerpo)),
  finalizar: (id, cuerpo) => datos(api.patch(`/proyectos/${id}/finalizar`, cuerpo)),
}
