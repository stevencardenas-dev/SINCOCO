import {
  listarConsumos, disponiblesParaConsumo, registrarConsumo, solicitarAnulacion, autorizarAnulacion, rechazarAnulacion, consolidacionCostos,
} from '../services/consumoMaterialService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) => res.json(await listarConsumos({ estado: req.query.estado }, req.user)))
export const disponibles = asyncHandler(async (req, res) => res.json(await disponiblesParaConsumo(req.query.actividad_id, req.user)))
export const consolidacion = asyncHandler(async (req, res) => res.json(await consolidacionCostos(req.query.proyecto_id, req.user)))

export const registrar = asyncHandler(async (req, res) =>
  res.status(201).json({ message: 'Consumo registrado', consumo: await registrarConsumo(req.body, contexto(req)) }))
export const solicitar = asyncHandler(async (req, res) =>
  res.json({ message: 'Anulación solicitada: queda pendiente de la autorización de un administrador', consumo: await solicitarAnulacion(req.params.id, req.body, contexto(req)) }))
export const autorizar = asyncHandler(async (req, res) =>
  res.json({ message: 'Consumo anulado', consumo: await autorizarAnulacion(req.params.id, req.body, contexto(req)) }))
export const rechazar = asyncHandler(async (req, res) =>
  res.json({ message: 'Anulación rechazada', consumo: await rechazarAnulacion(req.params.id, req.body, contexto(req)) }))
