import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar, actualizar, baja, reactivarCtrl } from '../controllers/etapaController.js'
import { reprogramarEtapaCtrl, historialEtapa } from '../controllers/reprogramacionController.js'

const router = Router()
router.use(requireAuth)

// HU-03: etapas del plan de trabajo (RF03 · RF04).
router.get('/', requirePermiso('etapas.listar'), listar)
router.post('/', requirePermiso('etapas.crear'), registrar)
router.patch('/:id', requirePermiso('etapas.editar'), actualizar)

// HU-34: reprogramación de fechas (solo administrador) e historial de cambios.
router.patch('/:id/reprogramar', requirePermiso('etapas.reprogramar'), reprogramarEtapaCtrl)
router.get('/:id/reprogramaciones', requirePermiso('etapas.listar'), historialEtapa)

// HU-18: baja lógica y reactivación (nunca borrado físico)
router.patch('/:id/baja', requirePermiso('etapas.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('etapas.dar_baja'), reactivarCtrl)

export default router
