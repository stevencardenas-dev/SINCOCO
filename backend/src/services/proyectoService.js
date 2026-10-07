import * as clienteRepository from '../repositories/clienteRepository.js'
import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import * as usuarioRepository from '../repositories/usuarioRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import { alcanceDeUsuario, verificarAccesoProyecto } from './accesoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { crearBajaReactivar } from './bajaReactivar.js'
import { AppError } from '../utils/AppError.js'

// Valores iniciales definidos por HU-02 / CU-02 y por el DEFAULT del esquema.
const ESTADO_INICIAL = 'PLANIFICACION'
const AVANCE_INICIAL = 0

// presupuesto_inicial es decimal(15,2): 13 dígitos enteros como máximo.
const PRESUPUESTO_MAXIMO = 9_999_999_999_999

/**
 * Registra un nuevo proyecto (HU-02 · CU-02) aplicando los criterios de
 * aceptación de docs/reglas-de-negocio/HU_CRITERIOS_ACEPTACION.md:
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
  // Criterio 2: presupuesto numérico mayor a cero. Se valida el rango completo
  // (0, 9.999.999.999.999]: por encima del tope la columna no puede
  // representarlo, así que se rechaza antes de intentar la inserción.
  if (!(dto.presupuesto_inicial > 0)) {
    throw new AppError('El presupuesto inicial debe ser mayor que 0', 400, 'presupuesto_inicial')
  }
  if (dto.presupuesto_inicial > PRESUPUESTO_MAXIMO) {
    throw new AppError(
      `El presupuesto inicial supera el máximo permitido (${PRESUPUESTO_MAXIMO.toLocaleString('es-CO')})`,
      400,
      'presupuesto_inicial',
    )
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
  if (!cliente.activo) {
    throw new AppError('El cliente indicado está dado de baja y no puede asociarse a un proyecto', 400, 'cliente_id')
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
 * Actualiza la información de un proyecto (HU-02).
 *
 * Se vuelven a aplicar las mismas reglas del registro, porque una edición
 * puede dejarlo inconsistente: presupuesto mayor que cero y dentro del rango de
 * la columna, fechas coherentes, cliente existente y responsable existente y no
 * dado de baja. El `codigo` no se edita: es el identificador con el que el
 * proyecto se cita en la obra y en la bitácora.
 *
 * La edición queda registrada en la bitácora (RF31 · RN07) con los campos
 * cambiados, igual que cualquier otro cambio de datos.
 */
const CAMPOS_EDITABLES = [
  'cliente_id', 'nombre', 'descripcion', 'ubicacion',
  'fecha_inicio_programada', 'fecha_fin_programada',
  'responsable_id', 'presupuesto_inicial', 'estado', 'observaciones',
]

const ESTADOS_VALIDOS = ['PLANIFICACION', 'EN_EJECUCION', 'PAUSADO', 'FINALIZADO', 'CANCELADO']

export async function actualizarProyecto(id, cambios = {}, ctx = {}) {
  // RBAC: quien edita sin alcance total solo puede hacerlo en sus proyectos.
  await verificarAccesoProyecto(ctx.usuario, id)
  const actual = await proyectoRepository.findById(id)
  if (!actual) throw new AppError('Proyecto no encontrado', 404)

  const campos = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (cambios[campo] !== undefined) campos[campo] = cambios[campo]
  }
  if (Object.keys(campos).length === 0) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  // Criterio 2: presupuesto numérico, mayor que cero y dentro del rango.
  if (campos.presupuesto_inicial !== undefined) {
    campos.presupuesto_inicial = Number(campos.presupuesto_inicial)
    if (!(campos.presupuesto_inicial > 0)) {
      throw new AppError('El presupuesto inicial debe ser mayor que 0', 400, 'presupuesto_inicial')
    }
    if (campos.presupuesto_inicial > PRESUPUESTO_MAXIMO) {
      throw new AppError(
        `El presupuesto inicial supera el máximo permitido (${PRESUPUESTO_MAXIMO.toLocaleString('es-CO')})`,
        400,
        'presupuesto_inicial',
      )
    }
  }

  // Criterio 3: fechas coherentes, comparando con el valor vigente.
  const inicio = new Date(campos.fecha_inicio_programada ?? actual.fecha_inicio_programada)
  const fin = new Date(campos.fecha_fin_programada ?? actual.fecha_fin_programada)
  if (inicio >= fin) {
    throw new AppError(
      'La fecha de inicio programada debe ser anterior a la fecha de finalización programada',
      400,
      'fecha_fin_programada',
    )
  }

  // Criterio 1: cliente y responsable siguen existiendo (y el responsable activo).
  if (campos.cliente_id !== undefined) {
    const cliente = await clienteRepository.findById(campos.cliente_id)
    if (!cliente) {
      throw new AppError('El cliente indicado no existe; regístrelo antes de continuar', 404, 'cliente_id')
    }
    // Solo se exige cliente activo si se cambia de cliente: conservar el actual
    // no debe impedir editar el resto del proyecto.
    if (!cliente.activo && Number(campos.cliente_id) !== Number(actual.cliente_id)) {
      throw new AppError('El cliente indicado está dado de baja y no puede asociarse a un proyecto', 400, 'cliente_id')
    }
  }
  if (campos.responsable_id !== undefined) {
    const responsable = await trabajadorRepository.findById(campos.responsable_id)
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
  }

  if (campos.estado !== undefined) {
    campos.estado = String(campos.estado).toUpperCase()
    if (!ESTADOS_VALIDOS.includes(campos.estado)) {
      throw new AppError(`estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`, 400, 'estado')
    }
  }

  await proyectoRepository.update(id, campos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'proyectos',
    registroId: Number(id),
    detalles: { codigo: actual.codigo, cambios: campos },
    ip: ctx.ip,
  })

  return proyectoRepository.findById(id)
}

/**
 * Lista los proyectos activos (módulo de proyectos, HU-02). `incluirInactivos`
 * permite consultar los dados de baja (HU-18).
 *
 * RBAC: el resultado se limita al alcance del usuario. Quien tiene
 * `proyectos.acceso_total` (administrador y gerente) ve todo; los demás roles
 * ven solo los proyectos donde están asignados o de los que son responsables.
 */
export async function listarProyectos(filtros = {}, usuario = null) {
  const alcance = await alcanceDeUsuario(usuario)
  return proyectoRepository.listar({
    ...filtros,
    soloTrabajadorId: alcance.total ? null : alcance.trabajadorId,
  })
}

/**
 * HU-18: baja lógica y reactivación de proyectos. No se borra nada: se marca
 * inactivo, se registra la fecha y el usuario, y se conserva el historial.
 */
const bajaReactivar = crearBajaReactivar({
  tabla: 'proyectos',
  mensajes: {
    noEncontrado: 'Proyecto no encontrado',
    yaDeBaja: 'El proyecto ya estaba dado de baja',
    noEstaDeBaja: 'El proyecto no está dado de baja',
  },
  verificarPrevio: (id, ctx) => verificarAccesoProyecto(ctx.usuario, id),
  buscar: (id) => proyectoRepository.findById(id),
  detallesBaja: (proyecto) => ({ codigo: proyecto.codigo }),
})

export const darDeBajaProyecto = bajaReactivar.darDeBaja
export const reactivarProyecto = bajaReactivar.reactivar
