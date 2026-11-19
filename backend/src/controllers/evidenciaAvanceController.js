import {
  subirEvidencia,
  listarDeActividad,
  listarRecientes,
  contenidoEvidencia,
  eliminarEvidencia,
} from '../services/evidenciaAvanceService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * HU-22 · evidencias de avance.
 *
 * GET    /api/evidencias?actividad_id=1      evidencias de la actividad
 * GET    /api/evidencias?recientes=6         últimas evidencias (dashboard)
 * GET    /api/evidencias/:id/archivo         descarga del archivo
 * POST   /api/evidencias (actividad_id, nombre_archivo, tipo_archivo, contenido)
 * DELETE /api/evidencias/:id
 */

export const listar = asyncHandler(async (req, res) => {
  if (req.query.recientes !== undefined) {
    return res.json({ evidencias: await listarRecientes(req.query.recientes) })
  }
  const actividadId = req.query.actividad_id
  if (!actividadId) {
    const error = new Error('Indique la actividad')
    error.statusCode = 400
    throw error
  }
  return res.json({ evidencias: await listarDeActividad(actividadId) })
})

export const subir = asyncHandler(async (req, res) => {
  const datos = await subirEvidencia(req.body?.actividad_id, req.body ?? {}, contexto(req))
  return res.status(201).json({ message: 'Evidencia adjuntada', evidencia: datos })
})

export const archivo = asyncHandler(async (req, res) => {
  const { buffer, tipo, nombre } = await contenidoEvidencia(req.params.id)
  res.setHeader('Content-Type', tipo)
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nombre)}"`)
  return res.send(buffer)
})

export const eliminar = asyncHandler(async (req, res) => {
  const r = await eliminarEvidencia(req.params.id, contexto(req))
  return res.json({ message: 'Evidencia eliminada', ...r })
})
