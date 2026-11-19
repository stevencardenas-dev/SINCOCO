import * as alertaRepository from '../repositories/alertaRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import * as prestamoRepository from '../repositories/prestamoHerramientaRepository.js'
import { enviarRecordatorioAlerta } from './correoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-24 · alertas de actividades atrasadas y herramientas pendientes de
 * devolución.
 *
 * Criterios:
 *  - Actividad atrasada: fecha fin programada anterior a hoy y avance < 100.
 *  - Préstamo vencido: pasó la fecha estimada de devolución y no hay fecha real.
 *  - Cada alerta informa su tipo y su severidad (por días de atraso).
 *  - El recordatorio se envía al responsable desde la propia alerta.
 *
 * La evaluación es idempotente: no duplica una alerta pendiente del mismo tipo
 * para la misma referencia, así puede correr bajo demanda o programada.
 */

export const SEVERIDADES = ['ALTA', 'MEDIA', 'BAJA']

/** Días completos entre una fecha (date de MySQL) y hoy. Nunca negativo. */
export function diasDeAtraso(fecha, hoy = new Date()) {
  if (!fecha) return 0
  const limite = new Date(`${String(fecha).slice(0, 10)}T00:00:00`)
  const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.max(0, Math.round((dia - limite) / 86_400_000))
}

/** Umbrales de severidad: 7 días o más es alta, 3 o más media, el resto baja. */
export function severidadPorDias(dias) {
  if (dias >= 7) return 'ALTA'
  if (dias >= 3) return 'MEDIA'
  return 'BAJA'
}

/**
 * Severidad de una alerta según los días de atraso de su referencia. Las alertas
 * de otros tipos (stock mínimo, incidencias) no tienen fecha límite: se devuelve
 * `null` para no inventarles una escala.
 */
export function severidadDe(alerta, hoy = new Date()) {
  const limite =
    alerta.tabla_referencia === 'actividades'
      ? alerta.fecha_limite_actividad
      : alerta.tabla_referencia === 'prestamos_herramientas'
        ? alerta.fecha_limite_prestamo
        : null
  if (!limite) return null
  return severidadPorDias(diasDeAtraso(limite, hoy))
}

const fmtDia = (valor) => String(valor ?? '').slice(0, 10)

/**
 * Genera las alertas que falten para actividades atrasadas y préstamos vencidos.
 * Devuelve cuántas referencias se revisaron y cuántas alertas nuevas se crearon.
 */
export async function evaluarAtrasos() {
  const [actividades, prestamos] = await Promise.all([
    actividadRepository.atrasadas(),
    prestamoRepository.vencidos(),
  ])

  let creadas = 0

  for (const a of actividades) {
    const dias = diasDeAtraso(a.fecha_fin_programada)
    const creada = await alertaRepository.crearSiNoExiste({
      tipo: 'ACTIVIDAD_ATRASADA',
      titulo: `Actividad atrasada: ${a.nombre}`,
      descripcion:
        `La actividad ${a.nombre} del proyecto ${a.proyecto_nombre} venció el ${fmtDia(a.fecha_fin_programada)} ` +
        `con un avance de ${Number(a.porcentaje_avance)}% (${dias} ${dias === 1 ? 'día' : 'días'} de atraso).` +
        (a.responsable_nombre ? ` Responsable: ${a.responsable_nombre}.` : ''),
      referenciaId: a.id,
      tablaReferencia: 'actividades',
    })
    if (creada) creadas++
  }

  for (const p of prestamos) {
    const dias = diasDeAtraso(p.fecha_estimada_devolucion)
    const creada = await alertaRepository.crearSiNoExiste({
      tipo: 'HERRAMIENTA_PENDIENTE',
      titulo: `Herramienta pendiente de devolución: ${p.herramienta_nombre}`,
      descripcion:
        `La herramienta ${p.herramienta_codigo} prestada a ${p.trabajador_nombre ?? 'un trabajador'} ` +
        `para el proyecto ${p.proyecto_nombre} debía devolverse el ${fmtDia(p.fecha_estimada_devolucion)} ` +
        `y sigue sin devolución (${dias} ${dias === 1 ? 'día' : 'días'} de atraso).`,
      referenciaId: p.id,
      tablaReferencia: 'prestamos_herramientas',
    })
    if (creada) creadas++
  }

  return {
    evaluadas: { actividades: actividades.length, prestamos: prestamos.length },
    creadas,
  }
}

/** Destinatario del recordatorio según el tipo de alerta. */
async function destinatarioDe(alerta) {
  if (alerta.tabla_referencia === 'actividades') {
    const actividad = (await actividadRepository.atrasadas()).find(
      (a) => Number(a.id) === Number(alerta.referencia_id),
    )
    if (!actividad) return null
    return {
      destino: actividad.responsable_email,
      nombre: actividad.responsable_nombre,
      referencia: `${actividad.nombre} · ${actividad.proyecto_nombre}`,
      dias: diasDeAtraso(actividad.fecha_fin_programada),
    }
  }
  if (alerta.tabla_referencia === 'prestamos_herramientas') {
    const prestamo = (await prestamoRepository.vencidos()).find(
      (p) => Number(p.id) === Number(alerta.referencia_id),
    )
    if (!prestamo) return null
    return {
      destino: prestamo.trabajador_email,
      nombre: prestamo.trabajador_nombre,
      referencia: `${prestamo.herramienta_nombre} · ${prestamo.proyecto_nombre}`,
      dias: diasDeAtraso(prestamo.fecha_estimada_devolucion),
    }
  }
  return null
}

/**
 * Envía el recordatorio de una alerta a su responsable.
 * No se permite recordar una alerta ya atendida ni una cuyo responsable no
 * tenga correo registrado.
 */
export async function recordarAlerta(id, ctx = {}) {
  const alerta = await alertaRepository.findById(id)
  if (!alerta) throw new AppError('Alerta no encontrada', 404)
  if (alerta.atendida) throw new AppError('La alerta ya fue atendida: no hace falta recordarla', 409)

  const destinatario = await destinatarioDe(alerta)
  if (!destinatario) {
    throw new AppError('Esta alerta no tiene un responsable al que recordarle', 400)
  }
  if (!destinatario.destino) {
    throw new AppError('El responsable no tiene correo registrado', 400, 'correo')
  }

  const enviado = await enviarRecordatorioAlerta({
    destino: destinatario.destino,
    nombre: destinatario.nombre,
    alerta: {
      titulo: alerta.titulo,
      descripcion: alerta.descripcion,
      referencia: destinatario.referencia,
      severidad: severidadPorDias(destinatario.dias),
      dias_atraso: destinatario.dias,
    },
  })
  if (!enviado) {
    throw new AppError('No se pudo enviar el recordatorio: revise la configuración de correo', 502)
  }

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'RECORDAR_ALERTA',
    tabla: 'alertas',
    registroId: Number(id),
    detalles: { tipo: alerta.tipo, referencia_id: alerta.referencia_id, destino: destinatario.destino },
    ip: ctx.ip,
  })

  return { enviado: true, destino: destinatario.destino, severidad: severidadPorDias(destinatario.dias) }
}
