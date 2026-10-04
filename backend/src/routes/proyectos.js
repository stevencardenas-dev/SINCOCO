import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { registrar, actualizar, listar, baja, reactivarCtrl } from '../controllers/proyectoController.js'

const router = Router()
router.use(requireAuth)

// HU-02: el administrador y el gerente registran proyectos; el maestro de obra
// edita los suyos. El permiso sale de roles_permisos (HU-01).
// POST /api/proyectos -> Registrar proyecto (CU-02)
router.post('/', requirePermiso('proyectos.registrar'), registrar)

// GET /api/proyectos -> listado para el módulo de proyectos
router.get('/', requirePermiso('proyectos.listar'), listar)

// PATCH /api/proyectos/:id -> actualizar la información del proyecto. Permiso
// propio: el maestro de obra puede corregir sus proyectos sin poder crearlos.
router.patch('/:id', requirePermiso('proyectos.editar'), actualizar)

// HU-18: baja lógica y reactivación (nunca borrado físico)
router.patch('/:id/baja', requirePermiso('proyectos.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('proyectos.dar_baja'), reactivarCtrl)

export default router
