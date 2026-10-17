import { listarPlantillas, aplicarPlantilla } from '../services/plantillaEtapaService.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** GET /api/plantillas-etapas -> catálogo de plantillas con sus etapas. */
export const listar = asyncHandler(async (req, res) => res.json(await listarPlantillas()))

/** POST /api/plantillas-etapas/aplicar -> crea las etapas de la plantilla en un proyecto. */
export const aplicar = asyncHandler(async (req, res) => {
  const { proyecto_id: proyectoId, plantilla_id: plantillaId, confirmar } = req.body ?? {}
  for (const [campo, valor] of [['proyecto_id', proyectoId], ['plantilla_id', plantillaId]]) {
    if (valor === undefined || valor === null || Number.isNaN(Number(valor))) {
      throw new AppError(`${campo} es obligatorio y debe ser numérico`, 400, campo)
    }
  }
  const resultado = await aplicarPlantilla(
    { proyecto_id: Number(proyectoId), plantilla_id: Number(plantillaId), confirmar: confirmar === true },
    contexto(req),
  )
  return res.status(201).json({ message: 'Plantilla aplicada correctamente', ...resultado })
})
