import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, obtener, firmar } from '../controllers/actaRecepcionController.js'

const router = Router()
router.use(requireAuth)

// HU-40: bodega, gerente, administrador y maestro consultan las actas; la firma
// exige, además del permiso, ser el destinatario o el responsable (lo decide el
// servicio con la sesión del usuario).
router.get('/', requirePermiso('actas_recepcion.listar'), listar)
router.get('/:id', requirePermiso('actas_recepcion.listar'), obtener)
router.post('/:id/firmar', requirePermiso('actas_recepcion.firmar'), firmar)

export default router
