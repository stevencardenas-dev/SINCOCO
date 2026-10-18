import * as incidenciaRepository from '../repositories/incidenciaRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import {
  alcanceDeUsuario,
  verificarAccesoProyecto,
  verificarGestionPlan,
} from './accesoService.js'
import { enviarAvisoIncidencia } from './correoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { SEVERIDADES } from '../dtos/incidencia/RegistrarIncidenciaDto.js'
import { aFechaDia } from '../utils/fechas.js'
import { AppError } from '../utils/AppError.js'

/**
 * Incidencias de obra (HU-14).
 *
 *  - Criterio 1 y 2: los datos obligatorios los valida el DTO; la actividad,
 *    si viene, debe estar activa y ser del proyecto.
 *  - Criterio 3: el estado avanza ABIERTA → EN_REVISION → RESUELTA → CERRADA
 *    hasta registrar `fecha_resolucion`.
 *  - Criterio 4: las de severidad ALTA o CRITICA generan una alerta y un correo
 *    al responsable del proyecto, y resaltan la actividad en el cronograma.
 */

export const ESTADOS_INCIDENCIA = ['ABIERTA', 'EN_REVISION', 'RESUELTA', 'CERRADA']
export const SEVERIDADES_GRAVES = ['ALTA', 'CRITICA']

/** Estados a los que puede pasar cada estado (el cierre es definitivo). */
const TRANSICIONES = {
  ABIERTA: ['EN_REVISION', 'RESUELTA', 'CERRADA'],
  EN_REVISION: ['RESUELTA', 'CERRADA'],
  RESUELTA: ['CERRADA'],
  CERRADA: [],
}
const ESTADOS_DE_RESOLUCION = ['RESUELTA', 'CERRADA']

const hoy = () => aFechaDia(new Date())

export async function registrarIncidencia(dto, ctx = {}) {
  const proyecto = await proyectoRepository.findById(dto.proyecto_id)
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  if (!proyecto.activo) throw new AppError('El proyecto está dado de baja', 400, 'proyecto_id')
  await verificarAccesoProyecto(ctx.usuario, dto.proyecto_id)

  if (dto.actividad_id) {
    const actividad = await actividadRepository.findById(dto.actividad_id)
    if (!actividad) throw new AppError('La actividad indicada no existe', 404, 'actividad_id')
    if (!actividad.activo) throw new AppError('La actividad está dada de baja', 400, 'actividad_id')
    if (Number(actividad.proyecto_id) !== Number(dto.proyecto_id)) {
      throw new AppError('La actividad no pertenece al proyecto indicado', 400, 'actividad_id')
    }
  }

  const grave = SEVERIDADES_GRAVES.includes(dto.severidad)
  const alerta = grave
    ? {
        titulo: `Incidencia ${dto.severidad}: ${dto.titulo}`.slice(0, 150),
        descripcion: `${dto.tipo} en el proyecto ${proyecto.nombre}. ${dto.descripcion}`,
      }
    : null

  const id = await incidenciaRepository.crear({ ...dto, usuarioId: ctx.usuarioId }, alerta)
  const incidencia = await incidenciaRepository.findById(id)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'incidencias',
    registroId: id,
    detalles: { proyecto_id: dto.proyecto_id, actividad_id: dto.actividad_id, tipo: dto.tipo, severidad: dto.severidad },
    ip: ctx.ip,
  })

  // El aviso no debe tumbar el registro: la incidencia y su alerta ya quedaron guardadas.
  let correoEnviado = false
  if (grave) {
    try {
      const responsable = await incidenciaRepository.responsableDelProyecto(dto.proyecto_id)
      correoEnviado = await enviarAvisoIncidencia({
        destino: responsable?.email,
        nombre: responsable?.nombre,
        incidencia,
      })
    } catch (err) {
      console.error('incidencia: no se pudo avisar al responsable:', err.message)
    }
  }

  return { ...incidencia, alerta_generada: grave, correo_enviado: correoEnviado }
}

export async function listarIncidencias(filtros = {}, usuario = null) {
  const { proyecto_id, actividad_id, estado, severidad } = filtros
  const estadoN = estado ? String(estado).toUpperCase() : undefined
  if (estadoN && !ESTADOS_INCIDENCIA.includes(estadoN)) {
    throw new AppError(`estado debe ser uno de: ${ESTADOS_INCIDENCIA.join(', ')}`, 400, 'estado')
  }
  const severidadN = severidad ? String(severidad).toUpperCase() : undefined
  if (severidadN && !SEVERIDADES.includes(severidadN)) {
    throw new AppError(`severidad debe ser una de: ${SEVERIDADES.join(', ')}`, 400, 'severidad')
  }

  let alcance = { total: true, trabajadorId: null }
  if (proyecto_id) await verificarAccesoProyecto(usuario, proyecto_id)
  else alcance = await alcanceDeUsuario(usuario)

  return incidenciaRepository.listar({
    proyectoId: proyecto_id ? Number(proyecto_id) : undefined,
    actividadId: actividad_id ? Number(actividad_id) : undefined,
    estado: estadoN,
    severidad: severidadN,
    trabajadorId: alcance.trabajadorId,
    limitarAcceso: !alcance.total,
  })
}

export async function obtenerIncidencia(id, usuario) {
  const incidencia = await incidenciaRepository.findById(id)
  if (!incidencia) throw new AppError('La incidencia no existe', 404)
  await verificarAccesoProyecto(usuario, incidencia.proyecto_id)
  return incidencia
}

/**
 * Da seguimiento a una incidencia: cambia el estado y/o registra la fecha de
 * resolución. Puede quien la reportó o quien gestiona el plan del proyecto
 * (líder, gerente, administrador). Pasar a RESUELTA o CERRADA fija la fecha de
 * resolución (hoy, si no se indica) y atiende la alerta asociada.
 */
export async function actualizarIncidencia(id, cambios = {}, ctx = {}) {
  const actual = await incidenciaRepository.findById(id)
  if (!actual) throw new AppError('La incidencia no existe', 404)
  await verificarAccesoProyecto(ctx.usuario, actual.proyecto_id)
  if (Number(actual.reportado_por_usuario_id) !== Number(ctx.usuarioId)) {
    await verificarGestionPlan(ctx.usuario, actual.proyecto_id)
  }

  const campos = {}
  const estado = cambios.estado === undefined ? undefined : String(cambios.estado).toUpperCase()
  if (estado !== undefined) {
    if (!ESTADOS_INCIDENCIA.includes(estado)) {
      throw new AppError(`estado debe ser uno de: ${ESTADOS_INCIDENCIA.join(', ')}`, 400, 'estado')
    }
    if (estado !== actual.estado) {
      if (!TRANSICIONES[actual.estado].includes(estado)) {
        throw new AppError(
          TRANSICIONES[actual.estado].length === 0
            ? 'La incidencia está cerrada y no admite cambiar de estado'
            : `Una incidencia ${actual.estado.toLowerCase()} solo puede pasar a: ${TRANSICIONES[actual.estado].join(', ')}`,
          409,
          'estado',
        )
      }
      campos.estado = estado
    }
  }

  const estadoFinal = campos.estado ?? actual.estado
  const pideFecha = cambios.fecha_resolucion !== undefined && cambios.fecha_resolucion !== null && cambios.fecha_resolucion !== ''
  if (pideFecha) {
    const dia = aFechaDia(cambios.fecha_resolucion)
    if (!dia || Number.isNaN(Date.parse(dia))) {
      throw new AppError('fecha_resolucion debe ser una fecha válida', 400, 'fecha_resolucion')
    }
    if (dia > hoy()) {
      throw new AppError('La fecha de resolución no puede ser futura', 400, 'fecha_resolucion')
    }
    if (dia < aFechaDia(actual.fecha_incidencia)) {
      throw new AppError('La fecha de resolución no puede ser anterior a la de la incidencia', 400, 'fecha_resolucion')
    }
    if (!ESTADOS_DE_RESOLUCION.includes(estadoFinal)) {
      throw new AppError('Solo una incidencia resuelta o cerrada tiene fecha de resolución', 409, 'fecha_resolucion')
    }
    campos.fecha_resolucion = dia
  } else if (ESTADOS_DE_RESOLUCION.includes(estadoFinal) && !actual.fecha_resolucion) {
    campos.fecha_resolucion = hoy()
  }

  if (Object.keys(campos).length === 0) throw new AppError('No hay campos que actualizar', 400)

  await incidenciaRepository.actualizar(id, campos)
  if (ESTADOS_DE_RESOLUCION.includes(estadoFinal)) await incidenciaRepository.atenderAlerta(id)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'incidencias',
    registroId: Number(id),
    detalles: { proyecto_id: actual.proyecto_id, cambios: campos },
    ip: ctx.ip,
  })

  return incidenciaRepository.findById(id)
}

/** Actividades de un proyecto con una incidencia grave sin resolver (para resaltarlas). */
export async function actividadesAfectadas(proyectoId, usuario) {
  if (!proyectoId) throw new AppError('proyecto_id es obligatorio', 400, 'proyecto_id')
  await verificarAccesoProyecto(usuario, proyectoId)
  return incidenciaRepository.actividadesConIncidenciaGrave(proyectoId)
}
