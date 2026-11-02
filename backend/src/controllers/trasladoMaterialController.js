import { listarTraslados, obtenerTraslado, opcionesTraslado, registrarTraslado } from '../services/trasladoMaterialService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) => res.json(await listarTraslados()))
export const opciones = asyncHandler(async (req, res) => res.json(await opcionesTraslado()))
export const obtener = asyncHandler(async (req, res) => res.json(await obtenerTraslado(req.params.id)))

export const registrar = asyncHandler(async (req, res) =>
  res.status(201).json({ message: 'Traslado registrado', traslado: await registrarTraslado(req.body, contexto(req)) }))
