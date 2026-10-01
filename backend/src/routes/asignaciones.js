import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar, actualizar } from '../controllers/asignacionController.js'

const router = Router()
router.use(requireAuth)

// Gestión de acceso a proyectos y actividades (RBAC).
// Consultar quién tiene acceso exige poder ver el proyecto; administrarlo
// exige el permiso propio, que solo tiene el administrador.
router.get('/', requirePermiso('proyectos.listar'), listar)
router.post('/', requirePermiso('proyectos.gestionar_acceso'), registrar)
router.patch('/:id', requirePermiso('proyectos.gestionar_acceso'), actualizar)

export default router
