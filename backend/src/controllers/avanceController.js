import { registrarAvanceActividad, listarAvanceActividad } from '../services/avanceService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** POST /api/actividades/:id/avance -> HU-21: registrar el porcentaje de avance. */
export const registrar = asyncHandler(async (req, res) => {
  const resultado = await registrarAvanceActividad(req.params.id, req.body, contexto(req))
  return res.status(201).json({ message: 'Avance registrado correctamente', ...resultado })
})

/** GET /api/actividades/:id/avance -> historial de avance de la actividad. */
export const historial = asyncHandler(async (req, res) => {
  return res.json(await listarAvanceActividad(req.params.id, req.user))
})
