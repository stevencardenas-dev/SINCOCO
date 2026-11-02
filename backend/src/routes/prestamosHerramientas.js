import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, entregar, reemplazos, reemplazar, devolver } from '../controllers/prestamoHerramientaController.js'

const router = Router()
router.use(requireAuth)

// HU-11: solo bodega (y administrador) consulta y registra las entregas.
router.get('/', requirePermiso('prestamos_herramientas.listar'), listar)
router.post('/', requirePermiso('prestamos_herramientas.crear'), entregar)
// HU-35: avería de una herramienta prestada y su reemplazo.
router.get('/:id/reemplazos', requirePermiso('prestamos_herramientas.reemplazar'), reemplazos)
router.post('/:id/reemplazo', requirePermiso('prestamos_herramientas.reemplazar'), reemplazar)
// HU-12: devolución de una herramienta prestada.
router.post('/:id/devolucion', requirePermiso('prestamos_herramientas.devolver'), devolver)

export default router
