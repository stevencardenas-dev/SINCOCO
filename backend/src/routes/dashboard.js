import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { resumen } from '../controllers/dashboardController.js'

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

export default router
