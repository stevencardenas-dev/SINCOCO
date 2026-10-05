import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import {
  listar,
  obtener,
  crear,
  actualizar,
  baja,
  reactivarCtrl,
} from '../controllers/catalogoController.js'

const router = Router()
router.use(requireAuth)

// Lectura (HU-04): la necesita el formulario de personal, así que se permite a
// quien ya puede consultar el personal; y quien puede gestionar el catálogo
// también puede verlo (la matriz de Roles y permisos decide ambos).
router.get('/:tipo', requirePermiso('catalogos.listar', 'catalogos.gestionar', 'trabajadores.listar'), listar)
router.get('/:tipo/:id', requirePermiso('catalogos.listar', 'catalogos.gestionar', 'trabajadores.listar'), obtener)

// Escritura: la Gestión Administrativa la operan el administrador y el gerente
// (permiso `catalogos.gestionar`, ver docs/seed_permisos_prueba.sql).
router.post('/:tipo', requirePermiso('catalogos.gestionar'), crear)
router.patch('/:tipo/:id', requirePermiso('catalogos.gestionar'), actualizar)

// HU-18 · RN07: nunca borrado físico, solo baja lógica y reactivación.
router.patch('/:tipo/:id/baja', requirePermiso('catalogos.gestionar'), baja)
router.patch('/:tipo/:id/reactivar', requirePermiso('catalogos.gestionar'), reactivarCtrl)

export default router
