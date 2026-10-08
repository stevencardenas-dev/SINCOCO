import * as asignacionRepository from '../repositories/asignacionRepository.js'
import * as extensionRepository from '../repositories/extensionAsignacionRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { aFechaDia } from '../utils/fechas.js'
import { LARGO, revisarLargo, textoOpcional } from '../utils/campos.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-31 · extensión (prórroga) de la fecha fin de una asignación vigente.
 *
 * La asignación original no se sobrescribe a ciegas: cada extensión queda como
 * un evento propio (fecha anterior, nueva, motivo, usuario y fecha), así la
 * fecha fin original y todas las prórrogas se pueden reconstruir.
 */
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/
const fmt = (f) => aFechaDia(f)

/** Asignación con su fecha fin original y las extensiones aplicadas (criterio 5). */
export async function historialDeAsignacion(id) {
  const asignacion = await asignacionRepository.findById(id)
  if (!asignacion) throw new AppError('La asignación no existe', 404)
  const extensiones = await extensionRepository.listarPorAsignacion(id)
  return {
    asignacion,
    fecha_fin_original: fmt(extensiones[0]?.fecha_fin_anterior ?? asignacion.fecha_fin_programada),
    extensiones,
  }
}

export async function extenderAsignacion(id, cuerpo = {}, ctx = {}) {
  const asignacion = await asignacionRepository.findById(id)
  if (!asignacion) throw new AppError('La asignación no existe', 404)

  // Alt. 3 · criterio 1: solo las vigentes se extienden.
  if (asignacion.estado !== 'ACTIVO') {
    throw new AppError(
      `La asignación está ${asignacion.estado.toLowerCase()} y no admite extensión: registre una nueva asignación`,
      409,
    )
  }

  const motivo = textoOpcional(cuerpo.motivo)
  if (!motivo) throw new AppError('El motivo de la extensión es obligatorio', 400, 'motivo')
  revisarLargo(motivo, LARGO.texto_largo, 'motivo')

  const nueva = textoOpcional(cuerpo.fecha_fin_programada)
  if (!nueva || !FORMATO_FECHA.test(nueva) || Number.isNaN(Date.parse(nueva))) {
    throw new AppError('Indique la nueva fecha fin (AAAA-MM-DD)', 400, 'fecha_fin_programada')
  }

  // Alt. 2 · criterio 2: posterior a la vigente y dentro de la actividad y el proyecto.
  const vigente = fmt(asignacion.fecha_fin_programada)
  if (!vigente) {
    throw new AppError('La asignación no tiene fecha fin programada: no hay nada que extender', 409)
  }
  if (nueva <= vigente) {
    throw new AppError(`La nueva fecha debe ser posterior a la vigente (${vigente})`, 400, 'fecha_fin_programada')
  }
  const limites = await extensionRepository.limitesDe(id)
  for (const [limite, nombre] of [[limites?.actividad_fin, 'la actividad'], [limites?.proyecto_fin, 'el proyecto']]) {
    if (limite && nueva > fmt(limite)) {
      throw new AppError(`La nueva fecha excede el fin de ${nombre} (${fmt(limite)}), que es el límite permitido`, 400, 'fecha_fin_programada')
    }
  }

  // Alt. 1 · criterio 4: sin sobreasignación en el tramo que se agrega.
  const choque = await extensionRepository.solapadaConTramo(asignacion.trabajador_id, id, vigente, nueva)
  if (choque) {
    throw new AppError(
      `Sobreasignación: el trabajador ya está asignado a «${choque.actividad_nombre ?? choque.proyecto_nombre}» ` +
        `(${fmt(choque.fecha_inicio)} a ${fmt(choque.fecha_fin_programada) ?? 'sin fin'}) en ese periodo`,
      409,
      'fecha_fin_programada',
    )
  }

  const extensionId = await extensionRepository.extender({
    asignacionId: id, anterior: vigente, nueva, motivo, usuarioId: ctx.usuarioId,
  })
  if (!extensionId) throw new AppError('La asignación cambió mientras se procesaba: vuelva a intentarlo', 409)

  // Criterio 6: bitácora de trazabilidad.
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'EXTENDER', tabla: 'asignaciones_personal', registroId: Number(id),
    detalles: { proyecto_id: asignacion.proyecto_id, fecha_fin_anterior: vigente, fecha_fin_nueva: nueva, motivo },
    ip: ctx.ip,
  })
  return historialDeAsignacion(id)
}
