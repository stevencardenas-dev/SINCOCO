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
// quien ya puede consultar el personal.
router.get('/:tipo', requirePermiso('catalogos.listar', 'trabajadores.listar'), listar)
router.get('/:tipo/:id', requirePermiso('catalogos.listar', 'trabajadores.listar'), obtener)

// Escritura: solo el administrador (permiso `catalogos.gestionar`, solo ADMIN
// en docs/seed_permisos_prueba.sql).
router.post('/:tipo', requirePermiso('catalogos.gestionar'), crear)
router.patch('/:tipo/:id', requirePermiso('catalogos.gestionar'), actualizar)

// HU-18 · RN07: nunca borrado físico, solo baja lógica y reactivación.
router.patch('/:tipo/:id/baja', requirePermiso('catalogos.gestionar'), baja)
router.patch('/:tipo/:id/reactivar', requirePermiso('catalogos.gestionar'), reactivarCtrl)

export default router
