import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar } from '../controllers/prestamoHerramientaController.js'

const router = Router()
router.use(requireAuth)

// HU-11: solo bodega (y administrador) consulta los préstamos.
router.get('/', requirePermiso('prestamos_herramientas.listar'), listar)

export default router
