import { listarActas, obtenerActa, firmarActa } from '../services/actaRecepcionService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * HU-40 · actas de recepción de materiales.
 * `GET /api/actas-recepcion`              lista con `?estado=&salida_id=`.
 * `GET /api/actas-recepcion/:id`          acta con sus líneas.
 * `POST /api/actas-recepcion/:id/firmar`  confirma las cantidades recibidas.
 */
export const listar = asyncHandler(async (req, res) => res.json(await listarActas(req.query, req.user)))

export const obtener = asyncHandler(async (req, res) => res.json(await obtenerActa(req.params.id)))

export const firmar = asyncHandler(async (req, res) =>
  res.json({ message: 'Acta de recepción firmada', acta: await firmarActa(req.params.id, req.body, contexto(req)) }))
