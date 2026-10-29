import {
  listarSolicitudes, crearSolicitud, aprobarSolicitud, rechazarSolicitud, cancelarSolicitud, despacharSolicitud, catalogoMateriales,
} from '../services/solicitudMaterialService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) =>
  res.json(await listarSolicitudes({ estado: req.query.estado }, req.user)))

export const catalogo = asyncHandler(async (req, res) => res.json(await catalogoMateriales()))

export const crear =asyncHandler(async (req, res) =>
  res.status(201).json({ message: 'Solicitud registrada: bodega fue notificada', solicitud: await crearSolicitud(req.body, contexto(req)) }))

export const aprobar = asyncHandler(async (req, res) =>
  res.json({ message: 'Solicitud aprobada', solicitud: await aprobarSolicitud(req.params.id, req.body, contexto(req)) }))

export const rechazar = asyncHandler(async (req, res) =>
  res.json({ message: 'Solicitud rechazada', solicitud: await rechazarSolicitud(req.params.id, req.body, contexto(req)) }))

export const cancelar = asyncHandler(async (req, res) =>
  res.json({ message: 'Solicitud cancelada', solicitud: await cancelarSolicitud(req.params.id, contexto(req)) }))

export const despachar = asyncHandler(async (req, res) =>
  res.json({ message: 'Despacho registrado', solicitud: await despacharSolicitud(req.params.id, req.body, contexto(req)) }))
