import api from './api'
import { datos, recurso } from './recurso'

export const herramientasApi = {
  ...recurso('/herramientas'),
  // Almacenes activos para el selector del formulario (solo lectura).
  almacenes: () => datos(api.get('/herramientas/almacenes')),
}
