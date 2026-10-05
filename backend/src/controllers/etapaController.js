import { listarEtapas, registrarEtapa, actualizarEtapa, darDeBajaEtapa, reactivarEtapa } from '../services/etapaService.js'
import { RegistrarEtapaDto } from '../dtos/etapa/RegistrarEtapaDto.js'
import { ActualizarEtapaDto } from '../dtos/etapa/ActualizarEtapaDto.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler, contexto } from '../utils/http.js'

const incluir = (q) => ['1', 'true', 'on'].includes(String(q.incluirInactivos))

/** GET /api/etapas?proyecto_id= -> etapas del plan (HU-03). */
export const listar = asyncHandler(async (req, res) => {
  const proyectoId = req.query.proyecto_id
  if (!proyectoId) throw new AppError('proyecto_id es requerido', 400, 'proyecto_id')
  return res.json(
    await listarEtapas(proyectoId, { incluirInactivos: incluir(req.query) }, req.user),
  )
})

/** POST /api/etapas -> HU-03: definir una etapa del plan de trabajo. */
export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarEtapaDto.fromRequestBody(req.body)
  const etapa = await registrarEtapa(dto, contexto(req))
  return res.status(201).json({ message: 'Etapa registrada correctamente', etapa })
})

/** PATCH /api/etapas/:id -> editar las propiedades de una etapa. */
export const actualizar = asyncHandler(async (req, res) => {
  const dto = ActualizarEtapaDto.fromRequestBody(req.body)
  const etapa = await actualizarEtapa(req.params.id, dto, contexto(req))
  return res.json({ message: 'Etapa actualizada correctamente', etapa })
})

/** PATCH /api/etapas/:id/baja -> HU-18. */
export const baja = asyncHandler(async (req, res) => {
  const resultado = await darDeBajaEtapa(req.params.id, contexto(req))
  return res.json({ message: 'Etapa dada de baja', ...resultado })
})

/** PATCH /api/etapas/:id/reactivar -> HU-18. */
export const reactivarCtrl = asyncHandler(async (req, res) => {
  const resultado = await reactivarEtapa(req.params.id, contexto(req))
  return res.json({ message: 'Etapa reactivada', ...resultado })
})
