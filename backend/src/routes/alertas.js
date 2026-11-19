import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, atender, evaluar, recordar } from '../controllers/alertaController.js'

const router = Router()
router.use(requireAuth)

// HU-23: alertas de inventario (stock mínimo) dirigidas a bodega.
router.get('/', requirePermiso('alertas.listar'), listar)
router.patch('/:id/atender', requirePermiso('alertas.atender'), atender)

// HU-24: evaluar atrasos (bajo demanda; también corre programada) y recordar
// al responsable desde la alerta.
router.post('/evaluar', requirePermiso('alertas.listar'), evaluar)
router.post('/:id/recordatorio', requirePermiso('alertas.listar'), recordar)

export default router
