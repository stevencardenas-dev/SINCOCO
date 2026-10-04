import {
  listarAsignaciones,
  registrarAsignacion,
  actualizarAsignacion,
} from '../services/accesoService.js'
import { RegistrarAsignacionDto } from '../dtos/asignacion/RegistrarAsignacionDto.js'
import { AppError } from '../utils/AppError.js'

/**
 * Gestión de acceso a proyectos y actividades (RBAC).
 *
 * `GET /api/asignaciones` lista quién tiene acceso a un proyecto o las
 * asignaciones de un trabajador; `POST` y `PATCH` las administra quien tenga
 * `proyectos.gestionar_acceso`.
 */

/** GET /api/asignaciones?proyecto_id= | ?trabajador_id= */
export async function listar(req, res, next) {
  try {
    const proyectoId = req.query.proyecto_id ? Number(req.query.proyecto_id) : null
    const trabajadorId = req.query.trabajador_id ? Number(req.query.trabajador_id) : null
    if (!proyectoId && !trabajadorId) {
      throw new AppError('Indique proyecto_id o trabajador_id', 400)
    }
    return res.json(await listarAsignaciones({ proyectoId, trabajadorId }, req.user))
  } catch (error) {
    return next(error)
  }
}

/** POST /api/asignaciones -> asignar personal a un proyecto o actividad. */
export async function registrar(req, res, next) {
  try {
    const dto = RegistrarAsignacionDto.fromRequestBody(req.body)
    const asignacion = await registrarAsignacion(dto, { usuarioId: req.user.id, ip: req.ip })
    return res.status(201).json({ message: 'Personal asignado correctamente', asignacion })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/asignaciones/:id -> cambiar rol, fechas o estado. */
export async function actualizar(req, res, next) {
  try {
    const asignacion = await actualizarAsignacion(req.params.id, req.body, {
      usuarioId: req.user.id,
      ip: req.ip,
    })
    return res.json({ message: 'Asignación actualizada', asignacion })
  } catch (error) {
    return next(error)
  }
}
