import * as clienteRepository from '../repositories/clienteRepository.js'
import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import * as usuarioRepository from '../repositories/usuarioRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

// Valores iniciales definidos por HU-02 / CU-02 y por el DEFAULT del esquema.
const ESTADO_INICIAL = 'PLANIFICACION'
const AVANCE_INICIAL = 0

/**
 * Registra un nuevo proyecto (HU-02 · CU-02) aplicando los criterios de
 * aceptación de docs/HU_CRITERIOS_ACEPTACION.md:
 *  - presupuesto_inicial numérico y mayor a cero.
 *  - fecha_inicio_programada estrictamente anterior a fecha_fin_programada
 *    (CU-02 Alt 1: fechas inconsistentes → se impide el registro).
 *  - cliente_id existente (CU-02 Alt 2: cliente no registrado → se exige
 *    registrarlo antes de continuar).
 *  - responsable_id existente y activo (trabajador no dado de baja).
 *  - usuario creador existente (viene del JWT, no del body).
 *  - codigo único (UNIQUE KEY del esquema).
 * Aplica los valores iniciales de planificación: estado = PLANIFICACION y
 * porcentaje_avance_total = 0, y deja constancia en la bitácora (RF31).
 *
 * `ctx` = { usuarioId, ip }, extraído del token por la capa HTTP.
 */
export async function registrarProyecto(dto, ctx = {}) {
  // Criterio 2: presupuesto numérico mayor a cero.
  if (!(dto.presupuesto_inicial > 0)) {
    throw new AppError('El presupuesto inicial debe ser mayor que 0', 400, 'presupuesto_inicial')
  }

  // Criterio 3: fecha de inicio estrictamente anterior a la de fin.
  const fechaInicio = new Date(dto.fecha_inicio_programada)
  const fechaFin = new Date(dto.fecha_fin_programada)
  if (fechaInicio >= fechaFin) {
    throw new AppError(
      'La fecha de inicio programada debe ser anterior a la fecha de finalización programada',
      400,
      'fecha_fin_programada',
    )
  }

  // Criterio 1: cliente válido y existente.
  const cliente = await clienteRepository.findById(dto.cliente_id)
  if (!cliente) {
    throw new AppError('El cliente indicado no existe; regístrelo antes de continuar', 404, 'cliente_id')
  }

  // Criterio 1: responsable válido, existente y no dado de baja (HU-18:
  // los datos nunca se borran, se marcan inactivos).
  const responsable = await trabajadorRepository.findById(dto.responsable_id)
  if (!responsable) {
    throw new AppError('El responsable indicado no existe', 404, 'responsable_id')
  }
  if (!responsable.activo) {
    throw new AppError(
      'El responsable indicado se encuentra dado de baja y no puede ser asignado a un proyecto',
      400,
      'responsable_id',
    )
  }

  // El creador viene del JWT; solo se confirma que exista (FK NOT NULL).
  const usuarioCreador = await usuarioRepository.findById(ctx.usuarioId)
  if (!usuarioCreador) {
    throw new AppError('El usuario autenticado no existe', 401)
  }

  // Criterio 1: código único.
  const proyectoConMismoCodigo = await proyectoRepository.findByCodigo(dto.codigo)
  if (proyectoConMismoCodigo) {
    throw new AppError('Ya existe un proyecto registrado con ese código', 409, 'codigo')
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
    creado_por_usuario_id: ctx.usuarioId,
    presupuesto_inicial: dto.presupuesto_inicial,
    porcentaje_avance_total: AVANCE_INICIAL,
    estado: ESTADO_INICIAL,
    observaciones: dto.observaciones,
  })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'proyectos',
    registroId: nuevoProyectoId,
    detalles: {
      codigo: dto.codigo,
      nombre: dto.nombre,
      cliente_id: dto.cliente_id,
      responsable_id: dto.responsable_id,
      presupuesto_inicial: dto.presupuesto_inicial,
    },
    ip: ctx.ip,
  })

  // Se devuelve el proyecto con los valores generados por la base
  // (creado_en, actualizado_en) y los nombres de cliente/responsable.
  return proyectoRepository.findById(nuevoProyectoId)
}

/**
 * Lista los proyectos activos (módulo de proyectos, HU-02).
 */
export async function listarProyectos() {
  return proyectoRepository.listarActivos()
}
