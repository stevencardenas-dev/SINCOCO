import * as avanceRepository from '../repositories/avanceRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import { verificarAccesoProyecto, verificarOperarActividad } from './accesoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { LARGO, revisarLargo, textoOpcional } from '../utils/campos.js'

/** Estados en los que una actividad admite registrar avance (CU-21: «en ejecución»). */
const ESTADOS_CON_AVANCE = ['EN_PROCESO', 'ATRASADA']

/** HU-21 · criterio 1: el porcentaje está entre 0 y 100 (hasta 2 decimales). */
export function revisarPorcentaje(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    throw new AppError('El porcentaje de avance es obligatorio', 400, 'porcentaje')
  }
  const n = Number(valor)
  if (!Number.isFinite(n)) {
    throw new AppError('El porcentaje de avance debe ser un número', 400, 'porcentaje')
  }
  if (n < 0 || n > 100) {
    throw new AppError('El porcentaje de avance debe estar entre 0 y 100', 400, 'porcentaje')
  }
  if (Math.round(n * 100) / 100 !== n) {
    throw new AppError('El porcentaje admite como máximo 2 decimales', 400, 'porcentaje')
  }
  return n
}

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
  { porcentaje, observaciones = null },
  ctx = {},
  { permitirIgual = false } = {},
) {
  const resultado = await avanceRepository.registrarAvance(actividadId, async (actividad) => {
    if (!actividad.activo) throw new AppError('La actividad está dada de baja', 400)
    if (!ESTADOS_CON_AVANCE.includes(actividad.estado)) {
      throw new AppError(mensajeEstado(actividad.estado), 409, 'estado')
    }
    if (!permitirIgual && porcentaje === actividad.anterior) {
      throw new AppError(`La actividad ya está en ${actividad.anterior} % de avance`, 400, 'porcentaje')
    }
    return { porcentaje, observaciones, usuarioId: ctx.usuarioId }
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
 * HU-21: registra el nuevo porcentaje de avance de una actividad. Conserva el
 * porcentaje anterior y el nuevo (criterio 2), completa la actividad al llegar
 * al 100 % (criterio 3) y devuelve el avance recalculado de la etapa y del
 * proyecto (criterio 4).
 */
export async function registrarAvanceActividad(actividadId, body = {}, ctx = {}) {
  const porcentaje = revisarPorcentaje(body.porcentaje)
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, LARGO.texto_largo, 'observaciones')

  const actividad = await actividadRepository.findById(actividadId)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarOperarActividad(ctx.usuario, actividad.proyecto_id, actividadId)

  const resultado = await aplicarAvance(actividadId, { porcentaje, observaciones }, ctx)
  return { ...resultado, actividad: await actividadRepository.findById(actividadId) }
}

/** Historial de avance de una actividad (trazabilidad de HU-21 · criterio 2). */
export async function listarAvanceActividad(actividadId, usuario = null) {
  const actividad = await actividadRepository.findById(actividadId)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarAccesoProyecto(usuario, actividad.proyecto_id)
  return avanceRepository.listarPorActividad(actividadId)
}
