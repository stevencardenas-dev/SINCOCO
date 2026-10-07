import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar } from '../controllers/proveedorController.js'

const router = Router()
router.use(requireAuth)

// HU-13: catálogo y alta de proveedores. Por ahora solo el administrador tiene
// estos permisos (docs/migracion_proveedores.sql).
router.get('/', requirePermiso('proveedores.listar'), listar)
router.post('/', requirePermiso('proveedores.crear'), registrar)

export default router
