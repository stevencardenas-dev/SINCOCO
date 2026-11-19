import { generar, exportar, proyectos } from '../services/reporteService.js'
import { asyncHandler } from '../utils/http.js'

/**
 * HU-25 · reportes.
 *
 * GET /api/reportes?tipo=&desde=&hasta=&proyecto_id=   filas del reporte
 * GET /api/reportes/proyectos                          proyectos para el filtro
 * GET /api/reportes/exportar?formato=csv|html          archivo descargable
 */

export const listar = asyncHandler(async (req, res) => {
  const reporte = await generar(req.query)
  return res.json(reporte)
})

export const listaProyectos = asyncHandler(async (_req, res) => {
  return res.json({ proyectos: await proyectos() })
})

export const descargar = asyncHandler(async (req, res) => {
  const { nombre, tipo, contenido } = await exportar(req.query, req.query.formato)
  res.setHeader('Content-Type', tipo)
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`)
  return res.send(contenido)
})
