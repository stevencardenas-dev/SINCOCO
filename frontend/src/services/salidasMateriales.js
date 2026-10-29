import api from './api'
import { datos } from './recurso'

const ruta = '/salidas-materiales'

export const salidasMaterialesApi = {
  listar: () => datos(api.get(ruta)),
  // Existencia de cada material en cada almacén (derivada de los movimientos).
  existencias: () => datos(api.get(`${ruta}/existencias`)),
}
