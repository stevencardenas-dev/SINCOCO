import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar } from '../controllers/servicioExternoController.js'

const router = Router()
router.use(requireAuth)

// HU-28: el administrador registra y consulta; el gerente solo consulta
// (docs/migraciones/pendientes/migracion_servicios_externos.sql).
router.get('/', requirePermiso('servicios_externos.listar'), listar)
router.post('/', requirePermiso('servicios_externos.crear'), registrar)

export default router
