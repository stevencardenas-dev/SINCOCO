import { listarSalidas, obtenerSalida, existenciasPorAlmacen } from '../services/salidaMaterialService.js'
import { asyncHandler } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) => res.json(await listarSalidas()))
export const existencias = asyncHandler(async (req, res) => res.json(await existenciasPorAlmacen()))
export const obtener = asyncHandler(async (req, res) => res.json(await obtenerSalida(req.params.id)))
