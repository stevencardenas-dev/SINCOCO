import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, opciones, obtener, registrar } from '../controllers/trasladoMaterialController.js'

const router = Router()
router.use(requireAuth)

// HU-29: traslado de materiales entre almacenes (consulta: bodega, administrador y gerente; registro: bodega y administrador).
router.get('/', requirePermiso('traslados_materiales.listar'), listar)
// Antes de '/:id' para que «opciones» no se lea como un id.
router.get('/opciones', requirePermiso('traslados_materiales.crear'), opciones)
router.get('/:id', requirePermiso('traslados_materiales.listar'), obtener)
router.post('/', requirePermiso('traslados_materiales.crear'), registrar)

export default router
