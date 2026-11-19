import api from './api'
import { datos, sinVacios } from './recurso'

/** HU-15 · costo real consolidado por proyecto. */
export const costosApi = {
  resumen: (filtros) => datos(api.get('/costos', { params: sinVacios(filtros) })),
  ultima: (id) => datos(api.get(`/costos/proyectos/${id}`)),
  consolidar: (id) => datos(api.post(`/costos/proyectos/${id}`)),
}
