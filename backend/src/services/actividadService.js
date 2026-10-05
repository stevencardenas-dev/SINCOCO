import * as actividadRepository from '../repositories/actividadRepository.js'
import * as etapaRepository from '../repositories/etapaRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import { validarFechasEnRango } from './etapaService.js'
import { aFechaDia, validarDentroDeEtapa } from '../utils/fechas.js'
import { verificarAccesoProyecto } from './accesoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { darDeBaja, reactivar } from '../db/bajaLogica.js'
import { AppError } from '../utils/AppError.js'

// RBAC: las actividades de un proyecto solo se listan si el usuario tiene
// acceso al proyecto (asignación vigente o alcance total de su rol).
export async function listarPorProyecto(proyectoId, { incluirInactivos = false } = {}, usuario = null) {
  await verificarAccesoProyecto(usuario, proyectoId)
  return actividadRepository.listarPorProyecto(proyectoId, incluirInactivos)
}

export async function listarPorEtapa(etapaId, { incluirInactivos = false } = {}, usuario = null) {
  const etapa = await etapaRepository.findById(etapaId)
  if (!etapa) throw new AppError('La etapa indicada no existe', 404, 'etapa_id')
  await verificarAccesoProyecto(usuario, etapa.proyecto_id)
  return actividadRepository.listarPorEtapa(etapaId, incluirInactivos)
}

async function validarResponsable(responsableId) {
  if (!responsableId) return
  const responsable = await trabajadorRepository.findById(responsableId)
  if (!responsable) throw new AppError('El responsable indicado no existe', 404, 'responsable_id')
  if (!responsable.activo) {
    throw new AppError('El responsable está dado de baja', 400, 'responsable_id')
  }
}

/**
 * HU-03: define una actividad.
 *  - Criterio 1: la actividad pertenece a una etapa existente y la etapa a un
 *    proyecto existente.
 *  - Criterio 3: sus fechas se mantienen dentro del rango del proyecto y de
 *    su etapa.
 *  - Criterio 4: admite responsable y descripción.
 *  - Criterio 5: el estado inicial es PENDIENTE.
 */
export async function registrarActividad(dto, ctx = {}) {
  const etapa = await etapaRepository.findById(dto.etapa_id)
  if (!etapa) throw new AppError('La etapa indicada no existe', 404, 'etapa_id')
  if (!etapa.activo) throw new AppError('La etapa está dada de baja', 400, 'etapa_id')

  const proyecto = await proyectoRepository.findById(etapa.proyecto_id)
  if (!proyecto) throw new AppError('El proyecto de la etapa no existe', 404, 'etapa_id')
  await verificarAccesoProyecto(ctx.usuario, proyecto.id)

  validarFechasEnRango(dto.fecha_inicio_programada, dto.fecha_fin_programada, proyecto)
  validarDentroDeEtapa(dto.fecha_inicio_programada, dto.fecha_fin_programada, etapa)
  await validarResponsable(dto.responsable_id)

  const id = await actividadRepository.create({
    etapa_id: dto.etapa_id,
    responsable_id: dto.responsable_id,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    fecha_inicio_programada: dto.fecha_inicio_programada,
    fecha_fin_programada: dto.fecha_fin_programada,
    porcentaje_avance: 0,
    estado: 'PENDIENTE',
  })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'actividades',
    registroId: id,
    detalles: { etapa_id: dto.etapa_id, nombre: dto.nombre, responsable_id: dto.responsable_id },
    ip: ctx.ip,
  })

  return actividadRepository.findById(id)
}

/**
 * Edita las propiedades de una actividad (nombre, descripción, responsable y
 * fechas). Las fechas siguen limitadas por las de su etapa y las del proyecto.
 */
export async function actualizarActividad(id, dto, ctx = {}) {
  const actividad = await actividadRepository.findById(id)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarAccesoProyecto(ctx.usuario, actividad.proyecto_id)
  if (!actividad.activo) throw new AppError('La actividad está dada de baja', 400)

  const campos = { ...dto.campos }
  const inicio = aFechaDia(campos.fecha_inicio_programada ?? actividad.fecha_inicio_programada)
  const fin = aFechaDia(campos.fecha_fin_programada ?? actividad.fecha_fin_programada)

  if (campos.fecha_inicio_programada || campos.fecha_fin_programada) {
    const etapa = await etapaRepository.findById(actividad.etapa_id)
    const proyecto = await proyectoRepository.findById(actividad.proyecto_id)
    validarFechasEnRango(inicio, fin, proyecto)
    validarDentroDeEtapa(inicio, fin, etapa)
  }
  if (campos.responsable_id !== undefined && campos.responsable_id !== actividad.responsable_id) {
    await validarResponsable(campos.responsable_id)
  }

  await actividadRepository.update(id, campos)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR', tabla: 'actividades',
    registroId: Number(id), detalles: { nombre: actividad.nombre, cambios: campos }, ip: ctx.ip,
  })
  return actividadRepository.findById(id)
}

/** HU-18: dar de baja lógica una actividad. */
export async function darDeBajaActividad(id, ctx = {}) {
  const actividad = await actividadRepository.findById(id)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarAccesoProyecto(ctx.usuario, actividad.proyecto_id ?? (await etapaRepository.findById(actividad.etapa_id))?.proyecto_id)

  const afectadas = await darDeBaja({ tabla: 'actividades', id, usuarioId: ctx.usuarioId })
  if (!afectadas) throw new AppError('La actividad ya estaba dada de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'DAR_DE_BAJA', tabla: 'actividades',
    registroId: Number(id), detalles: { nombre: actividad.nombre }, ip: ctx.ip,
  })
  return { id: Number(id), activo: 0 }
}

/** HU-18: reactivar una actividad dada de baja. */
export async function reactivarActividad(id, ctx = {}) {
  const actividad = await actividadRepository.findById(id)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarAccesoProyecto(ctx.usuario, actividad.proyecto_id ?? (await etapaRepository.findById(actividad.etapa_id))?.proyecto_id)
  const afectadas = await reactivar({ tabla: 'actividades', id })
  if (!afectadas) throw new AppError('La actividad no está dada de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REACTIVAR', tabla: 'actividades',
    registroId: Number(id), ip: ctx.ip,
  })
  return { id: Number(id), activo: 1 }
}
