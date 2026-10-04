import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import {
  listar, obtener, registrar, actualizar, cambiarEstado, baja, reactivarCtrl,
} from '../controllers/trabajadorController.js'

const router = Router()
router.use(requireAuth)

// HU-04: catálogo de personal (RF06 · RF07).
router.get('/', requirePermiso('trabajadores.listar'), listar)
router.get('/:id', requirePermiso('trabajadores.listar'), obtener)
router.post('/', requirePermiso('trabajadores.crear'), registrar)
router.patch('/:id', requirePermiso('trabajadores.editar'), actualizar)

// Cambio de estado (Activo/Inactivo/Vacaciones/Licencia). La disponibilidad se
// deriva del estado y de las actividades asignadas.
router.patch('/:id/estado', requirePermiso('trabajadores.editar'), cambiarEstado)

// HU-18: baja lógica y reactivación (nunca borrado físico). La interfaz ya no
// los usa —cambia el estado—, pero la API los conserva por compatibilidad.
router.patch('/:id/baja', requirePermiso('trabajadores.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('trabajadores.dar_baja'), reactivarCtrl)

export default router
