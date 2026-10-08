import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import {
  listar, obtener, categorias, unidades, registrar, actualizar, baja, reactivarCtrl,
} from '../controllers/materialController.js'

const router = Router()
router.use(requireAuth)

// HU-07: catálogo de materiales.
router.get('/', requirePermiso('materiales.listar'), listar)
// Antes de '/:id' para que «categorias» y «unidades» no se lean como un id.
router.get('/categorias', requirePermiso('materiales.listar'), categorias)
router.get('/unidades', requirePermiso('materiales.listar'), unidades)
router.get('/:id', requirePermiso('materiales.listar'), obtener)
router.post('/', requirePermiso('materiales.crear'), registrar)
router.patch('/:id', requirePermiso('materiales.editar'), actualizar)

// HU-18: baja lógica y reactivación (nunca borrado físico).
router.patch('/:id/baja', requirePermiso('materiales.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('materiales.dar_baja'), reactivarCtrl)

export default router
