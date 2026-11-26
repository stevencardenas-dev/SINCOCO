import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { resumen, indicadores } from '../controllers/dashboardController.js'

/**
 * Indicadores del panel de inicio.
 *
 * Es la pantalla de aterrizaje de los cuatro roles, así que solo exige sesión
 * (requireAuth): el detalle de cada módulo sí tiene su permiso propio
 * (`proyectos.listar`, `trabajadores.listar`…). Aquí no se puede escribir nada;
 * son agregados de solo lectura sobre las tablas del sistema.
 */
const router = Router()
router.use(requireAuth)

router.get('/', resumen)

// HU-16: indicadores gerenciales con filtros. El alcance por proyecto lo
// resuelve el servicio (quien no ve todos los proyectos solo ve los suyos).
router.get('/indicadores', requirePermiso('proyectos.listar'), indicadores)

export default router
