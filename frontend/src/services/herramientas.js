import api from './api'
import { datos, recurso } from './recurso'

export const herramientasApi = {
  ...recurso('/herramientas'),
  // Almacenes activos para el selector del formulario (solo lectura).
  // Gestión de almacenes (crear, editar, baja lógica y reactivar).
  almacenesGestion: recurso('/herramientas/almacenes'),
  almacenes: () => datos(api.get('/herramientas/almacenes')),
  // HU-37: enviar a reparación, volver a disponible o dar de baja (con motivo).
  cambiarEstado: (id, cuerpo) => datos(api.patch(`/herramientas/${id}/estado`, cuerpo)),
  reparaciones: (id) => datos(api.get(`/herramientas/${id}/reparaciones`)),
}
