import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, crear, aprobar, rechazar, atender, cancelar } from '../controllers/solicitudHerramientaController.js'
import { requireProyectoOperable } from '../middleware/proyectoOperable.js'

const router = Router()
router.use(requireAuth)

// HU-30: el maestro de obra solicita; bodega aprueba, rechaza y atiende.
router.get('/', requirePermiso('solicitudes_herramientas.listar'), listar)
router.post('/', requirePermiso('solicitudes_herramientas.crear'), requireProyectoOperable, crear)
router.patch('/:id/aprobar', requirePermiso('solicitudes_herramientas.resolver'), aprobar)
router.patch('/:id/rechazar', requirePermiso('solicitudes_herramientas.resolver'), rechazar)
router.patch('/:id/atender', requirePermiso('solicitudes_herramientas.resolver'), atender)
router.patch('/:id/cancelar', requirePermiso('solicitudes_herramientas.listar'), cancelar)

export default router
