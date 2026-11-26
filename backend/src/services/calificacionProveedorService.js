import * as repo from '../repositories/calificacionProveedorRepository.js'
import * as proveedorRepository from '../repositories/proveedorRepository.js'
import * as servicioExternoRepository from '../repositories/servicioExternoRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { aFechaDia } from '../utils/fechas.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-41 · calificación de desempeño de proveedores.
 *
 * Solo se califica un servicio externo FINALIZADO o una entrega recibida de una
 * orden de compra, una sola vez cada uno (criterio 1). Puntualidad y calidad van
 * de 1 a 5 y el comentario es obligatorio cuando algún puntaje es 2 o menor
 * (criterio 2). Las calificaciones no se eliminan: la corrección se registra en
 * la bitácora (criterio 3). El catálogo del proveedor muestra su promedio por
 * criterio y el número de calificaciones (criterio 4).
 */

export const PUNTAJE_MINIMO = 1
export const PUNTAJE_MAXIMO = 5
const ESTADOS_ORDEN_RECIBIDA = ['RECIBIDA_PARCIAL', 'RECIBIDA_TOTAL']

const entero = (valor, campo) => {
  const n = Number(valor)
  if (!Number.isInteger(n) || n < PUNTAJE_MINIMO || n > PUNTAJE_MAXIMO) {
    throw new AppError(`${campo} debe ser un entero entre ${PUNTAJE_MINIMO} y ${PUNTAJE_MAXIMO}`, 400, campo)
  }
  return n
}

const comentarioDe = (valor) => {
  const texto = valor === undefined || valor === null ? '' : String(valor).trim()
  if (texto.length > 500) throw new AppError('El comentario admite máximo 500 caracteres', 400, 'comentario')
  return texto || null
}

/**
 * Valida los puntajes. Criterio 2: el comentario es obligatorio cuando
 * puntualidad o calidad es 2 o menor (escenario alternativo 1).
 */
export function validarPuntajes({ puntualidad, calidad, comentario } = {}) {
  const p = entero(puntualidad, 'puntualidad')
  const c = entero(calidad, 'calidad')
  const texto = comentarioDe(comentario)
  if (Math.min(p, c) <= 2 && !texto) {
    throw new AppError('Un puntaje de 2 o menor exige un comentario', 400, 'comentario')
  }
  return { puntualidad: p, calidad: c, comentario: texto }
}

async function proveedorDeId(proveedorId) {
  const proveedor = await proveedorRepository.findById(Number(proveedorId))
  if (!proveedor) throw new AppError('El proveedor indicado no existe', 404, 'proveedor_id')
  return proveedor
}

/** Resuelve y valida la referencia que se califica: servicio o entrega recibida. */
async function referenciaAcalificar(body, proveedorId) {
  const servicioId = body.servicio_externo_id ? Number(body.servicio_externo_id) : null
  const ordenId = body.orden_compra_id ? Number(body.orden_compra_id) : null
  if (Boolean(servicioId) === Boolean(ordenId)) {
    throw new AppError(
      'Indique un servicio externo o una orden de compra, y solo uno',
      400,
      servicioId ? 'orden_compra_id' : 'servicio_externo_id',
    )
  }

  if (servicioId) {
    const servicio = await servicioExternoRepository.findById(servicioId)
    if (!servicio) throw new AppError('El servicio externo indicado no existe', 404, 'servicio_externo_id')
    if (Number(servicio.proveedor_id) !== Number(proveedorId)) {
      throw new AppError('El servicio no pertenece al proveedor indicado', 400, 'servicio_externo_id')
    }
    // Criterio 1 y alternativo 3: solo un servicio finalizado se califica.
    if (servicio.estado !== 'FINALIZADO') {
      throw new AppError('Solo se califica un servicio externo finalizado', 409, 'estado')
    }
    return {
      servicio_externo_id: servicio.id,
      orden_compra_id: null,
      referencia: servicio.nombre_servicio,
      fecha_pactada: servicio.fecha_fin ?? null,
    }
  }

  const orden = await repo.findOrdenRecibida(ordenId)
  if (!orden) throw new AppError('La orden de compra no existe o aún no se ha recibido', 404, 'orden_compra_id')
  if (Number(orden.proveedor_id) !== Number(proveedorId)) {
    throw new AppError('La orden no pertenece al proveedor indicado', 400, 'orden_compra_id')
  }
  return {
    servicio_externo_id: null,
    orden_compra_id: orden.id,
    referencia: orden.codigo,
    fecha_pactada: orden.fecha_entrega_estimada ?? null,
  }
}

/** Fecha real de cumplimiento (referencia de la puntualidad, criterio 5). */
function fechaCumplimiento(valor) {
  const hoy = aFechaDia(new Date())
  if (!valor) return hoy
  const fecha = aFechaDia(valor)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new AppError('La fecha de cumplimiento no es válida', 400, 'fecha_cumplimiento')
  }
  if (fecha > hoy) throw new AppError('La fecha de cumplimiento no puede ser futura', 400, 'fecha_cumplimiento')
  return fecha
}

export async function calificar(proveedorId, body = {}, ctx = {}) {
  await proveedorDeId(proveedorId)
  const referencia = await referenciaAcalificar(body, proveedorId)

  // Alternativo 2: no se duplica; se devuelve la calificación existente.
  const existente = referencia.servicio_externo_id
    ? await repo.findByServicio(referencia.servicio_externo_id)
    : await repo.findByOrden(referencia.orden_compra_id)
  if (existente) {
    throw new AppError('Ese servicio o entrega ya tiene calificación', 409, 'calificacion', {
      calificacion: existente,
    })
  }

  const puntajes = validarPuntajes(body)
  const id = await repo.crear({
    proveedor_id: Number(proveedorId),
    servicio_externo_id: referencia.servicio_externo_id,
    orden_compra_id: referencia.orden_compra_id,
    ...puntajes,
    fecha_pactada: referencia.fecha_pactada,
    fecha_cumplimiento: fechaCumplimiento(body.fecha_cumplimiento),
    calificado_por_usuario_id: ctx.usuarioId ?? null,
  })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CALIFICAR_PROVEEDOR',
    tabla: 'calificaciones_proveedor',
    registroId: id,
    detalles: {
      proveedor_id: Number(proveedorId),
      referencia: referencia.referencia,
      puntualidad: puntajes.puntualidad,
      calidad: puntajes.calidad,
    },
    ip: ctx.ip,
  })

  return {
    calificacion: await repo.findById(id),
    promedio: await repo.promedio(proveedorId),
  }
}

/** Criterio 3: la corrección se permite, pero queda registrada en la bitácora. */
export async function corregirCalificacion(proveedorId, calificacionId, body = {}, ctx = {}) {
  const actual = await repo.findById(Number(calificacionId))
  if (!actual) throw new AppError('La calificación no existe', 404)
  if (Number(actual.proveedor_id) !== Number(proveedorId)) {
    throw new AppError('La calificación no pertenece al proveedor indicado', 400, 'proveedor_id')
  }

  const anterior = {
    puntualidad: actual.puntualidad,
    calidad: actual.calidad,
    comentario: actual.comentario,
  }
  const puntajes = validarPuntajes({
    puntualidad: body.puntualidad ?? anterior.puntualidad,
    calidad: body.calidad ?? anterior.calidad,
    comentario: body.comentario !== undefined ? body.comentario : anterior.comentario,
  })
  await repo.actualizar(actual.id, puntajes)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CORREGIR_CALIFICACION_PROVEEDOR',
    tabla: 'calificaciones_proveedor',
    registroId: Number(actual.id),
    detalles: {
      proveedor_id: Number(proveedorId),
      anterior,
      nuevo: puntajes,
    },
    ip: ctx.ip,
  })

  return {
    calificacion: await repo.findById(actual.id),
    promedio: await repo.promedio(proveedorId),
  }
}

export async function listarCalificaciones(proveedorId) {
  const proveedor = await proveedorDeId(proveedorId)
  return {
    proveedor: {
      id: Number(proveedor.id),
      razon_social: proveedor.razon_social,
      puntualidad_promedio: proveedor.puntualidad_promedio ?? null,
      calidad_promedio: proveedor.calidad_promedio ?? null,
      calificaciones: Number(proveedor.calificaciones ?? 0),
    },
    promedio: await repo.promedio(proveedor.id),
    calificaciones: await repo.listarPorProveedor(proveedor.id),
    calificables: await repo.calificables(proveedor.id),
  }
}
