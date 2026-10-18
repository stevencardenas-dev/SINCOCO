import { RegistrarIncidenciaDto } from '../dtos/incidencia/RegistrarIncidenciaDto.js'
import {
  registrarIncidencia,
  listarIncidencias,
  obtenerIncidencia,
  actualizarIncidencia,
  actividadesAfectadas,
} from '../services/incidenciaService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** POST /api/incidencias -> HU-14: registrar una incidencia de obra. */
export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarIncidenciaDto.fromRequestBody(req.body)
  const incidencia = await registrarIncidencia(dto, contexto(req))
  return res.status(201).json({ message: 'Incidencia registrada correctamente', ...incidencia })
})

/** GET /api/incidencias?proyecto_id=&actividad_id=&estado=&severidad= */
export const listar = asyncHandler(async (req, res) => {
  return res.json(await listarIncidencias(req.query, req.user))
})

/** GET /api/incidencias/afectadas?proyecto_id= -> actividades con incidencia grave sin resolver. */
export const afectadas = asyncHandler(async (req, res) => {
  return res.json({ actividades_ids: await actividadesAfectadas(req.query.proyecto_id, req.user) })
})

/** GET /api/incidencias/:id */
export const obtener = asyncHandler(async (req, res) => {
  return res.json(await obtenerIncidencia(req.params.id, req.user))
})

/** PATCH /api/incidencias/:id -> seguimiento: estado y fecha de resolución. */
export const actualizar = asyncHandler(async (req, res) => {
  const incidencia = await actualizarIncidencia(req.params.id, req.body, contexto(req))
  return res.json({ message: 'Incidencia actualizada correctamente', ...incidencia })
})
