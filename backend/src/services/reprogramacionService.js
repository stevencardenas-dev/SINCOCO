import * as etapaRepository from '../repositories/etapaRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as reprogramacionRepository from '../repositories/reprogramacionRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { aFechaDia, rangosSeSolapan, validarDentroDeEtapa, validarFechasEnRango } from '../utils/fechas.js'
import { verificarAccesoProyecto, verificarGestionPlan } from './accesoService.js'

/**
 * HU-34: reprogramación de fechas del plan de trabajo.
 *
 * La fecha programada de cada elemento pasa a ser la vigente (la que usan el
 * cronograma y las alertas de atraso) y la primera programación queda en
 * `fecha_*_original` (criterio 1). Cada cambio deja una fila en el historial con
 * motivo, usuario y fechas anteriores y nuevas (criterio 2).
 */

/** Fila del historial para un elemento cuyas fechas cambian. */
function filaHistorial(tipo, elemento, proyectoId, nuevo, dto, ctx, origen = 'DIRECTA') {
  return {
    proyecto_id: proyectoId,
    entidad_tipo: tipo,
    entidad_id: elemento.id,
    origen,
    motivo: dto.motivo,
    usuario_id: ctx.usuarioId,
    fecha_inicio_anterior: aFechaDia(elemento.fecha_inicio_programada),
    fecha_fin_anterior: aFechaDia(elemento.fecha_fin_programada),
    fecha_inicio_nueva: nuevo.inicio,
    fecha_fin_nueva: nuevo.fin,
  }
}

/**
 * Reprograma una etapa. Las demás etapas del proyecto no pueden compartir días
 * con el nuevo rango (HU-03) y sus actividades deben seguir dentro de él.
 */
export async function reprogramarEtapa(id, dto, ctx = {}) {
  const etapa = await etapaRepository.findById(id)
  if (!etapa) throw new AppError('Etapa no encontrada', 404)
  await verificarGestionPlan(ctx.usuario, etapa.proyecto_id)
  if (!etapa.activo) throw new AppError('La etapa está dada de baja', 400)

  const proyecto = await proyectoRepository.findById(etapa.proyecto_id)
  const inicio = dto.fecha_inicio_programada
  const fin = dto.fecha_fin_programada
  validarFechasEnRango(inicio, fin, proyecto, 'la etapa')

  for (const otra of await etapaRepository.listarPorProyecto(etapa.proyecto_id)) {
    if (Number(otra.id) === Number(etapa.id)) continue
    const oInicio = aFechaDia(otra.fecha_inicio_programada)
    const oFin = aFechaDia(otra.fecha_fin_programada)
    if (oInicio && oFin && rangosSeSolapan(inicio, fin, oInicio, oFin)) {
      throw new AppError(
        `Las fechas se solapan con la etapa «${otra.nombre}» (${oInicio} a ${oFin})`,
        400,
        'fecha_inicio_programada',
      )
    }
  }
  const fuera = (await actividadRepository.listarPorEtapa(id)).find(
    (a) => aFechaDia(a.fecha_inicio_programada) < inicio || aFechaDia(a.fecha_fin_programada) > fin,
  )
  if (fuera) {
    throw new AppError(
      `La actividad «${fuera.nombre}» quedaría fuera de las nuevas fechas de la etapa; reprográmela primero`,
      400,
      'fecha_inicio_programada',
    )
  }

  await reprogramacionRepository.conTransaccion(async (conn) => {
    await reprogramacionRepository.registrar(
      conn, filaHistorial('ETAPA', etapa, etapa.proyecto_id, { inicio, fin }, dto, ctx),
    )
    await reprogramacionRepository.fijarFechas(conn, 'ETAPA', id, inicio, fin)
  })
  await etapaRepository.renumerar(etapa.proyecto_id)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REPROGRAMAR', tabla: 'etapas_proyecto',
    registroId: Number(id),
    detalles: { nombre: etapa.nombre, motivo: dto.motivo, fecha_inicio_programada: inicio, fecha_fin_programada: fin },
    ip: ctx.ip,
  })
  return { etapa: await etapaRepository.findById(id) }
}

/** Reprograma una actividad dentro del rango de su etapa y del proyecto. */
export async function reprogramarActividad(id, dto, ctx = {}) {
  const actividad = await actividadRepository.findById(id)
  if (!actividad) throw new AppError('Actividad no encontrada', 404)
  await verificarGestionPlan(ctx.usuario, actividad.proyecto_id)
  if (!actividad.activo) throw new AppError('La actividad está dada de baja', 400)

  const etapa = await etapaRepository.findById(actividad.etapa_id)
  const proyecto = await proyectoRepository.findById(actividad.proyecto_id)
  const inicio = dto.fecha_inicio_programada
  const fin = dto.fecha_fin_programada
  validarFechasEnRango(inicio, fin, proyecto)
  validarDentroDeEtapa(inicio, fin, etapa)

  await reprogramacionRepository.conTransaccion(async (conn) => {
    await reprogramacionRepository.registrar(
      conn, filaHistorial('ACTIVIDAD', actividad, actividad.proyecto_id, { inicio, fin }, dto, ctx),
    )
    await reprogramacionRepository.fijarFechas(conn, 'ACTIVIDAD', id, inicio, fin)
  })

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REPROGRAMAR', tabla: 'actividades',
    registroId: Number(id),
    detalles: { nombre: actividad.nombre, motivo: dto.motivo, fecha_inicio_programada: inicio, fecha_fin_programada: fin },
    ip: ctx.ip,
  })
  return { actividad: await actividadRepository.findById(id) }
}

/** Historial de reprogramaciones de una etapa o actividad, para quien tenga acceso al proyecto. */
export async function historial(tipo, id, usuario = null) {
  const elemento = tipo === 'ETAPA'
    ? await etapaRepository.findById(id)
    : await actividadRepository.findById(id)
  if (!elemento) throw new AppError(tipo === 'ETAPA' ? 'Etapa no encontrada' : 'Actividad no encontrada', 404)
  await verificarAccesoProyecto(usuario, elemento.proyecto_id)
  return reprogramacionRepository.listarPorEntidad(tipo, id)
}
