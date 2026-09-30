import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import {
  crear, listar, cambiarEstado, listarRoles,
  listarTrabajadoresSinCuenta, cambiarRol, baja, reactivarCtrl,
  listarSolicitudesReset,
} from '../controllers/usuariosController.js'

// HU-01 · criterio 4: el acceso se decide por los permisos del rol
// (roles_permisos), no por una lista de roles fija en el código.
const router = Router()
router.use(requireAuth)

router.get('/', requirePermiso('usuarios.listar'), listar)
// HU-01: códigos de recuperación de contraseña pendientes de entregar.
router.get('/solicitudes-reset', requirePermiso('usuarios.listar'), listarSolicitudesReset)
router.get('/roles', requirePermiso('usuarios.crear', 'usuarios.cambiar_rol'), listarRoles)
router.get('/trabajadores-disponibles', requirePermiso('usuarios.crear'), listarTrabajadoresSinCuenta)
router.post('/', requirePermiso('usuarios.crear'), crear)
router.patch('/:id/estado', requirePermiso('usuarios.cambiar_estado'), cambiarEstado)
router.patch('/:id/rol', requirePermiso('usuarios.cambiar_rol'), cambiarRol)

// HU-18: baja lógica y reactivación de cuentas (usa el permiso de estado).
router.patch('/:id/baja', requirePermiso('usuarios.cambiar_estado'), baja)
router.patch('/:id/reactivar', requirePermiso('usuarios.cambiar_estado'), reactivarCtrl)

export default router
