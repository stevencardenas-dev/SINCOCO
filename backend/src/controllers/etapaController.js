import { listarEtapas, registrarEtapa } from '../services/etapaService.js'
import { RegistrarEtapaDto } from '../dtos/etapa/RegistrarEtapaDto.js'
import { AppError } from '../utils/AppError.js'

const incluir = (q) => ['1', 'true', 'on'].includes(String(q.incluirInactivos))

/** GET /api/etapas?proyecto_id= -> etapas del plan (HU-03). */
export async function listar(req, res, next) {
  try {
    const proyectoId = req.query.proyecto_id
    if (!proyectoId) throw new AppError('proyecto_id es requerido', 400, 'proyecto_id')
    return res.json(await listarEtapas(proyectoId, { incluirInactivos: incluir(req.query) }))
  } catch (error) {
    return next(error)
  }
}

/** POST /api/etapas -> HU-03: definir una etapa del plan de trabajo. */
export async function registrar(req, res, next) {
  try {
    const dto = RegistrarEtapaDto.fromRequestBody(req.body)
    const etapa = await registrarEtapa(dto, { usuarioId: req.user.id, ip: req.ip })
    return res.status(201).json({ message: 'Etapa registrada correctamente', etapa })
  } catch (error) {
    return next(error)
  }
}
