import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { resumen, ultima, consolidar } from '../controllers/consolidacionCostoController.js'

const router = Router()
router.use(requireAuth)

// HU-15: gerente y administrador consultan los costos; consolidar es una acción
// de gestión del proyecto. El alcance por proyecto lo sigue resolviendo la
// matriz de permisos, igual que en el módulo de proyectos.
router.get('/', requirePermiso('proyectos.listar'), resumen)
router.get('/proyectos/:id', requirePermiso('proyectos.listar'), ultima)
router.post('/proyectos/:id', requirePermiso('proyectos.editar'), consolidar)

export default router
