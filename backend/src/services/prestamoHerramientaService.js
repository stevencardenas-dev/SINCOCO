import * as repo from '../repositories/prestamoHerramientaRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { aFechaDia } from '../utils/fechas.js'
import { textoOpcional, revisarLargo } from '../utils/campos.js'

export const ESTADOS_PRESTAMO = ['ACTIVO', 'DEVUELTO', 'ATRASADO', 'CON_NOVEDAD']

export const ESTADOS_ENTREGA = ['EXCELENTE', 'BUENO', 'REGULAR']

/** HU-11: consulta de préstamos. */
export async function listarPrestamos({ estado = '', herramienta_id: herramientaId = '' } = {}) {
  const e = String(estado ?? '').trim().toUpperCase()
  if (e && !ESTADOS_PRESTAMO.includes(e)) {
    throw new AppError(`estado debe ser uno de: ${ESTADOS_PRESTAMO.join(', ')}`, 400, 'estado')
  }
  const h = herramientaId ? Number(herramientaId) : null
  if (herramientaId && (!Number.isInteger(h) || h <= 0)) throw new AppError('herramienta_id no es válido', 400, 'herramienta_id')
  return repo.listar({ estado: e, herramientaId: h })
}

/**
 * HU-11: entrega de una herramienta a partir de una solicitud APROBADA.
 * Deja constancia de quién entrega, la condición de entrega (el estado operativo
 * que la herramienta ya tenía) y la fecha estimada de devolución (obligatoria; por defecto la de la solicitud), y pasa la
 * herramienta a PRESTADA.
 */
export async function registrarEntrega(body = {}, ctx) {
  const solicitudId = Number(body.solicitud_id)
  if (!Number.isInteger(solicitudId) || solicitudId <= 0) throw new AppError('solicitud_id es obligatorio', 400, 'solicitud_id')
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, 500, 'observaciones')
  const fechaBody = body.fecha_estimada_devolucion ? aFechaDia(body.fecha_estimada_devolucion) : null
  if (fechaBody !== null && !/^\d{4}-\d{2}-\d{2}$/.test(fechaBody)) {
    throw new AppError('La fecha estimada de devolución no es válida', 400, 'fecha_estimada_devolucion')
  }

  const r = await repo.entregar({
    solicitudId, usuarioId: ctx.usuarioId, observaciones,
    validar: async (sol, herr) => {
      if (!sol) throw new AppError('Solicitud no encontrada', 404, 'solicitud_id')
      if (sol.estado !== 'APROBADA') throw new AppError(`Solo se entrega una solicitud aprobada (estado actual: ${sol.estado})`, 409, 'solicitud_id')
      if (!herr || !herr.activo) throw new AppError('La herramienta no existe o está dada de baja', 404)
      if (herr.disponibilidad !== 'DISPONIBLE' || !ESTADOS_ENTREGA.includes(herr.estado_operativo)) {
        throw new AppError('La herramienta no está disponible para entrega', 409)
      }
      const fechaDevolucion = fechaBody ?? aFechaDia(sol.fecha_estimada_devolucion)
      if (!fechaDevolucion) throw new AppError('La fecha estimada de devolución es obligatoria', 400, 'fecha_estimada_devolucion')
      if (fechaDevolucion < aFechaDia(new Date())) {
        throw new AppError('La fecha estimada de devolución no puede ser anterior a hoy', 400, 'fecha_estimada_devolucion')
      }
      return fechaDevolucion
    },
  })
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ENTREGAR_HERRAMIENTA', tabla: 'prestamos_herramientas', registroId: r.id,
    detalles: { solicitud_id: solicitudId, herramienta_id: r.solicitud.herramienta_id, trabajador_id: r.solicitud.para_trabajador_id, estado_entrega: r.herramienta.estado_operativo }, ip: ctx.ip,
  })
  return repo.findById(r.id)
}

const VIGENTES = ['ACTIVO', 'ATRASADO', 'CON_NOVEDAD']

/** HU-35: herramientas que pueden reemplazar a la de un préstamo vigente. */
export async function reemplazosPosibles(prestamoId) {
  const prestamo = await repo.findById(prestamoId)
  if (!prestamo) throw new AppError('Préstamo no encontrado', 404)
  if (!VIGENTES.includes(prestamo.estado_prestamo)) throw new AppError('Solo un préstamo vigente admite reemplazo', 409)
  return repo.reemplazosDisponibles(prestamo.herramienta_id)
}

/**
 * HU-35: reemplazo de una herramienta prestada que sufrió una avería.
 * La novedad es obligatoria; cierra el préstamo averiado (condición dañada), envía la herramienta a reparación,
 * genera la incidencia y, si se elige un reemplazo operativo, lo entrega al mismo trabajador con la misma fecha estimada
 * de devolución. Sin reemplazo cierra solo el préstamo averiado y sugiere registrar una solicitud de herramienta (HU-30).
 */
export async function reemplazarHerramienta(prestamoId, body = {}, ctx) {
  const novedad = textoOpcional(body.novedad)
  if (!novedad) throw new AppError('Debe describir la avería (novedad) para registrar el reemplazo', 400, 'novedad')
  revisarLargo(novedad, 500, 'novedad')
  const id = Number(prestamoId)
  if (!Number.isInteger(id) || id <= 0) throw new AppError('prestamo_id no es válido', 400)
  const reemplazoId = body.herramienta_reemplazo_id ? Number(body.herramienta_reemplazo_id) : null
  if (body.herramienta_reemplazo_id && (!Number.isInteger(reemplazoId) || reemplazoId <= 0)) {
    throw new AppError('La herramienta de reemplazo no es válida', 400, 'herramienta_reemplazo_id')
  }

  const r = await repo.reemplazar({
    prestamoId: id, reemplazoId, usuarioId: ctx.usuarioId, novedad,
    validar: ({ prestamo, herramienta, reemplazo }) => {
      if (!prestamo) throw new AppError('Préstamo no encontrado', 404)
      if (!VIGENTES.includes(prestamo.estado_prestamo)) throw new AppError('Solo un préstamo vigente admite reemplazo por avería', 409)
      if (!herramienta) throw new AppError('La herramienta del préstamo no existe', 404)
      if (reemplazoId) {
        if (reemplazoId === Number(herramienta.id)) throw new AppError('El reemplazo no puede ser la misma herramienta averiada', 400, 'herramienta_reemplazo_id')
        if (!reemplazo || !reemplazo.activo) throw new AppError('La herramienta de reemplazo no existe o está dada de baja', 404, 'herramienta_reemplazo_id')
        if (reemplazo.disponibilidad !== 'DISPONIBLE' || !ESTADOS_ENTREGA.includes(reemplazo.estado_operativo)) {
          throw new AppError('La herramienta de reemplazo no está disponible: debe estar disponible y en buen estado', 409, 'herramienta_reemplazo_id')
        }
      }
      return {
        titulo: `Avería de herramienta: ${herramienta.nombre} (${herramienta.codigo_serial})`.slice(0, 150),
        descripcion: `${novedad}\n\nPréstamo ${id}: ${herramienta.nombre} (${herramienta.codigo_serial}) prestada al trabajador ${prestamo.trabajador_id}.`,
      }
    },
  })
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REEMPLAZAR_HERRAMIENTA', tabla: 'prestamos_herramientas', registroId: id,
    detalles: {
      herramienta_averiada_id: r.herramienta.id, reemplazo_id: r.reemplazo?.id ?? null, prestamo_reemplazo_id: r.reemplazoPrestamoId,
      incidencia_id: r.incidenciaId, novedad,
    },
    ip: ctx.ip,
  })
  return {
    prestamo_averiado: await repo.findById(id),
    prestamo_reemplazo: r.reemplazoPrestamoId ? await repo.findById(r.reemplazoPrestamoId) : null,
    incidencia_id: r.incidenciaId,
    // Alt. 1: sin reemplazo solo se cerró el préstamo averiado; se sugiere pedir la herramienta con una solicitud (HU-30).
    sugerir_solicitud: !r.reemplazoPrestamoId,
  }
}
