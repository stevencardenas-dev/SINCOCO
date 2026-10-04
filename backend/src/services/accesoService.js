import * as asignacionRepository from '../repositories/asignacionRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import * as usuarioRepository from '../repositories/usuarioRepository.js'
import { rolTienePermiso } from '../middleware/permisos.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { validarFechasEnRango } from '../utils/fechas.js'
import { AppError } from '../utils/AppError.js'

/**
 * Gestión de acceso a proyectos y actividades (RBAC).
 *
 * El permiso `proyectos.listar` dice quién puede entrar al módulo; el alcance
 * dice qué ve cada quien dentro de él:
 *
 *   - `proyectos.acceso_total` (administrador y gerente): todos los proyectos.
 *   - el resto de los roles: solo los proyectos donde la persona está asignada
 *     (`asignaciones_personal` en estado ACTIVO) o de los que es responsable.
 *
 * Las asignaciones las administra quien tenga `proyectos.gestionar_acceso`
 * (el administrador). Igual que el resto de la matriz, los permisos se leen de
 * `roles_permisos`: cambiar la matriz cambia el alcance sin tocar el código.
 */

export const PERMISO_ACCESO_TOTAL = 'proyectos.acceso_total'
export const PERMISO_GESTIONAR_ACCESO = 'proyectos.gestionar_acceso'

export const ESTADOS_ASIGNACION = ['ACTIVO', 'FINALIZADO', 'REASIGNADO']

/**
 * Alcance del usuario autenticado: `total` si su rol ve todos los proyectos y,
 * si no, el trabajador con el que se limita la consulta (puede no tener ficha:
 * en ese caso no accede a ningún proyecto sin asignación explícita).
 */
export async function alcanceDeUsuario(usuario) {
  if (!usuario) return { total: false, trabajadorId: null }
  if (await rolTienePermiso(usuario.rol, PERMISO_ACCESO_TOTAL)) {
    return { total: true, trabajadorId: null }
  }
  const cuenta = await usuarioRepository.findParaAcceso(usuario.id)
  return { total: false, trabajadorId: cuenta?.trabajador_id ? Number(cuenta.trabajador_id) : null }
}

/** Verifica el acceso a un proyecto concreto; lanza 403 si no lo tiene. */
export async function verificarAccesoProyecto(usuario, proyectoId) {
  const alcance = await alcanceDeUsuario(usuario)
  if (alcance.total) return alcance
  const permitido = await asignacionRepository.tieneAcceso(proyectoId, alcance.trabajadorId)
  if (!permitido) {
    throw new AppError('No tiene acceso a este proyecto: pida que lo asignen a él', 403)
  }
  return alcance
}

/** Lista las asignaciones de un proyecto (o de un trabajador). */
export async function listarAsignaciones(filtros = {}, usuario = null) {
  // Quien consulta el acceso de un proyecto debe poder verlo.
  if (filtros.proyectoId) await verificarAccesoProyecto(usuario, filtros.proyectoId)
  return asignacionRepository.listar(filtros)
}

/**
 * Asigna un trabajador a un proyecto (o a una de sus actividades).
 *
 * Reglas:
 *  - el proyecto y el trabajador existen y están activos;
 *  - si se indica actividad, pertenece al proyecto y está activa;
 *  - las fechas quedan dentro del rango del proyecto y son coherentes;
 *  - no se duplica una asignación activa al mismo destino.
 */
export async function registrarAsignacion(dto, ctx = {}) {
  const proyecto = await proyectoRepository.findById(dto.proyecto_id)
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  if (!proyecto.activo) throw new AppError('El proyecto está dado de baja', 400, 'proyecto_id')

  const trabajador = await trabajadorRepository.findById(dto.trabajador_id)
  if (!trabajador) throw new AppError('El trabajador indicado no existe', 404, 'trabajador_id')
  if (!trabajador.activo) {
    throw new AppError('El trabajador está dado de baja y no se puede asignar', 400, 'trabajador_id')
  }

  if (dto.actividad_id) {
    const actividad = await actividadRepository.findById(dto.actividad_id)
    if (!actividad) throw new AppError('La actividad indicada no existe', 404, 'actividad_id')
    if (!actividad.activo) throw new AppError('La actividad está dada de baja', 400, 'actividad_id')
    if (Number(actividad.proyecto_id) !== Number(dto.proyecto_id)) {
      throw new AppError('La actividad no pertenece al proyecto indicado', 400, 'actividad_id')
    }
  }

  validarFechasEnRango(dto.fecha_inicio, dto.fecha_fin_programada, proyecto)

  const duplicada = await asignacionRepository.existeActiva(
    dto.trabajador_id,
    dto.proyecto_id,
    dto.actividad_id,
  )
  if (duplicada) {
    throw new AppError(
      dto.actividad_id
        ? 'Ese trabajador ya está asignado a esa actividad'
        : 'Ese trabajador ya está asignado a ese proyecto',
      409,
      'trabajador_id',
    )
  }

  const id = await asignacionRepository.create({
    trabajador_id: dto.trabajador_id,
    proyecto_id: dto.proyecto_id,
    actividad_id: dto.actividad_id,
    fecha_inicio: dto.fecha_inicio,
    fecha_fin_programada: dto.fecha_fin_programada,
    rol_en_proyecto: dto.rol_en_proyecto,
    estado: 'ACTIVO',
    observaciones: dto.observaciones,
  })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'asignaciones_personal',
    registroId: id,
    detalles: {
      proyecto_id: dto.proyecto_id,
      trabajador_id: dto.trabajador_id,
      actividad_id: dto.actividad_id,
      rol_en_proyecto: dto.rol_en_proyecto,
    },
    ip: ctx.ip,
  })

  return asignacionRepository.findById(id)
}

/**
 * Actualiza una asignación: rol en el proyecto, fechas, observaciones o estado
 * (finalizar o reasignar). Al finalizar se completa la fecha real de fin.
 */
export async function actualizarAsignacion(id, cambios = {}, ctx = {}) {
  const actual = await asignacionRepository.findById(id)
  if (!actual) throw new AppError('La asignación no existe', 404)

  const campos = {}
  for (const campo of ['rol_en_proyecto', 'fecha_fin_programada', 'fecha_fin_real', 'observaciones']) {
    if (cambios[campo] !== undefined) campos[campo] = cambios[campo] === '' ? null : cambios[campo]
  }

  if (cambios.estado !== undefined) {
    const estado = String(cambios.estado).toUpperCase()
    if (!ESTADOS_ASIGNACION.includes(estado)) {
      throw new AppError(`estado debe ser uno de: ${ESTADOS_ASIGNACION.join(', ')}`, 400, 'estado')
    }
    campos.estado = estado
    if (estado === 'FINALIZADO' && !campos.fecha_fin_real) {
      campos.fecha_fin_real = new Date().toISOString().slice(0, 10)
    }
  }

  if (Object.keys(campos).length === 0) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  await asignacionRepository.update(id, campos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'asignaciones_personal',
    registroId: Number(id),
    detalles: { proyecto_id: actual.proyecto_id, cambios: campos },
    ip: ctx.ip,
  })

  return asignacionRepository.findById(id)
}

/** Permiso puntual para la interfaz: ¿este usuario administra los accesos? */
export async function puedeGestionarAcceso(rol) {
  return rolTienePermiso(rol, PERMISO_GESTIONAR_ACCESO)
}
