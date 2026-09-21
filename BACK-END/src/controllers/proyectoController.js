const proyectoService = require('../services/proyectoService');
const RegistrarProyectoDto = require('../dtos/proyecto/RegistrarProyectoDto');

/**
 * POST /api/proyectos
 * Recibe la petición HTTP, arma el DTO, delega en el service y
 * devuelve la respuesta HTTP. No contiene lógica de negocio ni SQL.
 */
async function registrar(req, res, next) {
  try {
    const dto = RegistrarProyectoDto.fromRequestBody(req.body);
    const proyecto = await proyectoService.registrarProyecto(dto);

    return res.status(201).json({
      success: true,
      message: 'Proyecto registrado correctamente',
      data: proyecto,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { registrar };
