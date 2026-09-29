import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { consultar } from '../controllers/auditoriaController.js'

/**
 * HU-17: consulta de la bitácora de trazabilidad (RF31 · RF32 · CU-17).
 *
 * Criterio 3: "el acceso a la auditoría debe restringirse a los roles con
 * permiso específico para ello". El permiso es `auditoria.listar`, que
 * docs/seed_permisos_prueba.sql concede únicamente a ADMINISTRADOR.
 *
 * Criterio 2: la bitácora es inmutable. Este router solo expone lectura; no hay
 * POST, PATCH ni DELETE sobre ella, y `db/bitacora.js` solo inserta.
 */
const router = Router()
router.use(requireAuth)

router.get('/', requirePermiso('auditoria.listar'), consultar)

export default router
