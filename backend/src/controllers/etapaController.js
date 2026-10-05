import { listarEtapas, registrarEtapa, actualizarEtapa, darDeBajaEtapa, reactivarEtapa } from '../services/etapaService.js'
import { RegistrarEtapaDto } from '../dtos/etapa/RegistrarEtapaDto.js'
import { ActualizarEtapaDto } from '../dtos/etapa/ActualizarEtapaDto.js'
import { AppError } from '../utils/AppError.js'

const incluir = (q) => ['1', 'true', 'on'].includes(String(q.incluirInactivos))

/** GET /api/etapas?proyecto_id= -> etapas del plan (HU-03). */
export async function listar(req, res, next) {
  try {
    const proyectoId = req.query.proyecto_id
    if (!proyectoId) throw new AppError('proyecto_id es requerido', 400, 'proyecto_id')
    return res.json(
      await listarEtapas(proyectoId, { incluirInactivos: incluir(req.query) }, req.user),
    )
  } catch (error) {
    return next(error)
  }
}

/** POST /api/etapas -> HU-03: definir una etapa del plan de trabajo. */
export async function registrar(req, res, next) {
  try {
    const dto = RegistrarEtapaDto.fromRequestBody(req.body)
    const etapa = await registrarEtapa(dto, { usuario: req.user, usuarioId: req.user.id, ip: req.ip })
    return res.status(201).json({ message: 'Etapa registrada correctamente', etapa })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/etapas/:id -> editar las propiedades de una etapa. */
export async function actualizar(req, res, next) {
  try {
    const dto = ActualizarEtapaDto.fromRequestBody(req.body)
    const etapa = await actualizarEtapa(req.params.id, dto, { usuario: req.user, usuarioId: req.user.id, ip: req.ip })
    return res.json({ message: 'Etapa actualizada correctamente', etapa })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/etapas/:id/baja -> HU-18. */
export async function baja(req, res, next) {
  try {
    const resultado = await darDeBajaEtapa(req.params.id, { usuario: req.user, usuarioId: req.user.id, ip: req.ip })
    return res.json({ message: 'Etapa dada de baja', ...resultado })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/etapas/:id/reactivar -> HU-18. */
export async function reactivarCtrl(req, res, next) {
  try {
    const resultado = await reactivarEtapa(req.params.id, { usuario: req.user, usuarioId: req.user.id, ip: req.ip })
    return res.json({ message: 'Etapa reactivada', ...resultado })
  } catch (error) {
    return next(error)
  }
}
