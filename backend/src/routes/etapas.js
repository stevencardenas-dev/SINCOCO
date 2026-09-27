import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar, baja, reactivarCtrl } from '../controllers/etapaController.js'

const router = Router()
router.use(requireAuth)

// HU-03: etapas del plan de trabajo (RF03 · RF04).
router.get('/', requirePermiso('etapas.listar'), listar)
router.post('/', requirePermiso('etapas.crear'), registrar)

// HU-18: baja lógica y reactivación (nunca borrado físico)
router.patch('/:id/baja', requirePermiso('etapas.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('etapas.dar_baja'), reactivarCtrl)

export default router
