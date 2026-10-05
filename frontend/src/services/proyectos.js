import api from './api'
import { datos, recurso } from './recurso'

export const proyectosApi = {
  ...recurso('/proyectos'),
  /** Qué puede hacer el usuario actual en el plan del proyecto. */
  miAcceso: (id) => datos(api.get(`/proyectos/${id}/mi-acceso`)),
}
