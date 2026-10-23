import api from './api'
import { datos } from './recurso'

export const entradasInventarioApi = {
  listar: () => datos(api.get('/entradas-inventario')),
  ordenes: () => datos(api.get('/entradas-inventario/ordenes-compra')),
  registrar: (cuerpo) => datos(api.post('/entradas-inventario', cuerpo)),
}
