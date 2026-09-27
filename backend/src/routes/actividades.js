import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar } from '../controllers/actividadController.js'

const router = Router()
router.use(requireAuth)

// HU-03: actividades del plan de trabajo (RF03 · RF04).
router.get('/', requirePermiso('actividades.listar'), listar)
router.post('/', requirePermiso('actividades.crear'), registrar)

export default router
