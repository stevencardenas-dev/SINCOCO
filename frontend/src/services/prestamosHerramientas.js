import api from './api'
import { datos, sinVacios } from './recurso'

export const prestamosHerramientasApi = {
  listar: (filtros) => datos(api.get('/prestamos-herramientas', { params: sinVacios(filtros) })),
}
