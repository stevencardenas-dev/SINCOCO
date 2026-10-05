import api from './api'
import { datos, recurso } from './recurso'

export const usuariosApi = {
  ...recurso('/usuarios'),
  roles: () => datos(api.get('/usuarios/roles')),
  trabajadoresDisponibles: () => datos(api.get('/usuarios/trabajadores-disponibles')),
  solicitudesReset: () => datos(api.get('/usuarios/solicitudes-reset')),
  cambiarRol: (id, rolId) => datos(api.patch(`/usuarios/${id}/rol`, { rol_id: rolId })),
  cambiarEstado: (id, estado) => datos(api.patch(`/usuarios/${id}/estado`, { estado })),
}
