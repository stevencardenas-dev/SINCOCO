import * as repo from '../repositories/notificacionRepository.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/http.js'

/** GET /api/notificaciones -> las propias; `?leida=0` deja solo las pendientes de leer. */
export const listar = asyncHandler(async (req, res) =>
  res.json(await repo.listar(req.user.id, { soloNoLeidas: String(req.query.leida ?? '') === '0' })))

export const marcarLeida = asyncHandler(async (req, res) => {
  if (!(await repo.marcarLeida(req.params.id, req.user.id))) throw new AppError('Notificación no encontrada', 404)
  res.json({ message: 'Notificación marcada como leída' })
})
