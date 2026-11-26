import {
  listarServicios, registrarServicio, autorizarServicio, rechazarServicio, reajustarValor,
} from '../services/servicioExternoService.js'
import { RegistrarServicioExternoDto } from '../dtos/servicioExterno/RegistrarServicioExternoDto.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** GET /api/servicios-externos?proyecto_id=&actividad_id=&proveedor_id=&estado= */
export const listar = asyncHandler(async (req, res) => res.json(await listarServicios(req.query, req.user)))

/**
 * POST /api/servicios-externos -> HU-28. HU-32: si el valor excede el
 * presupuesto de la actividad, el servicio se guarda pendiente de autorización y
 * se notifica al gerente; la respuesta lo indica con `autorizacion_estado`.
 */
export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarServicioExternoDto.fromRequestBody(req.body)
  const servicio = await registrarServicio(dto, contexto(req))
  const pendiente = servicio.autorizacion_estado === 'PENDIENTE'
  return res.status(201).json({
    message: pendiente
      ? 'Servicio registrado; queda pendiente de autorización del gerente por exceder el presupuesto'
      : 'Servicio externo registrado correctamente',
    servicio,
  })
})

/** PATCH /api/servicios-externos/:id/autorizar -> HU-32 (gerente). */
export const autorizar = asyncHandler(async (req, res) =>
  res.json({ message: 'Servicio autorizado', servicio: await autorizarServicio(req.params.id, req.body, contexto(req)) }))

/** PATCH /api/servicios-externos/:id/rechazar -> HU-32 (gerente). */
export const rechazar = asyncHandler(async (req, res) =>
  res.json({ message: 'Servicio rechazado para reajuste', servicio: await rechazarServicio(req.params.id, req.body, contexto(req)) }))

/** PATCH /api/servicios-externos/:id/valor -> HU-32, reajuste del administrador. */
export const reajustar = asyncHandler(async (req, res) =>
  res.json({ message: 'Valor reajustado', servicio: await reajustarValor(req.params.id, req.body, contexto(req)) }))
