import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, listaProyectos, descargar } from '../controllers/reporteController.js'

const router = Router()
router.use(requireAuth)

// HU-25: los reportes son de consulta gerencial; exportarlos usa el mismo permiso.
router.get('/', requirePermiso('proyectos.listar'), listar)
router.get('/proyectos', requirePermiso('proyectos.listar'), listaProyectos)
router.get('/exportar', requirePermiso('proyectos.listar'), descargar)

export default router
