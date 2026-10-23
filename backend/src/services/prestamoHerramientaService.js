import * as repo from '../repositories/prestamoHerramientaRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { aFechaDia } from '../utils/fechas.js'
import { textoOpcional, revisarLargo } from '../utils/campos.js'

export const ESTADOS_PRESTAMO = ['ACTIVO', 'DEVUELTO', 'ATRASADO', 'CON_NOVEDAD']

export const ESTADOS_ENTREGA = ['EXCELENTE', 'BUENO', 'REGULAR']

/** HU-11: consulta de préstamos. */
export async function listarPrestamos({ estado = '' } = {}) {
  const e = String(estado ?? '').trim().toUpperCase()
  if (e && !ESTADOS_PRESTAMO.includes(e)) {
    throw new AppError(`estado debe ser uno de: ${ESTADOS_PRESTAMO.join(', ')}`, 400, 'estado')
  }
  return repo.listar({ estado: e })
}

/**
 * HU-11: entrega de una herramienta a partir de una solicitud APROBADA.
 * Deja constancia de quién entrega, la condición de entrega y la fecha estimada
 * de devolución (obligatoria; por defecto la de la solicitud), y pasa la
 * herramienta a PRESTADA.
 */
export async function registrarEntrega(body = {}, ctx) {
  const solicitudId = Number(body.solicitud_id)
  if (!Number.isInteger(solicitudId) || solicitudId <= 0) throw new AppError('solicitud_id es obligatorio', 400, 'solicitud_id')
  const estadoEntrega = String(body.estado_entrega ?? '').trim().toUpperCase()
  if (!ESTADOS_ENTREGA.includes(estadoEntrega)) {
    throw new AppError(`estado_entrega debe ser uno de: ${ESTADOS_ENTREGA.join(', ')}`, 400, 'estado_entrega')
  }
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, 500, 'observaciones')
  const fechaBody = body.fecha_estimada_devolucion ? aFechaDia(body.fecha_estimada_devolucion) : null
  if (fechaBody !== null && !/^\d{4}-\d{2}-\d{2}$/.test(fechaBody)) {
    throw new AppError('La fecha estimada de devolución no es válida', 400, 'fecha_estimada_devolucion')
  }

  const r = await repo.entregar({
    solicitudId, usuarioId: ctx.usuarioId, estadoEntrega, observaciones,
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
    detalles: { solicitud_id: solicitudId, herramienta_id: r.solicitud.herramienta_id, trabajador_id: r.solicitud.para_trabajador_id, estado_entrega: estadoEntrega }, ip: ctx.ip,
  })
  return repo.findById(r.id)
}
