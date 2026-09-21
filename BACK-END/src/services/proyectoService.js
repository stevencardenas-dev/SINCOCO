const proyectoRepository = require('../repositories/proyectoRepository');
const clienteRepository = require('../repositories/clienteRepository');
const trabajadorRepository = require('../repositories/trabajadorRepository');
const usuarioRepository = require('../repositories/usuarioRepository');
const AppError = require('../utils/AppError');

// Valores iniciales definidos por HU-02 / CU-02
const ESTADO_INICIAL = 'PLANIFICACION';
const AVANCE_INICIAL = 0;

/**
 * Registra un nuevo proyecto aplicando las validaciones de HU-02:
 *  - presupuesto_inicial > 0
 *  - fecha_inicio_programada < fecha_fin_programada
 *  - cliente_id existente
 *  - responsable_id existente y activo (trabajador no dado de baja)
 *  - creado_por_usuario_id existente
 *  - codigo único
 * Aplica los valores iniciales: estado = PLANIFICACION,
 * porcentaje_avance_total = 0.
 */
async function registrarProyecto(dto) {
  if (dto.presupuesto_inicial <= 0) {
    throw new AppError('El presupuesto inicial debe ser mayor que 0', 400);
  }

  const fechaInicio = new Date(dto.fecha_inicio_programada);
  const fechaFin = new Date(dto.fecha_fin_programada);
  if (fechaInicio >= fechaFin) {
    throw new AppError(
      'La fecha de inicio programada debe ser anterior a la fecha de finalización programada',
      400
    );
  }

  const cliente = await clienteRepository.findById(dto.cliente_id);
  if (!cliente) {
    throw new AppError('El cliente indicado no existe', 404);
  }

  const responsable = await trabajadorRepository.findById(dto.responsable_id);
  if (!responsable) {
    throw new AppError('El responsable indicado no existe', 404);
  }
  if (!responsable.activo) {
    throw new AppError(
      'El responsable indicado se encuentra dado de baja y no puede ser asignado a un proyecto',
      400
    );
  }

  const usuarioCreador = await usuarioRepository.findById(dto.creado_por_usuario_id);
  if (!usuarioCreador) {
    throw new AppError('El usuario que registra el proyecto no existe', 404);
  }

  const proyectoConMismoCodigo = await proyectoRepository.findByCodigo(dto.codigo);
  if (proyectoConMismoCodigo) {
    throw new AppError('Ya existe un proyecto registrado con ese código', 409);
  }

  const nuevoProyectoId = await proyectoRepository.create({
    codigo: dto.codigo,
    cliente_id: dto.cliente_id,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    ubicacion: dto.ubicacion,
    fecha_inicio_programada: dto.fecha_inicio_programada,
    fecha_fin_programada: dto.fecha_fin_programada,
    responsable_id: dto.responsable_id,
    creado_por_usuario_id: dto.creado_por_usuario_id,
    presupuesto_inicial: dto.presupuesto_inicial,
    porcentaje_avance_total: AVANCE_INICIAL,
    estado: ESTADO_INICIAL,
    observaciones: dto.observaciones,
  });

  return proyectoRepository.findById(nuevoProyectoId);
}

module.exports = { registrarProyecto };
