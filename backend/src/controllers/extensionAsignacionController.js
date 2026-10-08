import { extenderAsignacion, historialDeAsignacion } from '../services/extensionAsignacionService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** GET /api/asignaciones/:id/historial -> fecha fin original y extensiones (HU-31). */
export const historial = asyncHandler(async (req, res) => res.json(await historialDeAsignacion(req.params.id)))

/** POST /api/asignaciones/:id/extender -> prorroga la fecha fin de una asignación vigente. */
export const extender = asyncHandler(async (req, res) => {
  const resultado = await extenderAsignacion(req.params.id, req.body, contexto(req))
  return res.status(201).json({ message: 'Extensión registrada', ...resultado })
})
