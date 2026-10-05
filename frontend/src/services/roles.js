import api from './api'
import { datos } from './recurso'

/** Roles y su matriz de permisos (RBAC). */
export const rolesApi = {
  /** `{ roles, permisos, asignaciones }` */
  matriz: () => datos(api.get('/roles/permisos')),
  crear: (cuerpo) => datos(api.post('/roles', cuerpo)),
  actualizar: (id, cuerpo) => datos(api.patch(`/roles/${id}`, cuerpo)),
  eliminar: (id) => datos(api.delete(`/roles/${id}`)),
  /** Reemplaza el conjunto completo de permisos del rol. */
  asignarPermisos: (id, permisoIds) => datos(api.put(`/roles/${id}/permisos`, { permiso_ids: permisoIds })),
}
