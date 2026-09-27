import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar } from '../controllers/clienteController.js'

const router = Router()
router.use(requireAuth)

// HU-02: catálogo y alta de clientes para el formulario de proyectos (CU-02).
router.get('/', requirePermiso('clientes.listar'), listar)
router.post('/', requirePermiso('clientes.crear'), registrar)

export default router
