import api from './api'
import { datos, recurso } from './recurso'

export const herramientasApi = {
  ...recurso('/herramientas'),
  // Almacenes activos para el selector del formulario (solo lectura).
  // Gestión de almacenes (crear, editar, baja lógica y reactivar).
  almacenesGestion: recurso('/herramientas/almacenes'),
  almacenes: () => datos(api.get('/herramientas/almacenes')),
}
