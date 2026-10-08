import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar, actualizar } from '../controllers/asignacionController.js'
import { extender, historial } from '../controllers/extensionAsignacionController.js'

const router = Router()
router.use(requireAuth)

// Gestión de acceso a proyectos y actividades (RBAC).
// Consultar quién tiene acceso exige poder ver el proyecto; administrarlo
// exige el permiso propio, que solo tiene el administrador.
router.get('/', requirePermiso('proyectos.listar'), listar)
router.post('/', requirePermiso('proyectos.gestionar_acceso'), registrar)
router.patch('/:id', requirePermiso('proyectos.gestionar_acceso'), actualizar)

// HU-31: prórroga de la fecha fin sin sobrescribir el historial.
router.get('/:id/historial', requirePermiso('proyectos.gestionar_acceso'), historial)
router.post('/:id/extender', requirePermiso('proyectos.gestionar_acceso'), extender)

export default router
