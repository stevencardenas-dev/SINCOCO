import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, aplicar } from '../controllers/plantillaEtapaController.js'

const router = Router()
router.use(requireAuth)

// Mejora de HU-03: plantillas de etapas. Solo quien tiene el permiso (administrador).
router.get('/', requirePermiso('etapas.aplicar_plantilla'), listar)
router.post('/aplicar', requirePermiso('etapas.aplicar_plantilla'), aplicar)

export default router
