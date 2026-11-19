import * as actividadRepository from '../repositories/actividadRepository.js'
import { verificarProyectoOperable } from '../services/proyectoEstadoService.js'
import { asyncHandler } from '../utils/http.js'

/**
 * HU-38 · guarda de operaciones.
 *
 * Un proyecto congelado o finalizado (o cancelado, o dado de baja) no admite
 * altas nuevas. Se monta delante de las rutas que crean operaciones, así la
 * regla se cumple en un solo lugar y no se puede olvidar en un controlador.
 *
 * El proyecto sale del cuerpo: `proyecto_id` en asignaciones, solicitudes,
 * préstamos y servicios externos.
 */
export const requireProyectoOperable = asyncHandler(async (req, res, next) => {
  await verificarProyectoOperable(req.body?.proyecto_id ?? req.body?.proyectoId ?? null)
  return next()
})

/**
 * Igual que la anterior, pero para operaciones que llegan por actividad (el
 * consumo de materiales). Sin actividad no hace nada.
 */
export const requireProyectoOperableDeActividad = asyncHandler(async (req, res, next) => {
  const actividadId = req.body?.actividad_id ?? req.body?.actividadId ?? null
  if (actividadId) {
    const actividad = await actividadRepository.findById(Number(actividadId))
    if (actividad?.proyecto_id) await verificarProyectoOperable(Number(actividad.proyecto_id))
  }
  return next()
})
