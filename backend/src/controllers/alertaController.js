import { listarAlertas, atenderAlerta } from '../services/alertaService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) =>
  res.json(await listarAlertas({ tipo: req.query.tipo, atendida: req.query.atendida })))

export const atender = asyncHandler(async (req, res) =>
  res.json({ message: 'Alerta atendida', alerta: await atenderAlerta(req.params.id, contexto(req)) }))
