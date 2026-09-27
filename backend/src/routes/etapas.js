import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar } from '../controllers/etapaController.js'

const router = Router()
router.use(requireAuth)

// HU-03: etapas del plan de trabajo (RF03 · RF04).
router.get('/', requirePermiso('etapas.listar'), listar)
router.post('/', requirePermiso('etapas.crear'), registrar)

export default router
