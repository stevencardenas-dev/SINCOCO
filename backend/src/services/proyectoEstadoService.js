import * as repo from '../repositories/proyectoEstadoRepository.js'
import { consolidarProyecto } from './consolidacionCostoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-38 · congelar y finalizar proyectos.
 *
 * Estados del proyecto (el esquema los llama así):
 *   PLANIFICACION → EN_EJECUCION → PAUSADO (congelado) → FINALIZADO
 *
 * Reglas:
 *  - Todo cambio de estado exige motivo y queda en la bitácora con usuario y fecha.
 *  - Congelar solo desde EN_EJECUCION; reanudar solo desde PAUSADO.
 *  - Finalizar desde EN_EJECUCION o PAUSADO, es irreversible y exige que no haya
 *    préstamos vigentes ni solicitudes pendientes.
 *  - Si el avance es menor a 100% se exige confirmación explícita.
 *  - Al finalizar se cierran las asignaciones vigentes y se hace el corte final
 *    de costos (HU-15).
 *  - Un proyecto congelado o finalizado no admite operaciones nuevas: eso lo
 *    corta `verificarProyectoOperable`, que usan las rutas que crean operaciones.
 */

export const ESTADOS_OPERABLES = ['PLANIFICACION', 'EN_EJECUCION']

/** Nombre que ve el usuario para cada estado del esquema. */
export const TITULO_ESTADO = {
  PLANIFICACION: 'Planificación',
  EN_EJECUCION: 'En ejecución',
  PAUSADO: 'Congelado',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const TRANSICIONES = {
  congelar: { desde: ['EN_EJECUCION'], hacia: 'PAUSADO' },
  reanudar: { desde: ['PAUSADO'], hacia: 'EN_EJECUCION' },
  finalizar: { desde: ['EN_EJECUCION', 'PAUSADO'], hacia: 'FINALIZADO' },
}

const ACCIONES = { congelar: 'CONGELAR', reanudar: 'REANUDAR', finalizar: 'FINALIZAR' }

/** true si el proyecto admite operaciones nuevas. */
export function esOperable(estado) {
  return ESTADOS_OPERABLES.includes(String(estado ?? '').toUpperCase())
}

/**
 * Guarda de operaciones: corta cualquier alta sobre un proyecto congelado,
 * finalizado, cancelado o dado de baja. Sin proyecto no hace nada (la ruta que
 * llama se encarga de validarlo).
 */
export async function verificarProyectoOperable(proyectoId) {
  if (!proyectoId) return
  const proyecto = await repo.estadoDeProyecto(Number(proyectoId))
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  if (!proyecto.activo) throw new AppError('El proyecto está dado de baja', 409, 'proyecto_id')
  if (!esOperable(proyecto.estado)) {
    throw new AppError(
      `El proyecto ${proyecto.codigo} está ${TITULO_ESTADO[proyecto.estado]?.toLowerCase() ?? proyecto.estado} y no admite operaciones nuevas`,
      409,
      'proyecto_id',
    )
  }
}

const motivoObligatorio = (motivo, campo = 'motivo') => {
  const texto = String(motivo ?? '').trim()
  if (texto.length < 5) {
    throw new AppError('Indique el motivo del cambio de estado (mínimo 5 caracteres)', 400, campo)
  }
  return texto
}

/**
 * Aplica una transición de estado. Es el único punto que escribe `proyectos.estado`
 * desde la interfaz, así el motivo y la bitácora no se pueden saltar.
 */
export async function cambiarEstadoProyecto(proyectoId, accion, { motivo, confirmar = false } = {}, ctx = {}) {
  const regla = TRANSICIONES[accion]
  if (!regla) throw new AppError('Acción de estado no válida', 400, 'accion')

  const proyecto = await repo.estadoDeProyecto(Number(proyectoId))
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  if (!proyecto.activo) throw new AppError('El proyecto está dado de baja', 409, 'proyecto_id')

  const motivoLimpio = motivoObligatorio(motivo)

  if (!regla.desde.includes(proyecto.estado)) {
    throw new AppError(
      `El proyecto está ${TITULO_ESTADO[proyecto.estado]?.toLowerCase() ?? proyecto.estado} y no se puede ${accion}`,
      409,
      'estado',
    )
  }

  let cierre = null

  if (accion === 'finalizar') {
    const [prestamos, solicitudes] = await Promise.all([
      repo.prestamosVigentes(proyecto.id),
      repo.solicitudesPendientes(proyecto.id),
    ])
    if (prestamos > 0 || solicitudes.materiales > 0 || solicitudes.herramientas > 0) {
      const partes = []
      if (prestamos > 0) partes.push(`${prestamos} ${prestamos === 1 ? 'préstamo vigente' : 'préstamos vigentes'}`)
      if (solicitudes.materiales > 0) partes.push(`${solicitudes.materiales} de materiales`)
      if (solicitudes.herramientas > 0) partes.push(`${solicitudes.herramientas} de herramientas`)
      throw new AppError(
        `No se puede finalizar: hay ${partes.join(' y ')} sin cerrar`,
        409,
        'estado',
      )
    }

    const avance = Number(proyecto.porcentaje_avance_total ?? 0)
    if (avance < 100 && !confirmar) {
      throw new AppError(
        `El avance es ${avance}%: confirme que desea finalizar el proyecto antes de completarlo`,
        409,
        'confirmar',
        { codigo: 'CONFIRMACION_REQUERIDA', avance },
      )
    }

    cierre = { asignaciones_cerradas: 0, consolidacion: null }
  }

  await repo.cambiarEstado(proyecto.id, regla.hacia)

  if (accion === 'finalizar') {
    const hoy = new Date().toISOString().slice(0, 10)
    cierre.asignaciones_cerradas = await repo.cerrarAsignaciones(proyecto.id, hoy)
    // Corte final de costos (HU-15): deja el costo real congelado con el cierre.
    cierre.consolidacion = await consolidarProyecto(proyecto.id, ctx)
  }

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: ACCIONES[accion],
    tabla: 'proyectos',
    registroId: Number(proyecto.id),
    detalles: {
      estado_anterior: proyecto.estado,
      estado_nuevo: regla.hacia,
      motivo: motivoLimpio,
      ...(cierre ? { cierre } : {}),
    },
    ip: ctx.ip,
  })

  const actualizado = await repo.estadoDeProyecto(proyecto.id)
  return { proyecto: actualizado, motivo: motivoLimpio, cierre }
}

export const congelarProyecto = (id, datos, ctx) => cambiarEstadoProyecto(id, 'congelar', datos, ctx)
export const reanudarProyecto = (id, datos, ctx) => cambiarEstadoProyecto(id, 'reanudar', datos, ctx)
export const finalizarProyecto = (id, datos, ctx) => cambiarEstadoProyecto(id, 'finalizar', datos, ctx)
