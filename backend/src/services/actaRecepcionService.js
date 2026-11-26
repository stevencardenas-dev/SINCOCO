import * as actaRepository from '../repositories/actaRecepcionRepository.js'
import * as usuarioRepository from '../repositories/usuarioRepository.js'
import * as alertaRepository from '../repositories/alertaRepository.js'
import { alcanceDeUsuario } from './accesoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-40 · acta de recepción de materiales en obra.
 *
 * Toda salida de materiales genera un acta pendiente (criterio 1). Solo el
 * destinatario de la salida o el maestro responsable del proyecto o de la
 * actividad pueden firmarla (criterio 2). El maestro valida cada línea con la
 * cantidad recibida; si difiere de la despachada, la observación es obligatoria
 * (criterio 3). La firma es una confirmación autenticada con la sesión: guarda
 * usuario, fecha y hora, sin imagen de firma (criterio 4). Una vez firmada es
 * inmutable y consultable por bodega (criterio 5), y las diferencias generan una
 * alerta a bodega (criterio 6).
 */

export const ESTADOS_ACTA = ['PENDIENTE', 'FIRMADA']

const num = (valor) => Number(valor ?? 0)

/** ¿El trabajador del usuario es destinatario o responsable del proyecto/actividad? */
export function puedeFirmar(acta, trabajadorId) {
  if (!acta || !trabajadorId) return false
  const id = Number(trabajadorId)
  return [
    acta.entregado_a_trabajador_id,
    acta.proyecto_responsable_id,
    acta.actividad_responsable_id,
  ].some((responsable) => responsable !== null && responsable !== undefined && Number(responsable) === id)
}

/**
 * Normaliza y valida las cantidades recibidas de cada línea. Exige una entrada
 * por línea del acta y la observación cuando la cantidad difiere de la
 * despachada.
 */
export function validarLineas(acta, detalles = []) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw new AppError('Indique la cantidad recibida de cada línea del acta', 400, 'detalles')
  }
  const porId = new Map(acta.detalles.map((d) => [Number(d.id), d]))
  const vistas = new Set()
  const lineas = []

  for (const entrada of detalles) {
    const detalleId = Number(entrada?.detalle_id)
    const linea = porId.get(detalleId)
    if (!linea) throw new AppError('La línea indicada no pertenece al acta', 400, 'detalles')
    if (vistas.has(detalleId)) throw new AppError('Hay una línea repetida en el acta', 400, 'detalles')
    vistas.add(detalleId)

    const recibida = Number(entrada.cantidad_recibida)
    if (!Number.isFinite(recibida) || recibida < 0) {
      throw new AppError(`La cantidad recibida de ${linea.material} no es válida`, 400, `cantidad_${detalleId}`)
    }
    const observacion = entrada.observacion === undefined || entrada.observacion === null
      ? null
      : String(entrada.observacion).trim() || null
    if (observacion && observacion.length > 500) {
      throw new AppError('La observación admite máximo 500 caracteres', 400, `observacion_${detalleId}`)
    }
    if (recibida !== num(linea.cantidad_despachada) && !observacion) {
      throw new AppError(
        `La cantidad recibida de ${linea.material} difiere de la despachada: la observación es obligatoria`,
        400,
        `observacion_${detalleId}`,
      )
    }
    lineas.push({ detalle_id: detalleId, cantidad_recibida: recibida, observacion })
  }

  const faltan = acta.detalles.filter((d) => !vistas.has(Number(d.id)))
  if (faltan.length > 0) {
    throw new AppError(
      `Falta confirmar ${faltan.length} línea(s) del acta: ${faltan.map((d) => d.material).join(', ')}`,
      400,
      'detalles',
    )
  }
  return lineas
}

export async function listarActas(filtros = {}, usuario = null) {
  const estado = String(filtros.estado ?? '').trim().toUpperCase()
  if (estado && !ESTADOS_ACTA.includes(estado)) {
    throw new AppError(`estado debe ser uno de: ${ESTADOS_ACTA.join(', ')}`, 400, 'estado')
  }
  let salidaId = null
  if (filtros.salida_id !== undefined && filtros.salida_id !== null && filtros.salida_id !== '') {
    salidaId = Number(filtros.salida_id)
    if (!Number.isInteger(salidaId) || salidaId <= 0) {
      throw new AppError('salida_id debe ser un identificador válido', 400, 'salida_id')
    }
  }

  // Bodega, gerente y administrador consultan todas las actas; el maestro, las
  // de los proyectos donde participa.
  const sinRestringir = ['ADMINISTRADOR', 'GERENTE', 'ENCARGADO_BODEGA'].includes(usuario?.rol)
  const alcance = sinRestringir ? null : await alcanceDeUsuario(usuario)
  return actaRepository.listar({ estado, salidaId, alcance })
}

export async function obtenerActa(id) {
  const acta = await actaRepository.findById(Number(id))
  if (!acta) throw new AppError('El acta de recepción no existe', 404)
  return acta
}

export async function firmarActa(id, body = {}, ctx = {}) {
  const acta = await obtenerActa(id)
  if (acta.estado === 'FIRMADA') {
    throw new AppError('El acta ya fue firmada y no admite modificaciones', 409, 'estado')
  }

  const cuenta = ctx.usuarioId ? await usuarioRepository.findParaAcceso(ctx.usuarioId) : null
  const trabajadorId = cuenta?.trabajador_id ?? null
  if (!puedeFirmar(acta, trabajadorId)) {
    throw new AppError(
      'Solo el destinatario de la salida o el maestro responsable del proyecto o de la actividad puede firmar el acta',
      403,
    )
  }

  const lineas = validarLineas(acta, body.detalles)
  const observaciones = body.observaciones ? String(body.observaciones).trim().slice(0, 1000) : null
  const diferencias = lineas.filter(
    (l) => l.cantidad_recibida !== num(acta.detalles.find((d) => Number(d.id) === l.detalle_id).cantidad_despachada),
  )

  const resultado = await actaRepository.firmar(acta.id, {
    usuarioId: ctx.usuarioId,
    observaciones,
    lineas,
  })
  if (!resultado.aplicada) {
    throw resultado.inexistente
      ? new AppError('El acta de recepción no existe', 404)
      : new AppError('El acta ya fue firmada y no admite modificaciones', 409, 'estado')
  }

  // Criterio 6: toda diferencia entre lo despachado y lo recibido alerta a bodega.
  if (diferencias.length > 0) {
    const detalle = diferencias
      .map((l) => {
        const linea = acta.detalles.find((d) => Number(d.id) === l.detalle_id)
        return `${linea.material}: despachado ${linea.cantidad_despachada}, recibido ${l.cantidad_recibida}`
      })
      .join('; ')
    await alertaRepository.crearSiNoExiste({
      tipo: 'DIFERENCIA_RECEPCION',
      titulo: `Diferencia en la recepción del acta de la salida ${acta.comprobante}`,
      descripcion: `El acta se firmó con diferencias: ${detalle}.`,
      referenciaId: acta.id,
      tablaReferencia: 'actas_recepcion',
    })
    await actaRepository.notificarBodega({
      actaId: acta.id,
      titulo: `Diferencia en la recepción de ${acta.comprobante}`,
      mensaje: `${acta.proyecto} · ${detalle}`,
    })
  }

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'FIRMAR_ACTA_RECEPCION',
    tabla: 'actas_recepcion',
    registroId: Number(acta.id),
    detalles: {
      salida_id: acta.salida_id,
      lineas: lineas.length,
      con_diferencias: diferencias.length > 0,
    },
    ip: ctx.ip,
  })

  return actaRepository.findById(acta.id)
}
