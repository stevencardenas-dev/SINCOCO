import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, atender } from '../controllers/alertaController.js'

const router = Router()
router.use(requireAuth)

// HU-23: alertas de inventario (stock mínimo) dirigidas a bodega.
router.get('/', requirePermiso('alertas.listar'), listar)
router.patch('/:id/atender', requirePermiso('alertas.atender'), atender)

export default router
