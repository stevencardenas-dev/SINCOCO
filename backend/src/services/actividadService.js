import * as actividadRepository from '../repositories/actividadRepository.js'
import * as etapaRepository from '../repositories/etapaRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import { validarFechasEnRango } from './etapaService.js'
import { aFechaDia, validarDentroDeEtapa } from '../utils/fechas.js'
import { verificarAccesoProyecto, verificarGestionPlan, verificarOperarActividad } from './accesoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { crearBajaReactivar } from './bajaReactivar.js'
import { aplicarAvance, recalcularAvanceProyecto } from './avanceService.js'
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
  await verificarGestionPlan(ctx.usuario, proyecto.id)

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
    peso: dto.peso,
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

  // HU-21 · criterio 4: una actividad nueva (al 0 %) entra en el promedio ponderado.
  await recalcularAvanceProyecto(proyecto.id)

  return actividadRepository.findById(id)
}

/**
 * Edita las propiedades de una actividad (nombre, descripción, responsable y
 * fechas). Las fechas siguen limitadas por las de su etapa y las del proyecto.
 */
export async function actualizarActividad(id, dto, ctx = {}) {
  const actividad = await actividadRepository.findById(id)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarGestionPlan(ctx.usuario, actividad.proyecto_id)
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
  // HU-21 · criterio 4: cambiar el peso cambia el promedio ponderado del proyecto.
  if (campos.peso !== undefined) await recalcularAvanceProyecto(actividad.proyecto_id)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR', tabla: 'actividades',
    registroId: Number(id), detalles: { nombre: actividad.nombre, cambios: campos }, ip: ctx.ip,
  })
  return actividadRepository.findById(id)
}

/**
 * «Empezar»: la actividad pasa de PENDIENTE a EN_PROCESO (En curso) y queda
 * registrada su fecha de inicio real.
 */
export async function iniciarActividad(id, ctx = {}) {
  const actividad = await actividadRepository.findById(id)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarOperarActividad(ctx.usuario, actividad.proyecto_id, id)
  if (!actividad.activo) throw new AppError('La actividad está dada de baja', 400)
  if (actividad.estado !== 'PENDIENTE') {
    throw new AppError('Solo se puede empezar una actividad pendiente', 409, 'estado')
  }

  const hoy = new Date().toISOString().slice(0, 10)
  await actividadRepository.update(id, { estado: 'EN_PROCESO', fecha_inicio_real: hoy })

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR', tabla: 'actividades',
    registroId: Number(id), detalles: { nombre: actividad.nombre, cambios: { estado: 'EN_PROCESO' } }, ip: ctx.ip,
  })
  return actividadRepository.findById(id)
}

/**
 * «Finalizar»: la actividad pasa de EN_PROCESO a COMPLETADA (Finalizado), con
 * fecha fin real y avance al 100 % (HU-21: al llegar al 100 % queda completada).
 */
export async function finalizarActividad(id, ctx = {}) {
  const actividad = await actividadRepository.findById(id)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarOperarActividad(ctx.usuario, actividad.proyecto_id, id)
  if (!actividad.activo) throw new AppError('La actividad está dada de baja', 400)
  if (actividad.estado !== 'EN_PROCESO') {
    throw new AppError('Solo se puede finalizar una actividad en curso', 409, 'estado')
  }

  // Finalizar equivale a registrar el 100 %: deja seguimiento y recalcula la etapa y el proyecto.
  await aplicarAvance(id, { porcentaje: 100, observaciones: 'Actividad finalizada' }, ctx, { permitirIgual: true })

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR', tabla: 'actividades',
    registroId: Number(id), detalles: { nombre: actividad.nombre, cambios: { estado: 'COMPLETADA' } }, ip: ctx.ip,
  })
  return actividadRepository.findById(id)
}

/** HU-18: baja y reactivación de actividades. */
const bajaReactivar = crearBajaReactivar({
  tabla: 'actividades',
  mensajes: {
    noEncontrado: 'Actividad no encontrada',
    yaDeBaja: 'La actividad ya estaba dada de baja',
    noEstaDeBaja: 'La actividad no está dada de baja',
  },
  buscar: (id) => actividadRepository.findById(id),
  verificar: async (actividad, ctx) =>
    verificarGestionPlan(
      ctx.usuario,
      actividad.proyecto_id ?? (await etapaRepository.findById(actividad.etapa_id))?.proyecto_id,
    ),
  detallesBaja: (actividad) => ({ nombre: actividad.nombre }),
  // HU-21 · criterio 4: solo las actividades activas cuentan en el avance.
  despues: async (actividad) =>
    recalcularAvanceProyecto(
      actividad.proyecto_id ?? (await etapaRepository.findById(actividad.etapa_id))?.proyecto_id,
    ),
})

export const darDeBajaActividad = bajaReactivar.darDeBaja
export const reactivarActividad = bajaReactivar.reactivar
