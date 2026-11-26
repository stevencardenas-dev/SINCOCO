import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar, autorizar, rechazar, reajustar } from '../controllers/servicioExternoController.js'
import { requireProyectoOperable } from '../middleware/proyectoOperable.js'

const router = Router()
router.use(requireAuth)

// HU-28: el administrador registra y consulta; el gerente solo consulta
// (docs/migraciones/pendientes/migracion_servicios_externos.sql).
router.get('/', requirePermiso('servicios_externos.listar'), listar)
router.post('/', requirePermiso('servicios_externos.crear'), requireProyectoOperable, registrar)

// HU-32: el gerente autoriza o rechaza un sobrecosto; el administrador reajusta
// el monto tras un rechazo y el servicio se reevalúa.
router.patch('/:id/autorizar', requirePermiso('servicios_externos.autorizar'), autorizar)
router.patch('/:id/rechazar', requirePermiso('servicios_externos.autorizar'), rechazar)
router.patch('/:id/valor', requirePermiso('servicios_externos.crear'), reajustar)

export default router
