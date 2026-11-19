import { resumenCostos, consolidarProyecto, ultimaConsolidacion } from '../services/consolidacionCostoService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * HU-15 · costo real consolidado por proyecto.
 *
 * `GET  /api/costos`                lista de proyectos con su costo y desviación.
 * `GET  /api/costos/proyectos/:id`  último corte e historial del proyecto.
 * `POST /api/costos/proyectos/:id`  ejecuta la consolidación y guarda el corte.
 */

export const resumen = asyncHandler(async (req, res) =>
  res.json(await resumenCostos({ estado: req.query.estado ?? '' })))

export const ultima = asyncHandler(async (req, res) =>
  res.json(await ultimaConsolidacion(req.params.id)))

export const consolidar = asyncHandler(async (req, res) => {
  const consolidacion = await consolidarProyecto(req.params.id, contexto(req))
  return res.status(201).json({ message: 'Costo consolidado', consolidacion })
})
