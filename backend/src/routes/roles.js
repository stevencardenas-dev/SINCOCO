import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import {
  matrizRolesPermisos,
  crearRol,
  actualizarRol,
  eliminarRol,
  asignarPermisos,
} from '../controllers/rolesController.js'

/**
 * Administración de roles y permisos (HU-01 · criterio 4 · RF01 · RNF05).
 *
 * La consulta de la matriz se protege con `usuarios.listar` (el permiso de
 * administración de cuentas que solo tiene ADMINISTRADOR); la gestión —crear,
 * editar, eliminar roles y mover sus permisos— con `roles.gestionar`, también
 * exclusivo del administrador.
 */
const router = Router()
router.use(requireAuth)

router.get('/permisos', requirePermiso('usuarios.listar'), matrizRolesPermisos)

router.post('/', requirePermiso('roles.gestionar'), crearRol)
router.patch('/:id', requirePermiso('roles.gestionar'), actualizarRol)
// Regla de negocio: solo se elimina un rol sin usuarios asignados.
router.delete('/:id', requirePermiso('roles.gestionar'), eliminarRol)
router.put('/:id/permisos', requirePermiso('roles.gestionar'), asignarPermisos)

export default router
