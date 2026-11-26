import { obtenerResumen, obtenerIndicadores } from '../services/dashboardService.js'
import { asyncHandler } from '../utils/http.js'

/** GET /api/dashboard -> indicadores del panel de inicio. */
export const resumen = asyncHandler(async (req, res) => {
  res.json(await obtenerResumen())
})

/**
 * GET /api/dashboard/indicadores -> dashboard gerencial (HU-16).
 * `?proyecto_id=` `?estado=` `?desde=` `?hasta=` filtran los indicadores.
 */
export const indicadores = asyncHandler(async (req, res) => {
  res.json(
    await obtenerIndicadores(
      {
        proyecto_id: req.query.proyecto_id,
        estado: req.query.estado,
        desde: req.query.desde,
        hasta: req.query.hasta,
      },
      req.user,
    ),
  )
})
