import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import {
  listar, obtener, almacenes, registrar, actualizar, baja, reactivarCtrl,
  registrarAlm, actualizarAlm, bajaAlm, reactivarAlm, estado, reparaciones,
} from '../controllers/herramientaController.js'

const router = Router()
router.use(requireAuth)

// HU-10: catálogo de herramientas.
router.get('/', requirePermiso('herramientas.listar'), listar)
// Antes de '/:id' para que «almacenes» no se lea como un id.
router.get('/almacenes', requirePermiso('herramientas.listar'), almacenes)
// Gestión de almacenes: reutiliza los permisos de herramientas.
router.post('/almacenes', requirePermiso('herramientas.crear'), registrarAlm)
router.patch('/almacenes/:id', requirePermiso('herramientas.editar'), actualizarAlm)
router.patch('/almacenes/:id/baja', requirePermiso('herramientas.dar_baja'), bajaAlm)
router.patch('/almacenes/:id/reactivar', requirePermiso('herramientas.dar_baja'), reactivarAlm)
router.get('/:id', requirePermiso('herramientas.listar'), obtener)
router.post('/', requirePermiso('herramientas.crear'), registrar)
router.patch('/:id', requirePermiso('herramientas.editar'), actualizar)

// HU-18: baja lógica y reactivación (nunca borrado físico).
router.patch('/:id/baja', requirePermiso('herramientas.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('herramientas.dar_baja'), reactivarCtrl)

// HU-37: estado operativo (reparación / baja definitiva) e historial de reparaciones.
router.patch('/:id/estado', requirePermiso('herramientas.cambiar_estado'), estado)
router.get('/:id/reparaciones', requirePermiso('herramientas.listar'), reparaciones)

export default router
