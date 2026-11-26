import * as herramientaRepository from '../repositories/herramientaRepository.js'
import * as herramientaEstadoRepository from '../repositories/herramientaEstadoRepository.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-27 · historial completo de una herramienta.
 *
 * El historial se arma con los préstamos (entrega y devolución), los cambios de
 * estado operativo (envíos a reparación y salidas) y se resume para detectar
 * patrones de uso que apoyen las decisiones de mantenimiento: cuántas veces
 * salió, cuántos días estuvo fuera en promedio, quién la usa más y cuándo fue
 * su último movimiento.
 */

const num = (valor) => Number(valor ?? 0)

const aMilisegundos = (fecha) => {
  const t = new Date(fecha ?? 0).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** Diferencia en días entre dos fechas, redondeada a un decimal. */
export function diasEntre(desde, hasta) {
  if (!desde || !hasta) return null
  const dias = (aMilisegundos(hasta) - aMilisegundos(desde)) / 86_400_000
  return dias < 0 ? 0 : Number(dias.toFixed(1))
}

/** Une préstamos y reparaciones en una sola línea de tiempo, lo más reciente primero. */
export function movimientosDe(prestamos, reparaciones) {
  const movimientos = []

  for (const p of prestamos) {
    movimientos.push({
      tipo: 'PRESTAMO',
      fecha: p.fecha_prestamo,
      prestamo_id: Number(p.id),
      trabajador: p.trabajador,
      proyecto: p.proyecto,
      proyecto_codigo: p.proyecto_codigo,
      estado_entrega: p.estado_entrega,
      fecha_estimada_devolucion: p.fecha_estimada_devolucion,
      entregado_por: p.entregado_por,
      observaciones: p.observaciones_entrega ?? null,
    })
    if (p.fecha_real_devolucion) {
      movimientos.push({
        tipo: 'DEVOLUCION',
        fecha: p.fecha_real_devolucion,
        prestamo_id: Number(p.id),
        trabajador: p.trabajador,
        proyecto: p.proyecto,
        proyecto_codigo: p.proyecto_codigo,
        estado_devolucion: p.estado_devolucion,
        estado_prestamo: p.estado_prestamo,
        fecha_prestamo: p.fecha_prestamo,
        dias_uso: diasEntre(p.fecha_prestamo, p.fecha_real_devolucion),
        recibido_por: p.recibido_por,
        observaciones: p.observaciones_devolucion ?? null,
      })
    }
  }

  for (const r of reparaciones) {
    movimientos.push({
      tipo: 'REPARACION',
      fecha: r.fecha_ingreso,
      reparacion_id: Number(r.id),
      descripcion: r.descripcion,
      estado_previo: r.estado_previo ?? null,
      ingresada_por: r.ingresada_por ?? null,
    })
    if (r.fecha_salida) {
      movimientos.push({
        tipo: 'SALIDA_REPARACION',
        fecha: r.fecha_salida,
        reparacion_id: Number(r.id),
        descripcion: r.descripcion,
        costo: r.costo === null || r.costo === undefined ? null : num(r.costo),
        dias_en_reparacion: diasEntre(r.fecha_ingreso, r.fecha_salida),
        observaciones: r.observaciones_salida ?? null,
      })
    }
  }

  return movimientos.sort((a, b) => {
    const diferencia = aMilisegundos(b.fecha) - aMilisegundos(a.fecha)
    return diferencia !== 0 ? diferencia : (b.prestamo_id ?? b.reparacion_id) - (a.prestamo_id ?? a.reparacion_id)
  })
}

/**
 * Resumen de uso: los datos que el encargado de bodega necesita para decidir si
 * una herramienta se mantiene, se repara o se da de baja.
 */
export function resumenDe(prestamos, reparaciones) {
  const devueltos = prestamos.filter((p) => p.fecha_real_devolucion)
  const dias = devueltos.map((p) => diasEntre(p.fecha_prestamo, p.fecha_real_devolucion)).filter((d) => d !== null)
  const porTrabajador = new Map()
  for (const p of prestamos) porTrabajador.set(p.trabajador, (porTrabajador.get(p.trabajador) ?? 0) + 1)
  const frecuente = [...porTrabajador].sort((a, b) => b[1] - a[1])[0] ?? null
  const movimientos = movimientosDe(prestamos, reparaciones)

  return {
    total_prestamos: prestamos.length,
    prestamos_vigentes: prestamos.filter((p) =>
      ['ACTIVO', 'ATRASADO', 'CON_NOVEDAD'].includes(p.estado_prestamo),
    ).length,
    total_reparaciones: reparaciones.length,
    dias_promedio_uso: dias.length === 0 ? null : Number((dias.reduce((t, d) => t + d, 0) / dias.length).toFixed(1)),
    trabajador_frecuente: frecuente ? { nombre: frecuente[0], prestamos: frecuente[1] } : null,
    ultimo_movimiento: movimientos[0] ?? null,
  }
}

export async function historialHerramienta(id) {
  const herramientaId = Number(id)
  const herramienta = await herramientaRepository.findById(herramientaId)
  if (!herramienta) throw new AppError('Herramienta no encontrada', 404)

  const prestamos = await herramientaRepository.historialPrestamos(herramientaId)
  const reparaciones = await herramientaEstadoRepository.listarReparaciones(herramientaId)

  return {
    herramienta: {
      id: Number(herramienta.id),
      codigo_serial: herramienta.codigo_serial,
      nombre: herramienta.nombre,
      estado_operativo: herramienta.estado_operativo,
      disponibilidad: herramienta.disponibilidad,
      almacen: herramienta.almacen,
    },
    sin_movimientos: prestamos.length === 0 && reparaciones.length === 0,
    resumen: resumenDe(prestamos, reparaciones),
    movimientos: movimientosDe(prestamos, reparaciones),
    prestamos,
  }
}
