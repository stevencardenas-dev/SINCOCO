import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, existencias, obtener } from '../controllers/salidaMaterialController.js'

const router = Router()
router.use(requireAuth)

// HU-26: constancia de las salidas de materiales y existencia por almacén (bodega, administrador y gerente).
router.get('/', requirePermiso('salidas_materiales.listar'), listar)
// Antes de '/:id' para que «existencias» no se lea como un id.
router.get('/existencias', requirePermiso('salidas_materiales.listar'), existencias)
router.get('/:id', requirePermiso('salidas_materiales.listar'), obtener)

export default router
