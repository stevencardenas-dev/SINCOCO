import {
  registrarProyecto,
  actualizarProyecto, listarProyectos, darDeBajaProyecto, reactivarProyecto,
} from '../services/proyectoService.js'
import { miAcceso } from '../services/accesoService.js'
import { RegistrarProyectoDto } from '../dtos/proyecto/RegistrarProyectoDto.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * POST /api/proyectos (HU-02 · CU-02)
 * Recibe la petición HTTP, arma el DTO, delega en el service y devuelve
 * la respuesta. No contiene lógica de negocio ni SQL. El usuario que
 * registra el proyecto sale del JWT (HU-01), no del body.
 */
export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarProyectoDto.fromRequestBody(req.body)
  const proyecto = await registrarProyecto(dto, contexto(req))

  return res.status(201).json({
    message: 'Proyecto registrado correctamente',
    proyecto,
  })
})

/**
 * GET /api/proyectos
 * Lista los proyectos activos para el módulo de proyectos.
 * `?incluirInactivos=1` incluye los dados de baja (HU-18).
 * `?buscar=` `?estado=` `?cliente_id=` `?responsable_id=` filtran el listado
 * desde la API, porque el volumen de proyectos no se resuelve solo en el
 * navegador.
 */
export const listar = asyncHandler(async (req, res) => {
  const incluirInactivos = ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))
  const proyectos = await listarProyectos(
    {
      incluirInactivos,
      buscar: req.query.buscar ?? req.query.q ?? '',
      estado: req.query.estado ?? '',
      clienteId: req.query.cliente_id || null,
      responsableId: req.query.responsable_id || null,
    },
    req.user,
  )
  return res.json(proyectos)
})

/** PATCH /api/proyectos/:id/baja -> HU-18: baja lógica. */
/** PATCH /api/proyectos/:id -> editar la información del proyecto. */
export const actualizar = asyncHandler(async (req, res) => {
  const proyecto = await actualizarProyecto(req.params.id, req.body, contexto(req))
  return res.json({ message: 'Proyecto actualizado', proyecto })
})

export const baja = asyncHandler(async (req, res) => {
  const resultado = await darDeBajaProyecto(req.params.id, contexto(req))
  return res.json({ message: 'Proyecto dado de baja', ...resultado })
})

/** PATCH /api/proyectos/:id/reactivar -> HU-18. */
export const reactivarCtrl = asyncHandler(async (req, res) => {
  const resultado = await reactivarProyecto(req.params.id, contexto(req))
  return res.json({ message: 'Proyecto reactivado', ...resultado })
})

/** GET /api/proyectos/:id/mi-acceso -> qué puede hacer el usuario en el proyecto. */
export const miAccesoCtrl = asyncHandler(async (req, res) => {
  return res.json(await miAcceso(req.user, req.params.id))
})
