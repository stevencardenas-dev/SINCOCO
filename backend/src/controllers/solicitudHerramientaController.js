import {
  listarSolicitudes, crearSolicitud, aprobarSolicitud, rechazarSolicitud, atenderSolicitud, cancelarSolicitud,
} from '../services/solicitudHerramientaService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) =>
  res.json(await listarSolicitudes({ estado: req.query.estado }, req.user)))

export const crear = asyncHandler(async (req, res) => {
  const solicitud = await crearSolicitud(req.body, contexto(req))
  return res.status(201).json({ message: 'Solicitud registrada: queda pendiente de aprobación por bodega', solicitud })
})

export const aprobar = asyncHandler(async (req, res) =>
  res.json({ message: 'Solicitud aprobada', solicitud: await aprobarSolicitud(req.params.id, contexto(req)) }))

export const rechazar = asyncHandler(async (req, res) =>
  res.json({ message: 'Solicitud rechazada', solicitud: await rechazarSolicitud(req.params.id, req.body, contexto(req)) }))

export const atender = asyncHandler(async (req, res) =>
  res.json({ message: 'Solicitud atendida', solicitud: await atenderSolicitud(req.params.id, contexto(req)) }))

export const cancelar = asyncHandler(async (req, res) =>
  res.json({ message: 'Solicitud cancelada', solicitud: await cancelarSolicitud(req.params.id, contexto(req)) }))
