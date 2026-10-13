import api from './api'
import { datos, recurso } from './recurso'

export const materialesApi = {
  ...recurso('/materiales'),
  // Categorías y unidades de medida válidas para los selectores del formulario.
  categorias: () => datos(api.get('/materiales/categorias')),
  unidades: () => datos(api.get('/materiales/unidades')),
}
