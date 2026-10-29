import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, crear, aprobar, rechazar, cancelar, despachar, catalogo, cancelarSaldo } from '../controllers/solicitudMaterialController.js'

const router = Router()
router.use(requireAuth)

// HU-08: el maestro de obra solicita; bodega aprueba, rechaza y despacha.
router.get('/', requirePermiso('solicitudes_materiales.listar'), listar)
// Materiales que se pueden pedir: quien solicita no necesita el permiso del catálogo de inventario.
router.get('/materiales', requirePermiso('solicitudes_materiales.crear'), catalogo)
router.post('/', requirePermiso('solicitudes_materiales.crear'), crear)
router.patch('/:id/aprobar', requirePermiso('solicitudes_materiales.resolver'), aprobar)
router.patch('/:id/rechazar', requirePermiso('solicitudes_materiales.resolver'), rechazar)
router.patch('/:id/despachar', requirePermiso('solicitudes_materiales.resolver'), despachar)
router.patch('/:id/cancelar', requirePermiso('solicitudes_materiales.listar'), cancelar)
// HU-36: el saldo pendiente que no se va a atender se cancela con una observación obligatoria.
router.patch('/:id/cancelar-saldo', requirePermiso('solicitudes_materiales.resolver'), cancelarSaldo)

export default router
