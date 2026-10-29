import {
  listarDevoluciones, opcionesDevolucion, actividadesParaDevolucion, salidasParaDevolucion, registrarDevolucion,
} from '../services/devolucionMaterialService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) => res.json(await listarDevoluciones()))
export const opciones = asyncHandler(async (req, res) => res.json(await opcionesDevolucion()))
export const actividades = asyncHandler(async (req, res) => res.json(await actividadesParaDevolucion(req.query.proyecto_id)))
export const salidas = asyncHandler(async (req, res) => res.json(await salidasParaDevolucion(req.query.proyecto_id)))

export const registrar = asyncHandler(async (req, res) =>
  res.status(201).json({ message: 'Devolución registrada', devolucion: await registrarDevolucion(req.body, contexto(req)) }))
