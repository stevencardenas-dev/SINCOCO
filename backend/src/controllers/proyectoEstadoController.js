import { congelarProyecto, reanudarProyecto, finalizarProyecto } from '../services/proyectoEstadoService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * HU-38 · transiciones de estado del proyecto.
 *
 * `PATCH /api/proyectos/:id/congelar`  EN_EJECUCION → PAUSADO (congelado).
 * `PATCH /api/proyectos/:id/reanudar`  PAUSADO → EN_EJECUCION.
 * `PATCH /api/proyectos/:id/finalizar` EN_EJECUCION|PAUSADO → FINALIZADO.
 *
 * Las tres exigen `motivo`; finalizar además acepta `confirmar` cuando el
 * avance es menor a 100%.
 */

const cuerpo = (req) => ({
  motivo: req.body?.motivo,
  confirmar: req.body?.confirmar === true || req.body?.confirmar === 'si',
})

export const congelar = asyncHandler(async (req, res) => {
  const r = await congelarProyecto(req.params.id, cuerpo(req), contexto(req))
  return res.json({ message: 'Proyecto congelado', ...r })
})

export const reanudar = asyncHandler(async (req, res) => {
  const r = await reanudarProyecto(req.params.id, cuerpo(req), contexto(req))
  return res.json({ message: 'Proyecto reanudado', ...r })
})

export const finalizar = asyncHandler(async (req, res) => {
  const r = await finalizarProyecto(req.params.id, cuerpo(req), contexto(req))
  return res.json({ message: 'Proyecto finalizado', ...r })
})
