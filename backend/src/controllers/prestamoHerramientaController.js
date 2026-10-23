import { listarPrestamos, registrarEntrega } from '../services/prestamoHerramientaService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) => res.json(await listarPrestamos({ estado: req.query.estado })))

export const entregar = asyncHandler(async (req, res) =>
  res.status(201).json({ message: 'Entrega registrada', prestamo: await registrarEntrega(req.body, contexto(req)) }))
