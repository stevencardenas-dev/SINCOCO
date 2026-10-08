import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar, actualizar, baja, reactivarCtrl, iniciar, finalizar } from '../controllers/actividadController.js'
import { reprogramarActividadCtrl, historialActividad } from '../controllers/reprogramacionController.js'

const router = Router()
router.use(requireAuth)

// HU-03: actividades del plan de trabajo (RF03 · RF04).
router.get('/', requirePermiso('actividades.listar'), listar)
router.post('/', requirePermiso('actividades.crear'), registrar)
router.patch('/:id', requirePermiso('actividades.editar'), actualizar)

// Cambio de estado de la ejecución: Empezar (En curso) y Finalizar. El servicio
// limita quién puede: el líder, gerente y administrador, o quien tenga la actividad.
router.patch('/:id/iniciar', requirePermiso('actividades.editar'), iniciar)
router.patch('/:id/finalizar', requirePermiso('actividades.editar'), finalizar)

// HU-34: reprogramación de fechas (solo administrador) e historial de cambios.
router.patch('/:id/reprogramar', requirePermiso('actividades.reprogramar'), reprogramarActividadCtrl)
router.get('/:id/reprogramaciones', requirePermiso('actividades.listar'), historialActividad)

// HU-18: baja lógica y reactivación (nunca borrado físico)
router.patch('/:id/baja', requirePermiso('actividades.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('actividades.dar_baja'), reactivarCtrl)

export default router
