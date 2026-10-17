import * as avanceRepository from '../repositories/avanceRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import { verificarAccesoProyecto, verificarOperarActividad } from './accesoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { LARGO, revisarLargo, textoOpcional } from '../utils/campos.js'

/** Estados en los que una actividad admite registrar avance (CU-21: «en ejecución»). */
const ESTADOS_CON_AVANCE = ['EN_PROCESO', 'ATRASADA']

function mensajeEstado(estado) {
  switch (estado) {
    case 'PENDIENTE':
      return 'La actividad aún no ha empezado: empiécela antes de registrar avance'
    case 'COMPLETADA':
      return 'La actividad ya está completada'
    case 'SUSPENDIDA':
      return 'La actividad está suspendida'
    default:
      return 'La actividad no admite registrar avance en su estado actual'
  }
}

/**
 * Aplica el avance sobre una actividad ya autorizada. Lo comparten el registro
 * de avance y «Finalizar» (que equivale a registrar el 100 %), de modo que
 * ambos dejan seguimiento y recalculan la etapa y el proyecto.
 */
export async function aplicarAvance(
  actividadId,
  { porcentaje, criterioId, cumplido, observaciones = null },
  ctx = {},
) {
  const resultado = await avanceRepository.registrarAvance(actividadId, async (actividad) => {
    if (!actividad.activo) throw new AppError('La actividad está dada de baja', 400)
    if (!ESTADOS_CON_AVANCE.includes(actividad.estado)) {
      throw new AppError(mensajeEstado(actividad.estado), 409, 'estado')
    }
    // Un criterio ya en el estado pedido no cambia nada: se rechaza para no dejar seguimiento vacío.
    if (criterioId) {
      const criterios = await actividadRepository.listarCriterios(actividadId)
      const criterio = criterios.find((c) => c.id === Number(criterioId))
      if (!criterio) throw new AppError('El criterio no pertenece a la actividad', 404, 'criterio_id')
      if (criterio.cumplido === cumplido) {
        throw new AppError(`El criterio ya estaba ${cumplido ? 'cumplido' : 'pendiente'}`, 409, 'criterio_id')
      }
    }
    return { porcentaje, criterioId, cumplido, observaciones, usuarioId: ctx.usuarioId }
  })
  if (!resultado) throw new AppError('Actividad no encontrada', 404)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'seguimiento_avance',
    registroId: resultado.seguimiento_id,
    detalles: {
      actividad_id: resultado.actividad_id,
      porcentaje_anterior: resultado.porcentaje_anterior,
      porcentaje_nuevo: resultado.porcentaje_nuevo,
    },
    ip: ctx.ip,
  })
  return resultado
}

/**
 * HU-21: marca (o desmarca) un criterio de aceptación de la actividad. El
 * porcentaje de avance se recalcula de forma equitativa (criterios cumplidos /
 * total), se conserva el porcentaje anterior y el nuevo (criterio 2), la
 * actividad se completa al cumplir todos (criterio 3) y se devuelve el avance
 * recalculado de la etapa y del proyecto (criterio 4).
 */
export async function registrarAvanceActividad(actividadId, body = {}, ctx = {}) {
  const criterioId = Number(body.criterio_id)
  if (!Number.isInteger(criterioId) || criterioId <= 0) {
    throw new AppError('Indique el criterio de aceptación', 400, 'criterio_id')
  }
  if (typeof body.cumplido !== 'boolean') {
    throw new AppError('Indique si el criterio está cumplido (true o false)', 400, 'cumplido')
  }
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, LARGO.texto_largo, 'observaciones')

  const actividad = await actividadRepository.findById(actividadId)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarOperarActividad(ctx.usuario, actividad.proyecto_id, actividadId)

  const resultado = await aplicarAvance(actividadId, { criterioId, cumplido: body.cumplido, observaciones }, ctx)
  return { ...resultado, actividad: await actividadRepository.findById(actividadId) }
}

/** Criterios de aceptación de una actividad (HU-21). */
export async function listarCriteriosActividad(actividadId, usuario = null) {
  const actividad = await actividadRepository.findById(actividadId)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarAccesoProyecto(usuario, actividad.proyecto_id)
  return actividadRepository.listarCriterios(actividadId)
}

/**
 * HU-21 · criterio 4: deja al día el avance guardado del proyecto cuando cambia
 * el plan (actividades o etapas nuevas, pesos, bajas y reactivaciones). El de
 * la etapa no se guarda: se calcula al consultarla.
 */
export async function recalcularAvanceProyecto(proyectoId) {
  if (!proyectoId) return null
  return avanceRepository.recalcularAvanceProyecto(proyectoId)
}

/** Historial de avance de una actividad (trazabilidad de HU-21 · criterio 2). */
export async function listarAvanceActividad(actividadId, usuario = null) {
  const actividad = await actividadRepository.findById(actividadId)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarAccesoProyecto(usuario, actividad.proyecto_id)
  return avanceRepository.listarPorActividad(actividadId)
}
