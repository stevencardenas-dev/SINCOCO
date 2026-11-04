import { obtenerPresupuesto, guardarPresupuesto } from '../services/presupuestoMaterialService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** GET /api/actividades/:id/presupuesto-materiales -> líneas presupuestadas y materiales disponibles (HU-08). */
export const obtener = asyncHandler(async (req, res) => res.json(await obtenerPresupuesto(req.params.id, req.user)))

/** PUT /api/actividades/:id/presupuesto-materiales -> reemplaza el presupuesto de materiales de la actividad. */
export const guardar = asyncHandler(async (req, res) =>
  res.json({ message: 'Presupuesto de materiales actualizado', ...(await guardarPresupuesto(req.params.id, req.body, contexto(req))) }))
