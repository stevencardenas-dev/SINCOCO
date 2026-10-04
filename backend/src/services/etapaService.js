import * as etapaRepository from '../repositories/etapaRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { darDeBaja, reactivar } from '../db/bajaLogica.js'
import { AppError } from '../utils/AppError.js'
import { validarFechasEnRango } from '../utils/fechas.js'
import { verificarAccesoProyecto } from './accesoService.js'

// La regla de fechas vive en utils/fechas.js (la comparten etapas, actividades
// y asignaciones). Se reexporta para no romper a quien ya la importaba de aquí.
export { validarFechasEnRango }

/** Lista las etapas del proyecto si el usuario tiene acceso a él (RBAC). */
export async function listarEtapas(proyectoId, { incluirInactivos = false } = {}, usuario = null) {
  await verificarAccesoProyecto(usuario, proyectoId)
  return etapaRepository.listarPorProyecto(proyectoId, incluirInactivos)
}

/**
 * HU-03: define una etapa dentro de un proyecto existente. El `orden` permite
 * fijar su secuencia; si no se indica, se coloca al final del plan.
 * Criterio 5: el estado inicial es PENDIENTE.
 */
export async function registrarEtapa(dto, ctx = {}) {
  const proyecto = await proyectoRepository.findById(dto.proyecto_id)
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  await verificarAccesoProyecto(ctx.usuario, dto.proyecto_id)
  if (!proyecto.activo) throw new AppError('El proyecto está dado de baja', 400, 'proyecto_id')

  validarFechasEnRango(dto.fecha_inicio_programada, dto.fecha_fin_programada, proyecto)

  const orden = dto.orden ?? (await etapaRepository.maxOrden(dto.proyecto_id)) + 1

  const id = await etapaRepository.create({
    proyecto_id: dto.proyecto_id,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    orden,
    fecha_inicio_programada: dto.fecha_inicio_programada,
    fecha_fin_programada: dto.fecha_fin_programada,
    estado: 'PENDIENTE',
  })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'etapas_proyecto',
    registroId: id,
    detalles: { proyecto_id: dto.proyecto_id, nombre: dto.nombre, orden },
    ip: ctx.ip,
  })

  return etapaRepository.findById(id)
}

/** HU-18: dar de baja lógica una etapa. */
export async function darDeBajaEtapa(id, ctx = {}) {
  const etapa = await etapaRepository.findById(id)
  if (!etapa) throw new AppError('Etapa no encontrada', 404)
  await verificarAccesoProyecto(ctx.usuario, etapa.proyecto_id)

  const afectadas = await darDeBaja({ tabla: 'etapas_proyecto', id, usuarioId: ctx.usuarioId })
  if (!afectadas) throw new AppError('La etapa ya estaba dada de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'DAR_DE_BAJA', tabla: 'etapas_proyecto',
    registroId: Number(id), detalles: { nombre: etapa.nombre }, ip: ctx.ip,
  })
  return { id: Number(id), activo: 0 }
}

/** HU-18: reactivar una etapa dada de baja. */
export async function reactivarEtapa(id, ctx = {}) {
  const etapa = await etapaRepository.findById(id)
  if (!etapa) throw new AppError('Etapa no encontrada', 404)
  await verificarAccesoProyecto(ctx.usuario, etapa.proyecto_id)
  const afectadas = await reactivar({ tabla: 'etapas_proyecto', id })
  if (!afectadas) throw new AppError('La etapa no está dada de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REACTIVAR', tabla: 'etapas_proyecto',
    registroId: Number(id), ip: ctx.ip,
  })
  return { id: Number(id), activo: 1 }
}
