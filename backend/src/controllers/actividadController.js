import {
  listarPorProyecto, listarPorEtapa, registrarActividad,
  darDeBajaActividad, reactivarActividad,
} from '../services/actividadService.js'
import { RegistrarActividadDto } from '../dtos/actividad/RegistrarActividadDto.js'
import { AppError } from '../utils/AppError.js'

const incluir = (q) => ['1', 'true', 'on'].includes(String(q.incluirInactivos))

/**
 * GET /api/actividades?proyecto_id=|etapa_id= -> actividades del plan (HU-03).
 */
export async function listar(req, res, next) {
  try {
    const { proyecto_id: proyectoId, etapa_id: etapaId } = req.query
    if (!proyectoId && !etapaId) {
      throw new AppError('Indique proyecto_id o etapa_id', 400)
    }
    const opciones = { incluirInactivos: incluir(req.query) }
    return res.json(
      etapaId
        ? await listarPorEtapa(etapaId, opciones)
        : await listarPorProyecto(proyectoId, opciones),
    )
  } catch (error) {
    return next(error)
  }
}

/** POST /api/actividades -> HU-03: definir una actividad del plan. */
export async function registrar(req, res, next) {
  try {
    const dto = RegistrarActividadDto.fromRequestBody(req.body)
    const actividad = await registrarActividad(dto, { usuarioId: req.user.id, ip: req.ip })
    return res.status(201).json({ message: 'Actividad registrada correctamente', actividad })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/actividades/:id/baja -> HU-18. */
export async function baja(req, res, next) {
  try {
    const resultado = await darDeBajaActividad(req.params.id, { usuarioId: req.user.id, ip: req.ip })
    return res.json({ message: 'Actividad dada de baja', ...resultado })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/actividades/:id/reactivar -> HU-18. */
export async function reactivarCtrl(req, res, next) {
  try {
    const resultado = await reactivarActividad(req.params.id, { usuarioId: req.user.id, ip: req.ip })
    return res.json({ message: 'Actividad reactivada', ...resultado })
  } catch (error) {
    return next(error)
  }
}
