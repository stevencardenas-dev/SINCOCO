import { registrarProyecto, listarProyectos } from '../services/proyectoService.js'
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
 */
export async function listar(req, res, next) {
  try {
    const proyectos = await listarProyectos()
    return res.json(proyectos)
  } catch (error) {
    return next(error)
  }
}
