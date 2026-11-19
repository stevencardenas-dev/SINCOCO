import { historialDeTrabajador, documentoHistorial } from '../services/historialAsignacionService.js'
import { asyncHandler } from '../utils/http.js'

/**
 * HU-06 · historial de asignaciones de un trabajador.
 *
 * `GET /api/trabajadores/:id/asignaciones` devuelve la lista ordenada por fecha
 * de inicio; `GET .../asignaciones/documento` descarga el mismo contenido como
 * documento imprimible con los filtros y la fecha de generación.
 */

const incluirInactivos = (req) => ['1', 'true'].includes(String(req.query.incluir_inactivos ?? ''))

/** GET /api/trabajadores/:id/asignaciones?incluir_inactivos=1 */
export const historial = asyncHandler(async (req, res) => {
  const datos = await historialDeTrabajador(req.params.id, {
    incluirInactivos: incluirInactivos(req),
  })
  return res.json(datos)
})

/** GET /api/trabajadores/:id/asignaciones/documento?incluir_inactivos=1 */
export const descargarDocumento = asyncHandler(async (req, res) => {
  const historial = await historialDeTrabajador(req.params.id, {
    incluirInactivos: incluirInactivos(req),
  })
  const { nombreArchivo, contenido } = documentoHistorial(historial)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`)
  res.setHeader('Cache-Control', 'no-store')
  return res.send(contenido)
})
