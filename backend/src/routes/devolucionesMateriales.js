import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, opciones, actividades, salidas, registrar } from '../controllers/devolucionMaterialController.js'

const router = Router()
router.use(requireAuth)

// HU-09: devolución de materiales sobrantes (bodega y administrador).
router.get('/', requirePermiso('devoluciones_materiales.listar'), listar)
// Opciones del formulario: quien registra no necesita los permisos de proyectos, personal, almacenes ni salidas.
router.get('/opciones', requirePermiso('devoluciones_materiales.crear'), opciones)
router.get('/actividades', requirePermiso('devoluciones_materiales.crear'), actividades)
router.get('/salidas', requirePermiso('devoluciones_materiales.crear'), salidas)
router.post('/', requirePermiso('devoluciones_materiales.crear'), registrar)

export default router
