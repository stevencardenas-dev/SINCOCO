import * as etapaRepository from '../repositories/etapaRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as reprogramacionRepository from '../repositories/reprogramacionRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import {
  aFechaDia, diasEntre, sumarDias, validarDentroDeEtapa, validarFechasEnRango,
} from '../utils/fechas.js'
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
 * HU-34 · criterio 3: calcula cómo quedan las etapas posteriores a la que se
 * reprograma, manteniendo su orden y sin solapamientos (reglas de HU-03).
 *
 * Desplazamiento rígido: si la etapa reprogramada termina el mismo día o después
 * del inicio de la primera etapa siguiente, todas las siguientes se corren los
 * días justos para que esa quede a partir del día posterior; conservan su
 * duración y los huecos que ya tenían entre sí. Si no hay choque no se mueve nada.
 * Las etapas anteriores no se tocan: la nueva fecha de inicio no puede invadirlas.
 *
 * Devuelve las etapas que se mueven con su rango anterior y el nuevo.
 */
function calcularCascada(etapas, etapa, inicio, fin) {
  const posicion = etapas.findIndex((e) => Number(e.id) === Number(etapa.id))

  for (const anterior of etapas.slice(0, posicion)) {
    const aFin = aFechaDia(anterior.fecha_fin_programada)
    if (aFin && inicio <= aFin) {
      throw new AppError(
        `El inicio no puede ser anterior ni igual al fin de la etapa anterior «${anterior.nombre}» (${aFin}); reprográmela primero`,
        400,
        'fecha_inicio_programada',
      )
    }
  }

  const siguientes = etapas.slice(posicion + 1).filter(
    (e) => aFechaDia(e.fecha_inicio_programada) && aFechaDia(e.fecha_fin_programada),
  )
  if (siguientes.length === 0) return []
  const primeraInicio = aFechaDia(siguientes[0].fecha_inicio_programada)
  if (primeraInicio > fin) return []

  const desplazamiento = diasEntre(primeraInicio, sumarDias(fin, 1))
  const movidas = []
  for (const e of siguientes) {
    if (e.estado === 'COMPLETADA') {
      throw new AppError(
        `La etapa posterior «${e.nombre}» ya está completada y no puede desplazarse`,
        409,
        'estado',
      )
    }
    const anteriorInicio = aFechaDia(e.fecha_inicio_programada)
    const anteriorFin = aFechaDia(e.fecha_fin_programada)
    movidas.push({
      etapa: e,
      desplazamiento,
      inicio: sumarDias(anteriorInicio, desplazamiento),
      fin: sumarDias(anteriorFin, desplazamiento),
    })
  }
  return movidas
}

/**
 * Reprograma una etapa y recalcula las siguientes (criterio 3). Las actividades
 * de la etapa reprogramada no se mueven solas: deben seguir dentro de su nuevo
 * rango. Las actividades de las etapas desplazadas se corren con ellas.
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

  const etapas = await etapaRepository.listarPorProyecto(etapa.proyecto_id)
  const movidas = calcularCascada(etapas, etapa, inicio, fin)

  // Hasta que el criterio 4 permita extender el proyecto, el recálculo debe
  // caber en sus fechas.
  const ultimoFin = movidas.length ? movidas[movidas.length - 1].fin : fin
  validarFechasEnRango(inicio, ultimoFin, proyecto, 'la etapa')

  // Las actividades de las etapas desplazadas viajan con ellas.
  const actividadesMovidas = []
  for (const m of movidas) {
    for (const a of await actividadRepository.listarPorEtapa(m.etapa.id)) {
      actividadesMovidas.push({
        actividad: a,
        inicio: sumarDias(aFechaDia(a.fecha_inicio_programada), m.desplazamiento),
        fin: sumarDias(aFechaDia(a.fecha_fin_programada), m.desplazamiento),
      })
    }
  }

  await reprogramacionRepository.conTransaccion(async (conn) => {
    await reprogramacionRepository.registrar(
      conn, filaHistorial('ETAPA', etapa, etapa.proyecto_id, { inicio, fin }, dto, ctx),
    )
    await reprogramacionRepository.fijarFechas(conn, 'ETAPA', id, inicio, fin)

    for (const m of movidas) {
      await reprogramacionRepository.registrar(
        conn, filaHistorial('ETAPA', m.etapa, etapa.proyecto_id, m, dto, ctx, 'CASCADA'),
      )
      await reprogramacionRepository.fijarFechas(conn, 'ETAPA', m.etapa.id, m.inicio, m.fin)
    }
    for (const m of actividadesMovidas) {
      await reprogramacionRepository.registrar(
        conn, filaHistorial('ACTIVIDAD', m.actividad, etapa.proyecto_id, m, dto, ctx, 'CASCADA'),
      )
      await reprogramacionRepository.fijarFechas(conn, 'ACTIVIDAD', m.actividad.id, m.inicio, m.fin)
    }
  })
  await etapaRepository.renumerar(etapa.proyecto_id)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REPROGRAMAR', tabla: 'etapas_proyecto',
    registroId: Number(id),
    detalles: {
      nombre: etapa.nombre, motivo: dto.motivo,
      fecha_inicio_programada: inicio, fecha_fin_programada: fin,
      etapas_desplazadas: movidas.map((m) => m.etapa.id),
    },
    ip: ctx.ip,
  })
  return {
    etapa: await etapaRepository.findById(id),
    etapas_desplazadas: movidas.map((m) => ({
      id: m.etapa.id,
      nombre: m.etapa.nombre,
      fecha_inicio_anterior: aFechaDia(m.etapa.fecha_inicio_programada),
      fecha_fin_anterior: aFechaDia(m.etapa.fecha_fin_programada),
      fecha_inicio_nueva: m.inicio,
      fecha_fin_nueva: m.fin,
    })),
    actividades_desplazadas: actividadesMovidas.length,
  }
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
