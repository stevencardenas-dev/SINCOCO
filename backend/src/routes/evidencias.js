import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, subir, archivo, eliminar } from '../controllers/evidenciaAvanceController.js'

const router = Router()
router.use(requireAuth)

// HU-22: quien registra avance adjunta evidencias; quien consulta el avance las ve.
router.get('/', requirePermiso('avance.listar'), listar)
router.get('/:id/archivo', requirePermiso('avance.listar'), archivo)
router.post('/', requirePermiso('avance.registrar'), subir)
router.delete('/:id', requirePermiso('avance.registrar'), eliminar)

export default router
