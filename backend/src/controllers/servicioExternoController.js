import { listarServicios, registrarServicio } from '../services/servicioExternoService.js'
import { RegistrarServicioExternoDto } from '../dtos/servicioExterno/RegistrarServicioExternoDto.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** GET /api/servicios-externos?proyecto_id=&actividad_id=&proveedor_id=&estado= */
export const listar = asyncHandler(async (req, res) => res.json(await listarServicios(req.query, req.user)))

/**
 * POST /api/servicios-externos -> HU-28. Si el valor excede el presupuesto de la
 * actividad responde 409 (EXCEDE_PRESUPUESTO) hasta que llegue `confirmar_exceso: true`.
 */
export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarServicioExternoDto.fromRequestBody(req.body)
  const servicio = await registrarServicio(dto, contexto(req))
  return res.status(201).json({ message: 'Servicio externo registrado correctamente', servicio })
})
