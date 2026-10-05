import {
  listarTrabajadores,
  obtenerTrabajador,
  registrarTrabajador,
  actualizarTrabajador,
  cambiarEstadoTrabajador,
  darDeBajaTrabajador,
  reactivarTrabajador,
} from '../services/trabajadorService.js'
import { RegistrarTrabajadorDto } from '../dtos/trabajador/RegistrarTrabajadorDto.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * GET /api/trabajadores -> catálogo de personal (HU-04).
 * `?incluirInactivos=1` incluye los dados de baja (HU-18).
 * `?buscar=` `?estado=` `?cargo_id=` `?especialidad_id=` `?disponible=` filtran el listado desde la
 * API, porque el volumen de personal no se puede resolver solo en el navegador.
 */
export const listar = asyncHandler(async (req, res) => {
  const incluirInactivos = ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))
  return res.json(
    await listarTrabajadores({
      incluirInactivos,
      buscar: req.query.buscar ?? req.query.q ?? '',
      estado: req.query.estado ?? '',
      cargoId: req.query.cargo_id || null,
      especialidadId: req.query.especialidad_id || null,
      disponible: req.query.disponible ?? null,
    }),
  )
})

export const obtener = asyncHandler(async (req, res) => {
  return res.json(await obtenerTrabajador(req.params.id))
})

/** POST /api/trabajadores -> HU-04: registrar personal con cargo y especialidad. */
export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarTrabajadorDto.fromRequestBody(req.body)
  const trabajador = await registrarTrabajador(dto, contexto(req))
  return res.status(201).json({ message: 'Trabajador registrado correctamente', trabajador })
})

/** PATCH /api/trabajadores/:id -> editar los datos del personal. */
export const actualizar = asyncHandler(async (req, res) => {
  const trabajador = await actualizarTrabajador(req.params.id, req.body, contexto(req))
  return res.json({ message: 'Trabajador actualizado', trabajador })
})

/**
 * PATCH /api/trabajadores/:id/estado -> cambiar el estado del trabajador.
 * Reemplaza en la interfaz al "dar de baja": la disponibilidad se deriva.
 */
export const cambiarEstado = asyncHandler(async (req, res) => {
  const trabajador = await cambiarEstadoTrabajador(req.params.id, req.body?.estado, contexto(req))
  return res.json({ message: `Estado actualizado a ${trabajador.estado}`, trabajador })
})

/** PATCH /api/trabajadores/:id/baja -> HU-18: baja lógica. */
export const baja = asyncHandler(async (req, res) => {
  const resultado = await darDeBajaTrabajador(req.params.id, contexto(req))
  return res.json({ message: 'Trabajador dado de baja', ...resultado })
})

/** PATCH /api/trabajadores/:id/reactivar -> HU-18. */
export const reactivarCtrl = asyncHandler(async (req, res) => {
  const resultado = await reactivarTrabajador(req.params.id, contexto(req))
  return res.json({ message: 'Trabajador reactivado', ...resultado })
})
