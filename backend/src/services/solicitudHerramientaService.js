import * as repo from '../repositories/solicitudHerramientaRepository.js'
import * as herramientaRepository from '../repositories/herramientaRepository.js'
import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as asignacionRepository from '../repositories/asignacionRepository.js'
import { verificarAccesoProyecto } from './accesoService.js'
import { rolTienePermiso } from '../middleware/permisos.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { aFechaDia } from '../utils/fechas.js'
import { textoOpcional, revisarLargo } from '../utils/campos.js'

/**
 * HU-30: solicitud de herramientas.
 * PENDIENTE -> APROBADA | RECHAZADA | CANCELADA; APROBADA -> ENTREGADA (atendida) | CANCELADA.
 */
export const ESTADOS = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ENTREGADA', 'CANCELADA']
const PERMISO_RESOLVER = 'solicitudes_herramientas.resolver'
const PRESTABLES = ['EXCELENTE', 'BUENO', 'REGULAR']

const hoy = () => aFechaDia(new Date())

/** Disponibilidad real: activa, DISPONIBLE y en buen estado operativo (HU-10). */
function revisarPrestable(h) {
  if (!h || !h.activo) throw new AppError('La herramienta no existe o está dada de baja', 404, 'herramienta_id')
  if (h.disponibilidad !== 'DISPONIBLE' || !PRESTABLES.includes(h.estado_operativo)) {
    throw new AppError('La herramienta no está disponible para préstamo', 409, 'herramienta_id')
  }
}

async function cargar(id) {
  const s = await repo.findById(id)
  if (!s) throw new AppError('Solicitud no encontrada', 404)
  return s
}

export async function listarSolicitudes({ estado = '' } = {}, usuario) {
  const e = String(estado ?? '').trim().toUpperCase()
  if (e && !ESTADOS.includes(e)) throw new AppError(`estado debe ser uno de: ${ESTADOS.join(', ')}`, 400, 'estado')
  const veTodas = await rolTienePermiso(usuario.rol, PERMISO_RESOLVER)
  return repo.listar({ estado: e, usuarioId: veTodas ? null : usuario.id })
}

export async function crearSolicitud(body = {}, ctx) {
  const herramientaId = Number(body.herramienta_id)
  const proyectoId = Number(body.proyecto_id)
  const trabajadorId = Number(body.para_trabajador_id)
  const ids = [[herramientaId, 'herramienta_id'], [proyectoId, 'proyecto_id'], [trabajadorId, 'para_trabajador_id']]
  for (const [v, campo] of ids) {
    if (!Number.isInteger(v) || v <= 0) throw new AppError(`${campo} es obligatorio`, 400, campo)
  }
  const fechaRequerida = aFechaDia(body.fecha_requerida)
  if (!fechaRequerida || !/^\d{4}-\d{2}-\d{2}$/.test(fechaRequerida)) {
    throw new AppError('La fecha requerida es obligatoria', 400, 'fecha_requerida')
  }
  // Alt 2: una fecha futura es válida (queda pendiente hasta entonces); una pasada no.
  if (fechaRequerida < hoy()) throw new AppError('La fecha requerida no puede ser anterior a hoy', 400, 'fecha_requerida')
  const fechaDevolucion = aFechaDia(body.fecha_estimada_devolucion)
  if (!fechaDevolucion || !/^\d{4}-\d{2}-\d{2}$/.test(fechaDevolucion)) {
    throw new AppError('La fecha de devolución esperada es obligatoria', 400, 'fecha_estimada_devolucion')
  }
  if (fechaDevolucion < fechaRequerida) {
    throw new AppError('La devolución esperada no puede ser anterior a la fecha requerida', 400, 'fecha_estimada_devolucion')
  }
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, 500, 'observaciones')

  revisarPrestable(await herramientaRepository.findById(herramientaId))
  const trabajador = await trabajadorRepository.findById(trabajadorId)
  if (!trabajador || !trabajador.activo) {
    throw new AppError('El trabajador no existe o está dado de baja', 404, 'para_trabajador_id')
  }
  if (!(await proyectoRepository.findById(proyectoId))) throw new AppError('Proyecto no encontrado', 404, 'proyecto_id')
  await verificarAccesoProyecto(ctx.usuario, proyectoId)
  if (!(await asignacionRepository.tieneAcceso(proyectoId, trabajadorId))) {
    throw new AppError('El trabajador no está asignado a este proyecto', 400, 'para_trabajador_id')
  }

  const id = await repo.crear({ herramientaId, proyectoId, usuarioId: ctx.usuarioId, trabajadorId, fechaRequerida, fechaDevolucion, observaciones })
  const solicitud = await repo.findById(id)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'SOLICITAR_HERRAMIENTA', tabla: 'solicitudes_herramientas', registroId: id,
    detalles: { codigo: solicitud.codigo, herramienta_id: herramientaId, trabajador_id: trabajadorId }, ip: ctx.ip,
  })
  return solicitud
}

async function transicion(id, permitidoDesde, hacia, ctx, { observacion = null, exigeObservacion = false, accion } = {}) {
  const s = await cargar(id)
  if (!permitidoDesde.includes(s.estado)) throw new AppError(`No se puede pasar de ${s.estado} a ${hacia}`, 409)
  if (exigeObservacion && !observacion) {
    throw new AppError('Debe indicar la observación que justifica el rechazo', 400, 'observaciones')
  }
  if (!(await repo.cambiarEstado(id, s.estado, hacia, observacion))) {
    throw new AppError('La solicitud ya fue resuelta por otra persona', 409)
  }
  await bitacora({
    usuarioId: ctx.usuarioId, accion, tabla: 'solicitudes_herramientas', registroId: Number(id),
    detalles: { codigo: s.codigo, de: s.estado, a: hacia, observacion }, ip: ctx.ip,
  })
  return repo.findById(id)
}

export async function aprobarSolicitud(id, ctx) {
  const s = await cargar(id)
  // La herramienta pudo salir del inventario o deteriorarse desde que se pidió.
  if (s.estado === 'PENDIENTE') revisarPrestable(await herramientaRepository.findById(s.herramienta_id))
  return transicion(id, ['PENDIENTE'], 'APROBADA', ctx, { accion: 'APROBAR_SOLICITUD_HERRAMIENTA' })
}

export async function rechazarSolicitud(id, body = {}, ctx) {
  const observacion = textoOpcional(body.observaciones)
  revisarLargo(observacion, 500, 'observaciones')
  return transicion(id, ['PENDIENTE'], 'RECHAZADA', ctx, {
    observacion, exigeObservacion: true, accion: 'RECHAZAR_SOLICITUD_HERRAMIENTA',
  })
}

export async function atenderSolicitud(id, ctx) {
  return transicion(id, ['APROBADA'], 'ENTREGADA', ctx, { accion: 'ATENDER_SOLICITUD_HERRAMIENTA' })
}

/** Cancela quien la creó o quien puede resolver. */
export async function cancelarSolicitud(id, ctx) {
  const s = await cargar(id)
  const propia = Number(s.solicitado_por_usuario_id) === Number(ctx.usuarioId)
  if (!propia && !(await rolTienePermiso(ctx.usuario.rol, PERMISO_RESOLVER))) {
    throw new AppError('Solo quien la creó o bodega puede cancelar la solicitud', 403)
  }
  return transicion(id, ['PENDIENTE', 'APROBADA'], 'CANCELADA', ctx, { accion: 'CANCELAR_SOLICITUD_HERRAMIENTA' })
}
