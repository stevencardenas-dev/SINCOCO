import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { registrar, listar } from '../controllers/proyectoController.js'

const router = Router()

// HU-02: el administrador registra proyectos (docs/ACTORES_DEL_NEGOCIO.md).
// El gerente y el maestro de obra consultan el seguimiento (el menú de
// MAESTRO_OBRA ya muestra Proyectos; el registro sigue siendo del admin).
router.use(requireAuth, requireRole('ADMINISTRADOR', 'GERENTE', 'MAESTRO_OBRA'))

// POST /api/proyectos -> HU-02: Registrar proyecto (CU-02), solo ADMINISTRADOR
router.post('/', requireRole('ADMINISTRADOR'), registrar)

// GET /api/proyectos -> listado para el módulo de proyectos
router.get('/', listar)

export default router
