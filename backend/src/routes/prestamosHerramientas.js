import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, entregar } from '../controllers/prestamoHerramientaController.js'

const router = Router()
router.use(requireAuth)

// HU-11: solo bodega (y administrador) consulta y registra las entregas.
router.get('/', requirePermiso('prestamos_herramientas.listar'), listar)
router.post('/', requirePermiso('prestamos_herramientas.crear'), entregar)

export default router
