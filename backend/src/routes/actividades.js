import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar, actualizar, baja, reactivarCtrl } from '../controllers/actividadController.js'

const router = Router()
router.use(requireAuth)

// HU-03: actividades del plan de trabajo (RF03 · RF04).
router.get('/', requirePermiso('actividades.listar'), listar)
router.post('/', requirePermiso('actividades.crear'), registrar)
router.patch('/:id', requirePermiso('actividades.editar'), actualizar)

// HU-18: baja lógica y reactivación (nunca borrado físico)
router.patch('/:id/baja', requirePermiso('actividades.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('actividades.dar_baja'), reactivarCtrl)

export default router
