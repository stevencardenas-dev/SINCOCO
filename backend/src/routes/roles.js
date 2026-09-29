import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { matrizRolesPermisos } from '../controllers/rolesController.js'

/**
 * Monitoreo de roles y permisos (HU-01 · criterio 4).
 *
 * Se protege con `usuarios.listar`: es el permiso de administración de cuentas
 * que hoy solo tiene el rol ADMINISTRADOR, así que la pantalla queda para el
 * administrador sin inventar un permiso nuevo (el catálogo lo fija
 * docs/seed_permisos_prueba.sql y no se migra solo).
 */
const router = Router()
router.use(requireAuth)

router.get('/permisos', requirePermiso('usuarios.listar'), matrizRolesPermisos)

export default router
