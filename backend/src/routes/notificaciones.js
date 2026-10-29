import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { listar, marcarLeida } from '../controllers/notificacionController.js'

const router = Router()
router.use(requireAuth)

// Avisos dirigidos al propio usuario (p. ej. HU-08: bodega resolvió su solicitud de materiales).
// No exige permiso: cada usuario solo ve y marca las suyas.
router.get('/', listar)
router.patch('/:id/leida', marcarLeida)

export default router
