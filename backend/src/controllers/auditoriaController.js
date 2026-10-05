import { consultarBitacora } from '../services/auditoriaService.js'
import { asyncHandler } from '../utils/http.js'

/** GET /api/auditoria -> HU-17: consulta filtrada y paginada de la bitácora. */
export const consultar = asyncHandler(async (req, res) => {
  res.json(await consultarBitacora(req.query))
})
