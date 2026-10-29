import * as repo from '../repositories/herramientaEstadoRepository.js'
import * as herramientaRepository from '../repositories/herramientaRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { textoOpcional, revisarLargo, montoOpcional } from '../utils/campos.js'
import { aFechaDia } from '../utils/fechas.js'

/**
 * HU-37: cambio de estado operativo de una herramienta.
 * DISPONIBLE -> EN_REPARACION, EN_REPARACION -> DISPONIBLE y cualquiera -> DE_BAJA
 * (definitiva). Todo cambio exige motivo y no procede con un préstamo vigente.
 */
export const ACCIONES = ['EN_REPARACION', 'DISPONIBLE', 'DE_BAJA']
const PRESTABLES = ['EXCELENTE', 'BUENO', 'REGULAR']

export async function cambiarEstado(id, body = {}, ctx) {
  const accion = String(body.accion ?? '').trim().toUpperCase()
  if (!ACCIONES.includes(accion)) throw new AppError(`accion debe ser una de: ${ACCIONES.join(', ')}`, 400, 'accion')
  const motivo = textoOpcional(body.motivo)
  if (!motivo) throw new AppError('Todo cambio de estado exige un motivo', 400, 'motivo')
  revisarLargo(motivo, 500, 'motivo')
  const costo = accion === 'DISPONIBLE' ? montoOpcional(body.costo, 'costo') : null
  // Fecha de salida de reparación (opcional; por defecto, ahora): no puede ser futura.
  const hoy = aFechaDia(new Date())
  const fechaSalida = accion === 'DISPONIBLE' && body.fecha_salida ? aFechaDia(body.fecha_salida) : null
  if (fechaSalida !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaSalida)) throw new AppError('La fecha de salida no es válida', 400, 'fecha_salida')
    if (fechaSalida > hoy) throw new AppError('La fecha de salida no puede ser posterior a hoy', 400, 'fecha_salida')
  }

  const { anterior, plan } = await repo.cambiarEstado(id, ctx.usuarioId, (h, abierta, prestada) => {
    if (!h) throw new AppError('Herramienta no encontrada', 404)
    if (!h.activo || h.disponibilidad === 'BAJA') throw new AppError('La herramienta está de baja y la baja es definitiva', 409)
    if (prestada || h.disponibilidad === 'PRESTADA') {
      throw new AppError('La herramienta tiene un préstamo vigente; registre primero su devolución', 409)
    }
    if (h.disponibilidad === 'EN_TRASLADO') throw new AppError('La herramienta está en traslado', 409)
    const enReparacion = h.estado_operativo === 'EN_MANTENIMIENTO'
    if (accion === 'DE_BAJA') return { baja: true, cerrarReparacion: enReparacion, motivo, estadoOperativo: h.estado_operativo }
    if (accion === 'EN_REPARACION') {
      if (enReparacion) throw new AppError('La herramienta ya está en reparación', 409)
      return { nuevaReparacion: true, motivo, estadoOperativo: 'EN_MANTENIMIENTO' }
    }
    if (!enReparacion) throw new AppError('Solo una herramienta en reparación puede volver a disponible', 409)
    const previo = abierta?.estado_previo
    if (fechaSalida && abierta && fechaSalida < aFechaDia(abierta.fecha_ingreso)) {
      throw new AppError('La fecha de salida no puede ser anterior a la de ingreso a reparación', 400, 'fecha_salida')
    }
    return {
      cerrarReparacion: true, motivo, costo,
      // Hoy (o sin fecha) = el momento actual; un día pasado = ese día al mediodía.
      fechaSalida: fechaSalida && fechaSalida < hoy ? `${fechaSalida} 12:00:00` : null,
      estadoOperativo: PRESTABLES.includes(previo) ? previo : 'BUENO',
    }
  })

  await bitacora({
    usuarioId: ctx.usuarioId, accion: `HERRAMIENTA_${accion}`, tabla: 'herramientas', registroId: Number(id),
    detalles: { de: anterior, a: plan.baja ? 'BAJA' : plan.estadoOperativo, motivo, costo }, ip: ctx.ip,
  })
  return herramientaRepository.findById(id)
}

export async function historialReparaciones(id) {
  if (!(await herramientaRepository.findById(id))) throw new AppError('Herramienta no encontrada', 404)
  return repo.listarReparaciones(id)
}
