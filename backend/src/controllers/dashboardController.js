import { obtenerResumen } from '../services/dashboardService.js'
import { asyncHandler } from '../utils/http.js'

/** GET /api/dashboard -> indicadores del panel de inicio. */
export const resumen = asyncHandler(async (req, res) => {
  res.json(await obtenerResumen())
})
