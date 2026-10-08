import { reprogramarEtapa, reprogramarActividad, historial } from '../services/reprogramacionService.js'
import { ReprogramarDto } from '../dtos/reprogramacion/ReprogramarDto.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** PATCH /api/etapas/:id/reprogramar -> HU-34: reprogramar una etapa. */
export const reprogramarEtapaCtrl = asyncHandler(async (req, res) => {
  const dto = ReprogramarDto.fromRequestBody(req.body)
  const resultado = await reprogramarEtapa(req.params.id, dto, contexto(req))
  return res.json({ message: 'Etapa reprogramada correctamente', ...resultado })
})

/** PATCH /api/actividades/:id/reprogramar -> HU-34: reprogramar una actividad. */
export const reprogramarActividadCtrl = asyncHandler(async (req, res) => {
  const dto = ReprogramarDto.fromRequestBody(req.body)
  const resultado = await reprogramarActividad(req.params.id, dto, contexto(req))
  return res.json({ message: 'Actividad reprogramada correctamente', ...resultado })
})

/** GET /api/etapas/:id/reprogramaciones -> HU-34: historial de la etapa. */
export const historialEtapa = asyncHandler(async (req, res) =>
  res.json(await historial('ETAPA', req.params.id, req.user)))

/** GET /api/actividades/:id/reprogramaciones -> HU-34: historial de la actividad. */
export const historialActividad = asyncHandler(async (req, res) =>
  res.json(await historial('ACTIVIDAD', req.params.id, req.user)))
