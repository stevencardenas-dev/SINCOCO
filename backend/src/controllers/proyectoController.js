import {
  registrarProyecto,
  actualizarProyecto, listarProyectos, darDeBajaProyecto, reactivarProyecto,
} from '../services/proyectoService.js'
import { RegistrarProyectoDto } from '../dtos/proyecto/RegistrarProyectoDto.js'

/**
 * POST /api/proyectos (HU-02 · CU-02)
 * Recibe la petición HTTP, arma el DTO, delega en el service y devuelve
 * la respuesta. No contiene lógica de negocio ni SQL. El usuario que
 * registra el proyecto sale del JWT (HU-01), no del body.
 */
export async function registrar(req, res, next) {
  try {
    const dto = RegistrarProyectoDto.fromRequestBody(req.body)
    const proyecto = await registrarProyecto(dto, {
      usuarioId: req.user.id,
      ip: req.ip,
    })

    return res.status(201).json({
      message: 'Proyecto registrado correctamente',
      proyecto,
    })
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/proyectos
 * Lista los proyectos activos para el módulo de proyectos.
 * `?incluirInactivos=1` incluye los dados de baja (HU-18).
 * `?buscar=` `?estado=` `?cliente_id=` `?responsable_id=` filtran el listado
 * desde la API, porque el volumen de proyectos no se resuelve solo en el
 * navegador.
 */
export async function listar(req, res, next) {
  try {
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
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/proyectos/:id/baja -> HU-18: baja lógica. */
/** PATCH /api/proyectos/:id -> editar la información del proyecto. */
export async function actualizar(req, res, next) {
  try {
    const proyecto = await actualizarProyecto(req.params.id, req.body, {
      usuarioId: req.user.id,
      ip: req.ip,
    })
    return res.json({ message: 'Proyecto actualizado', proyecto })
  } catch (error) {
    return next(error)
  }
}

export async function baja(req, res, next) {
  try {
    const resultado = await darDeBajaProyecto(req.params.id, { usuarioId: req.user.id, ip: req.ip })
    return res.json({ message: 'Proyecto dado de baja', ...resultado })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/proyectos/:id/reactivar -> HU-18. */
export async function reactivarCtrl(req, res, next) {
  try {
    const resultado = await reactivarProyecto(req.params.id, { usuarioId: req.user.id, ip: req.ip })
    return res.json({ message: 'Proyecto reactivado', ...resultado })
  } catch (error) {
    return next(error)
  }
}
