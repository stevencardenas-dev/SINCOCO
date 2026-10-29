import api from './api'
import { datos } from './recurso'

export const entradasInventarioApi = {
  listar: () => datos(api.get('/entradas-inventario')),
  ordenes: () => datos(api.get('/entradas-inventario/ordenes-compra')),
  // Proveedores para el selector; no requiere el permiso del módulo de proveedores.
  proveedores: () => datos(api.get('/entradas-inventario/proveedores')),
  registrar:(cuerpo) => datos(api.post('/entradas-inventario', cuerpo)),
}
