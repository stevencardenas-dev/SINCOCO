import * as actividadRepository from '../repositories/actividadRepository.js'
import * as etapaRepository from '../repositories/etapaRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import { validarFechasEnRango } from './etapaService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { darDeBaja, reactivar } from '../db/bajaLogica.js'
import { AppError } from '../utils/AppError.js'

export async function listarPorProyecto(proyectoId, { incluirInactivos = false } = {}) {
  return actividadRepository.listarPorProyecto(proyectoId, incluirInactivos)
}

export async function listarPorEtapa(etapaId, { incluirInactivos = false } = {}) {
  return actividadRepository.listarPorEtapa(etapaId, incluirInactivos)
}

/**
 * HU-03: define una actividad.
 *  - Criterio 1: la actividad pertenece a una etapa existente y la etapa a un
 *    proyecto existente.
 *  - Criterio 3: sus fechas se mantienen dentro del rango del proyecto.
 *  - Criterio 4: admite responsable y descripción.
 *  - Criterio 5: el estado inicial es PENDIENTE.
 */
export async function registrarActividad(dto, ctx = {}) {
  const etapa = await etapaRepository.findById(dto.etapa_id)
  if (!etapa) throw new AppError('La etapa indicada no existe', 404, 'etapa_id')
  if (!etapa.activo) throw new AppError('La etapa está dada de baja', 400, 'etapa_id')

  const proyecto = await proyectoRepository.findById(etapa.proyecto_id)
  if (!proyecto) throw new AppError('El proyecto de la etapa no existe', 404, 'etapa_id')

  validarFechasEnRango(dto.fecha_inicio_programada, dto.fecha_fin_programada, proyecto)

  if (dto.responsable_id) {
    const responsable = await trabajadorRepository.findById(dto.responsable_id)
    if (!responsable) throw new AppError('El responsable indicado no existe', 404, 'responsable_id')
    if (!responsable.activo) {
      throw new AppError('El responsable está dado de baja', 400, 'responsable_id')
    }
  }

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

/** HU-18: dar de baja lógica una actividad. */
export async function darDeBajaActividad(id, ctx = {}) {
  const actividad = await actividadRepository.findById(id)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)

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
  const afectadas = await reactivar({ tabla: 'actividades', id })
  if (!afectadas) throw new AppError('La actividad no está dada de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REACTIVAR', tabla: 'actividades',
    registroId: Number(id), ip: ctx.ip,
  })
  return { id: Number(id), activo: 1 }
}
