import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { registrar, listar, baja, reactivarCtrl } from '../controllers/proyectoController.js'

const router = Router()
router.use(requireAuth)

// HU-02: el administrador registra proyectos; el gerente y el maestro de obra
// consultan el seguimiento. El permiso sale de roles_permisos (HU-01).
// POST /api/proyectos -> Registrar proyecto (CU-02)
router.post('/', requirePermiso('proyectos.registrar'), registrar)

// GET /api/proyectos -> listado para el módulo de proyectos
router.get('/', requirePermiso('proyectos.listar'), listar)

// HU-18: baja lógica y reactivación (nunca borrado físico)
router.patch('/:id/baja', requirePermiso('proyectos.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('proyectos.dar_baja'), reactivarCtrl)

export default router
