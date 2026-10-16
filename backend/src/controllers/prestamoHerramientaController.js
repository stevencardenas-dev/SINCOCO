import { listarPrestamos } from '../services/prestamoHerramientaService.js'
import { asyncHandler } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) => res.json(await listarPrestamos({ estado: req.query.estado })))
