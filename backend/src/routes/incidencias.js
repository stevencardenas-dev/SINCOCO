import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { registrar, listar, afectadas, obtener, actualizar } from '../controllers/incidenciaController.js'

/**
 * HU-14: incidencias de obra (avería, accidente o retraso). El servicio limita
 * el alcance: cada quien opera sobre los proyectos a los que tiene acceso.
 */
const router = Router()
router.use(requireAuth)

router.get('/', requirePermiso('incidencias.listar'), listar)
router.post('/', requirePermiso('incidencias.crear'), registrar)
router.get('/afectadas', requirePermiso('incidencias.listar'), afectadas)
router.get('/:id', requirePermiso('incidencias.listar'), obtener)
router.patch('/:id', requirePermiso('incidencias.editar'), actualizar)

export default router
