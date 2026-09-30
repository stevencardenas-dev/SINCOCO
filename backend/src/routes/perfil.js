import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { obtener, actualizar } from '../controllers/perfilController.js'

const router = Router()
router.use(requireAuth)

// HU-01 · HU-04: cada usuario consulta y corrige su propia información.
// No lleva `requirePermiso` a propósito: son datos propios, no un módulo del
// sistema, y el id del usuario sale del token.
router.get('/', obtener)
router.patch('/', actualizar)

export default router
