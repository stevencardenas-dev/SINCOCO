import api from './api'
import { datos, sinVacios } from './recurso'

export const prestamosHerramientasApi = {
  listar: (filtros) => datos(api.get('/prestamos-herramientas', { params: sinVacios(filtros) })),
  entregar: (cuerpo) => datos(api.post('/prestamos-herramientas', cuerpo)),
  // HU-35: herramientas que pueden reemplazar a la de un préstamo vigente y registro de la avería con su reemplazo.
  reemplazos: (id) => datos(api.get(`/prestamos-herramientas/${id}/reemplazos`)),
  reemplazar: (id, cuerpo) => datos(api.post(`/prestamos-herramientas/${id}/reemplazo`, cuerpo)),
}
