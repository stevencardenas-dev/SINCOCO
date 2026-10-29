import * as repo from '../repositories/solicitudMaterialRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import { verificarAccesoProyecto } from './accesoService.js'
import { rolTienePermiso } from '../middleware/permisos.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { aFechaDia } from '../utils/fechas.js'
import { textoOpcional, revisarLargo } from '../utils/campos.js'

/**
 * HU-08: solicitud de materiales.
 * PENDIENTE -> APROBADA (total o parcial) | RECHAZADA | CANCELADA;
 * APROBADA -> DESPACHADA_PARCIAL -> DESPACHADA_TOTAL | CANCELADA.
 */
export const ESTADOS = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'DESPACHADA_PARCIAL', 'DESPACHADA_TOTAL', 'CANCELADA']
const PERMISO_RESOLVER = 'solicitudes_materiales.resolver'

const entero = (v, campo) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`${campo} es obligatorio`, 400, campo)
  return n
}
const cantidad = (v, campo, { permiteCero = false } = {}) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0 || (!permiteCero && n === 0)) throw new AppError(`${campo} debe ser mayor que cero`, 400, campo)
  if (Math.round(n * 100) / 100 !== n) throw new AppError(`${campo} admite como máximo 2 decimales`, 400, campo)
  return n
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
  const proyectoId = entero(body.proyecto_id, 'proyecto_id')
  const actividadId = entero(body.actividad_id, 'actividad_id')
  const fecha = body.fecha_requerida ? aFechaDia(body.fecha_requerida) : null
  if (fecha !== null && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new AppError('La fecha requerida no es válida', 400, 'fecha_requerida')
  if (fecha && fecha < aFechaDia(new Date())) throw new AppError('La fecha requerida no puede ser anterior a hoy', 400, 'fecha_requerida')
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, 500, 'observaciones')
  if (!Array.isArray(body.detalles) || body.detalles.length === 0) throw new AppError('Debe solicitar al menos un material', 400, 'detalles')
  const detalles = body.detalles.map((d, i) => ({
    material_id: entero(d?.material_id, `detalles[${i}].material_id`),
    cantidad: cantidad(d?.cantidad, `detalles[${i}].cantidad`),
  }))
  if (new Set(detalles.map((d) => d.material_id)).size !== detalles.length) {
    throw new AppError('Un material no puede repetirse en la misma solicitud', 400, 'detalles')
  }

  const proyecto = await proyectoRepository.findById(proyectoId)
  if (!proyecto) throw new AppError('Proyecto no encontrado', 404, 'proyecto_id')
  await verificarAccesoProyecto(ctx.usuario, proyectoId)
  const actividad = await repo.findActividadProyecto(actividadId)
  if (!actividad || Number(actividad.proyecto_id) !== proyectoId) {
    throw new AppError('La actividad no existe o no pertenece al proyecto', 400, 'actividad_id')
  }
  const materiales = await repo.findMateriales(detalles.map((d) => d.material_id))
  for (const d of detalles) {
    const m = materiales.find((x) => Number(x.id) === d.material_id)
    if (!m || !m.activo) throw new AppError(`El material ${d.material_id} no existe o está dado de baja`, 404, 'detalles')
  }

  // CU-08 Alt 1: si lo pedido supera lo presupuestado, se alerta y se exige confirmación con justificación.
  const excesos = await calcularExcesos(actividadId, detalles, materiales)
  if (excesos.length > 0) {
    if (!(body.confirmar_exceso === true || body.confirmar_exceso === 'true')) {
      throw new AppError(
        'La cantidad solicitada supera lo presupuestado para la actividad. Confirme para continuar.',
        409, 'detalles', { codigo: 'EXCEDE_PRESUPUESTO', excesos },
      )
    }
    if (!observaciones) throw new AppError('Justifique en las observaciones por qué excede lo presupuestado', 400, 'observaciones')
  }

  const id = await repo.crear({
    proyectoId, actividadId, usuarioId: ctx.usuarioId, fechaRequerida: fecha, observaciones, detalles, excedePresupuesto: excesos.length > 0,
  })
  const solicitud = await repo.findById(id)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'SOLICITAR_MATERIALES', tabla: 'solicitudes_materiales', registroId: id,
    detalles: { codigo: solicitud.codigo, proyecto_id: proyectoId, actividad_id: actividadId, lineas: detalles.length, excede_presupuesto: excesos.length > 0 }, ip: ctx.ip,
  })
  return solicitud
}

/**
 * Materiales cuya cantidad (lo ya pedido en solicitudes vigentes + esta solicitud) supera lo
 * presupuestado para la actividad. Si la actividad no tiene presupuesto de materiales no hay
 * contra qué comparar; si lo tiene, un material fuera del presupuesto cuenta como presupuestado 0.
 */
async function calcularExcesos(actividadId, detalles, materiales) {
  const presupuesto = await repo.presupuestoActividad(actividadId)
  if (presupuesto.length === 0) return []
  const previo = await repo.yaSolicitadoActividad(actividadId, detalles.map((d) => d.material_id))
  const excesos = []
  for (const d of detalles) {
    const presupuestado = Number(presupuesto.find((p) => Number(p.material_id) === d.material_id)?.cantidad_presupuestada ?? 0)
    const yaSolicitado = Number(previo.find((p) => Number(p.material_id) === d.material_id)?.cantidad ?? 0)
    if (yaSolicitado + d.cantidad > presupuestado) {
      excesos.push({
        material_id: d.material_id,
        material: materiales.find((m) => Number(m.id) === d.material_id)?.descripcion,
        presupuestado, ya_solicitado: yaSolicitado, solicitado: d.cantidad,
      })
    }
  }
  return excesos
}

/** Catálogo de materiales para quien solicita (sin existencias ni costos). */
export const catalogoMateriales = () => repo.catalogoMateriales()

/** Bodega aprueba (todo o una cantidad menor por línea, CU-08 Alt 2). */
export async function aprobarSolicitud(id, body = {}, ctx) {
  const s = await cargar(id)
  if (s.estado !== 'PENDIENTE') throw new AppError(`No se puede aprobar una solicitud en estado ${s.estado}`, 409)
  const indicadas = new Map((Array.isArray(body.detalles) ? body.detalles : []).map((d) => [Number(d?.detalle_id), d?.cantidad_aprobada]))
  const aprobadas = s.detalles.map((l) => {
    const valor = indicadas.has(Number(l.id)) ? cantidad(indicadas.get(Number(l.id)), 'cantidad_aprobada', { permiteCero: true }) : Number(l.cantidad_solicitada)
    if (valor > Number(l.cantidad_solicitada)) {
      throw new AppError(`No se puede aprobar más de lo solicitado (${l.cantidad_solicitada}) de ${l.material}`, 400, 'cantidad_aprobada')
    }
    return { detalle_id: l.id, cantidad: valor }
  })
  if (aprobadas.every((a) => a.cantidad === 0)) {
    throw new AppError('Apruebe al menos una cantidad o rechace la solicitud', 400, 'cantidad_aprobada')
  }
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, 500, 'observaciones')
  // CU-08 Alt 2: se avisa al solicitante, y se detalla lo que difiere de lo pedido.
  const diferencias = aprobadas.flatMap((a, i) => {
    const l = s.detalles[i]
    return a.cantidad < Number(l.cantidad_solicitada)
      ? [`${l.material}: solicitado ${l.cantidad_solicitada}, aprobado ${a.cantidad} ${l.unidad_medida}`]
      : []
  })
  const notificacion = {
    usuarioId: s.solicitado_por_usuario_id,
    referenciaId: Number(id),
    titulo: diferencias.length > 0 ? `Solicitud ${s.codigo} aprobada parcialmente` : `Solicitud ${s.codigo} aprobada`,
    mensaje: diferencias.length > 0
      ? `Bodega aprobó una cantidad distinta a la solicitada. ${diferencias.join('; ')}.${observaciones ? ` Observación: ${observaciones}` : ''}`
      : 'Bodega aprobó la solicitud con las cantidades solicitadas.',
  }
  try {
    await repo.aprobar(id, aprobadas, observaciones, notificacion)
  } catch (err) {
    if (err.codigo === 'ESTADO') throw new AppError('La solicitud ya fue resuelta por otra persona', 409)
    throw err
  }
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'APROBAR_SOLICITUD_MATERIALES', tabla: 'solicitudes_materiales', registroId: Number(id),
    detalles: { codigo: s.codigo, parcial: aprobadas.some((a, i) => a.cantidad < Number(s.detalles[i].cantidad_solicitada)) }, ip: ctx.ip,
  })
  return repo.findById(id)
}

export async function rechazarSolicitud(id, body = {}, ctx) {
  const s = await cargar(id)
  const observacion = textoOpcional(body.observaciones)
  if (!observacion) throw new AppError('Debe indicar la observación que justifica el rechazo', 400, 'observaciones')
  revisarLargo(observacion, 500, 'observaciones')
  if (!(await repo.cambiarEstado(id, ['PENDIENTE'], 'RECHAZADA', observacion))) {
    throw new AppError(`No se puede rechazar una solicitud en estado ${s.estado}`, 409)
  }
  await repo.crearNotificacion({
    usuarioId: s.solicitado_por_usuario_id, referenciaId: Number(id),
    titulo: `Solicitud ${s.codigo} rechazada`, mensaje: `Bodega rechazó la solicitud. Motivo: ${observacion}`,
  })
  await bitacora({ usuarioId: ctx.usuarioId, accion: 'RECHAZAR_SOLICITUD_MATERIALES', tabla: 'solicitudes_materiales', registroId: Number(id), detalles: { codigo: s.codigo, observacion }, ip: ctx.ip })
  return repo.findById(id)
}

/** Cancela quien la creó o bodega, mientras no se haya despachado nada. */
export async function cancelarSolicitud(id, ctx) {
  const s = await cargar(id)
  const propia = Number(s.solicitado_por_usuario_id) === Number(ctx.usuarioId)
  if (!propia && !(await rolTienePermiso(ctx.usuario.rol, PERMISO_RESOLVER))) {
    throw new AppError('Solo quien la creó o bodega puede cancelar la solicitud', 403)
  }
  if (!(await repo.cambiarEstado(id, ['PENDIENTE', 'APROBADA'], 'CANCELADA'))) {
    throw new AppError(`No se puede cancelar una solicitud en estado ${s.estado}`, 409)
  }
  await bitacora({ usuarioId: ctx.usuarioId, accion: 'CANCELAR_SOLICITUD_MATERIALES', tabla: 'solicitudes_materiales', registroId: Number(id), detalles: { codigo: s.codigo }, ip: ctx.ip })
  return repo.findById(id)
}

/** Bodega despacha lo aprobado pendiente (todo, o las cantidades indicadas por línea). */
export async function despacharSolicitud(id, body = {}, ctx) {
  const almacenId = entero(body.almacen_origen_id, 'almacen_origen_id')
  const trabajadorId = entero(body.entregado_a_trabajador_id, 'entregado_a_trabajador_id')
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, 500, 'observaciones')
  const indicadas = new Map((Array.isArray(body.detalles) ? body.detalles : []).map((d) => [Number(d?.detalle_id), d?.cantidad]))
  await repo.despachar({
    id, almacenId, trabajadorId, usuarioId: ctx.usuarioId, observaciones,
    validar: (sol, lineas) => {
      if (!sol) throw new AppError('Solicitud no encontrada', 404)
      if (!['APROBADA', 'DESPACHADA_PARCIAL'].includes(sol.estado)) {
        throw new AppError(`No se puede despachar una solicitud en estado ${sol.estado}`, 409)
      }
      const salidas = []
      for (const l of lineas) {
        const pendiente = Number(l.cantidad_aprobada) - Number(l.cantidad_despachada)
        const c = indicadas.has(Number(l.id)) ? cantidad(indicadas.get(Number(l.id)), 'cantidad', { permiteCero: true }) : pendiente
        if (c === 0) continue
        if (c > pendiente) throw new AppError(`La cantidad supera lo aprobado pendiente (${pendiente})`, 409, 'cantidad')
        if (c > Number(l.existencia_total)) {
          throw new AppError(`Existencia insuficiente (${l.existencia_total}) para despachar ${c}`, 409, 'cantidad')
        }
        salidas.push({ detalle_id: l.id, material_id: l.material_id, cantidad: c, costo: l.costo_referencia })
      }
      if (salidas.length === 0) throw new AppError('No hay cantidades para despachar', 400, 'detalles')
      return salidas
    },
  })
  const solicitud = await repo.findById(id)
  await bitacora({ usuarioId: ctx.usuarioId, accion: 'DESPACHAR_SOLICITUD_MATERIALES', tabla: 'solicitudes_materiales', registroId: Number(id), detalles: { codigo: solicitud.codigo, estado: solicitud.estado }, ip: ctx.ip })
  return solicitud
}
