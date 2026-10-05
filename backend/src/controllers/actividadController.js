import {
  listarPorProyecto, listarPorEtapa, registrarActividad, actualizarActividad,
  darDeBajaActividad, reactivarActividad, iniciarActividad, finalizarActividad,
} from '../services/actividadService.js'
import { RegistrarActividadDto } from '../dtos/actividad/RegistrarActividadDto.js'
import { ActualizarActividadDto } from '../dtos/actividad/ActualizarActividadDto.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler, contexto } from '../utils/http.js'

const incluir = (q) => ['1', 'true', 'on'].includes(String(q.incluirInactivos))

/**
 * GET /api/actividades?proyecto_id=|etapa_id= -> actividades del plan (HU-03).
 */
export const listar = asyncHandler(async (req, res) => {
  const { proyecto_id: proyectoId, etapa_id: etapaId } = req.query
  if (!proyectoId && !etapaId) {
    throw new AppError('Indique proyecto_id o etapa_id', 400)
  }
  const opciones = { incluirInactivos: incluir(req.query) }
  return res.json(
    etapaId
      ? await listarPorEtapa(etapaId, opciones, req.user)
      : await listarPorProyecto(proyectoId, opciones, req.user),
  )
})

/** POST /api/actividades -> HU-03: definir una actividad del plan. */
export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarActividadDto.fromRequestBody(req.body)
  const actividad = await registrarActividad(dto, contexto(req))
  return res.status(201).json({ message: 'Actividad registrada correctamente', actividad })
})

/** PATCH /api/actividades/:id -> editar las propiedades de una actividad. */
export const actualizar = asyncHandler(async (req, res) => {
  const dto = ActualizarActividadDto.fromRequestBody(req.body)
  const actividad = await actualizarActividad(req.params.id, dto, contexto(req))
  return res.json({ message: 'Actividad actualizada correctamente', actividad })
})

/** PATCH /api/actividades/:id/baja -> HU-18. */
export const baja = asyncHandler(async (req, res) => {
  const resultado = await darDeBajaActividad(req.params.id, contexto(req))
  return res.json({ message: 'Actividad dada de baja', ...resultado })
})

/** PATCH /api/actividades/:id/reactivar -> HU-18. */
export const reactivarCtrl = asyncHandler(async (req, res) => {
  const resultado = await reactivarActividad(req.params.id, contexto(req))
  return res.json({ message: 'Actividad reactivada', ...resultado })
})

/** PATCH /api/actividades/:id/iniciar -> «Empezar»: pasa a En curso. */
export const iniciar = asyncHandler(async (req, res) => {
  const actividad = await iniciarActividad(req.params.id, contexto(req))
  return res.json({ message: 'Actividad en curso', actividad })
})

/** PATCH /api/actividades/:id/finalizar -> «Finalizar»: pasa a Finalizado. */
export const finalizar = asyncHandler(async (req, res) => {
  const actividad = await finalizarActividad(req.params.id, contexto(req))
  return res.json({ message: 'Actividad finalizada', actividad })
})
