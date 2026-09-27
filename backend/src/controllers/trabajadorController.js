import {
  listarTrabajadores,
  obtenerTrabajador,
  registrarTrabajador,
  actualizarTrabajador,
} from '../services/trabajadorService.js'
import { RegistrarTrabajadorDto } from '../dtos/trabajador/RegistrarTrabajadorDto.js'

/**
 * GET /api/trabajadores -> catálogo de personal (HU-04).
 * `?incluirInactivos=1` incluye los dados de baja (HU-18).
 */
export async function listar(req, res, next) {
  try {
    const incluirInactivos = ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))
    return res.json(await listarTrabajadores({ incluirInactivos }))
  } catch (error) {
    return next(error)
  }
}

export async function obtener(req, res, next) {
  try {
    return res.json(await obtenerTrabajador(req.params.id))
  } catch (error) {
    return next(error)
  }
}

/** POST /api/trabajadores -> HU-04: registrar personal con cargo y especialidad. */
export async function registrar(req, res, next) {
  try {
    const dto = RegistrarTrabajadorDto.fromRequestBody(req.body)
    const trabajador = await registrarTrabajador(dto, { usuarioId: req.user.id, ip: req.ip })
    return res.status(201).json({ message: 'Trabajador registrado correctamente', trabajador })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/trabajadores/:id -> editar los datos del personal. */
export async function actualizar(req, res, next) {
  try {
    const trabajador = await actualizarTrabajador(req.params.id, req.body, {
      usuarioId: req.user.id,
      ip: req.ip,
    })
    return res.json({ message: 'Trabajador actualizado', trabajador })
  } catch (error) {
    return next(error)
  }
}
