import {
  listarHerramientas,
  listarAlmacenes,
  registrarAlmacen,
  actualizarAlmacen,
  darDeBajaAlmacen,
  reactivarAlmacen,
  obtenerHerramienta,
  registrarHerramienta,
  actualizarHerramienta,
  darDeBajaHerramienta,
  reactivarHerramienta,
} from '../services/herramientaService.js'
import { RegistrarHerramientaDto } from '../dtos/herramienta/RegistrarHerramientaDto.js'
import { cambiarEstado, historialReparaciones } from '../services/herramientaEstadoService.js'
import { asyncHandler, contexto } from '../utils/http.js'

const verdadero = (v) => ['1', 'true', 'on'].includes(String(v))

/**
 * GET /api/herramientas -> catálogo de herramientas (HU-10).
 * `?buscar=` `?almacen_id=` `?estado_operativo=` `?disponibilidad=` filtran;
 * `?prestable=1` deja solo las que hoy pueden salir a préstamo;
 * `?incluirInactivos=1` incluye las dadas de baja (HU-18).
 */
export const listar = asyncHandler(async (req, res) => {
  return res.json(
    await listarHerramientas({
      incluirInactivos: verdadero(req.query.incluirInactivos),
      buscar: req.query.buscar ?? req.query.q ?? '',
      almacenId: req.query.almacen_id || null,
      estadoOperativo: req.query.estado_operativo ?? '',
      disponibilidad: req.query.disponibilidad ?? '',
      prestable: verdadero(req.query.prestable),
    }),
  )
})

export const obtener = asyncHandler(async (req, res) => {
  return res.json(await obtenerHerramienta(req.params.id))
})

/** GET /api/herramientas/almacenes -> almacenes activos para el selector. */
export const almacenes = asyncHandler(async (req, res) => {
  return res.json(await listarAlmacenes({ incluirInactivos: verdadero(req.query.incluirInactivos) }))
})

export const registrarAlm = asyncHandler(async (req, res) => {
  const almacen = await registrarAlmacen(req.body, contexto(req))
  return res.status(201).json({ message: 'Almacén registrado correctamente', almacen })
})

export const actualizarAlm = asyncHandler(async (req, res) => {
  const almacen = await actualizarAlmacen(req.params.id, req.body, contexto(req))
  return res.json({ message: 'Almacén actualizado', almacen })
})

export const bajaAlm = asyncHandler(async (req, res) => {
  return res.json({ message: 'Almacén dado de baja', ...(await darDeBajaAlmacen(req.params.id, contexto(req))) })
})

export const reactivarAlm = asyncHandler(async (req, res) => {
  return res.json({ message: 'Almacén reactivado', ...(await reactivarAlmacen(req.params.id, contexto(req))) })
})

export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarHerramientaDto.fromRequestBody(req.body)
  const herramienta = await registrarHerramienta(dto, contexto(req))
  return res.status(201).json({ message: 'Herramienta registrada correctamente', herramienta })
})

export const actualizar = asyncHandler(async (req, res) => {
  const herramienta = await actualizarHerramienta(req.params.id, req.body, contexto(req))
  return res.json({ message: 'Herramienta actualizada', herramienta })
})

export const baja = asyncHandler(async (req, res) => {
  const resultado = await darDeBajaHerramienta(req.params.id, contexto(req))
  return res.json({ message: 'Herramienta dada de baja', ...resultado })
})

export const reactivarCtrl = asyncHandler(async (req, res) => {
  const resultado = await reactivarHerramienta(req.params.id, contexto(req))
  return res.json({ message: 'Herramienta reactivada', ...resultado })
})

// HU-37: enviar a reparación, volver a disponible o dar de baja (definitiva).
export const estado = asyncHandler(async (req, res) =>
  res.json({ message: 'Estado actualizado', herramienta: await cambiarEstado(req.params.id, req.body, contexto(req)) }))

export const reparaciones = asyncHandler(async (req, res) => res.json(await historialReparaciones(req.params.id)))
