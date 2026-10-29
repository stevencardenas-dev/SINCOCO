import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, disponibles, consolidacion, registrar, solicitar, autorizar, rechazar } from '../controllers/consumoMaterialController.js'

const router = Router()
router.use(requireAuth)

// HU-20: el maestro de obra registra el consumo real; anularlo lo autoriza un administrador.
router.get('/', requirePermiso('consumos_materiales.listar'), listar)
// Antes de '/:id' para que «disponibles» y «consolidacion» no se lean como un id.
router.get('/disponibles', requirePermiso('consumos_materiales.crear'), disponibles)
router.get('/consolidacion', requirePermiso('consumos_materiales.listar'), consolidacion)
router.post('/', requirePermiso('consumos_materiales.crear'), registrar)
router.patch('/:id/solicitar-anulacion', requirePermiso('consumos_materiales.crear'), solicitar)
router.patch('/:id/autorizar-anulacion', requirePermiso('consumos_materiales.autorizar_anulacion'), autorizar)
router.patch('/:id/rechazar-anulacion', requirePermiso('consumos_materiales.autorizar_anulacion'), rechazar)

export default router
