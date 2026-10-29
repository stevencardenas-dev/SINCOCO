import * as repo from '../repositories/consumoMaterialRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import { verificarAccesoProyecto } from './accesoService.js'
import { rolTienePermiso } from '../middleware/permisos.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { textoOpcional, revisarLargo } from '../utils/campos.js'

/**
 * HU-20: consumo real de materiales por actividad.
 * El maestro de obra registra lo que consumió de lo despachado a la actividad (sin superarlo); el costo del consumo
 * se refleja en el costo de la actividad y del proyecto. Anular un consumo exige la autorización de un administrador:
 * el maestro la solicita y el administrador la autoriza o la rechaza.
 * REGISTRADO -> ANULACION_SOLICITADA -> ANULADO | REGISTRADO (rechazada).
 */
export const ESTADOS = ['REGISTRADO', 'ANULACION_SOLICITADA', 'ANULADO']
const PERMISO_AUTORIZAR = 'consumos_materiales.autorizar_anulacion'
const PERMISO_VER_TODOS = 'consumos_materiales.ver_todos'

const entero = (v, campo) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`${campo} es obligatorio`, 400, campo)
  return n
}
const positivo = (v, campo) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) throw new AppError(`${campo} debe ser mayor que cero`, 400, campo)
  if (Math.round(n * 100) / 100 !== n) throw new AppError(`${campo} admite como máximo 2 decimales`, 400, campo)
  return n
}

async function cargar(id) {
  const c = await repo.findById(id)
  if (!c) throw new AppError('Consumo no encontrado', 404)
  return c
}

/** Actividad existente y activa, y acceso del usuario a su proyecto. */
async function actividadConAcceso(actividadId, usuario) {
  const actividad = await repo.findActividad(actividadId)
  if (!actividad || !actividad.activo) throw new AppError('La actividad no existe o está dada de baja', 404, 'actividad_id')
  await verificarAccesoProyecto(usuario, actividad.proyecto_id)
  return actividad
}

export async function listarConsumos({ estado = '' } = {}, usuario) {
  const e = String(estado ?? '').trim().toUpperCase()
  if (e && !ESTADOS.includes(e)) throw new AppError(`estado debe ser uno de: ${ESTADOS.join(', ')}`, 400, 'estado')
  const veTodos = await rolTienePermiso(usuario.rol, PERMISO_VER_TODOS)
  return repo.listar({ estado: e, usuarioId: veTodos ? null : usuario.id })
}

/** Materiales despachados a la actividad y cuánto queda por consumir de cada uno. */
export async function disponiblesParaConsumo(actividadId, usuario) {
  const id = entero(actividadId, 'actividad_id')
  await actividadConAcceso(id, usuario)
  return repo.disponiblesDeActividad(id)
}

export async function registrarConsumo(body = {}, ctx) {
  const actividadId = entero(body.actividad_id, 'actividad_id')
  const materialId = entero(body.material_id, 'material_id')
  const cantidad = positivo(body.cantidad, 'cantidad')
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, 500, 'observaciones')
  await actividadConAcceso(actividadId, ctx.usuario)

  const id = await repo.registrar({
    actividadId, materialId, usuarioId: ctx.usuarioId, cantidad, observaciones,
    validar: ({ actividad, material, despachado, devuelto, consumido, costo }) => {
      if (!actividad || !actividad.activo) throw new AppError('La actividad no existe o está dada de baja', 404, 'actividad_id')
      if (!material || !material.activo) throw new AppError('El material no existe o está dado de baja', 404, 'material_id')
      if (despachado <= 0) throw new AppError('A esta actividad no se le ha despachado ese material', 409, 'material_id')
      // Criterio 1: lo consumido no puede superar lo efectivamente despachado a la actividad (menos lo devuelto y lo ya consumido).
      const disponible = Math.round((despachado - devuelto - consumido) * 100) / 100
      if (cantidad > disponible) {
        throw new AppError(`La cantidad supera lo disponible para consumo en la actividad (${disponible})`, 409, 'cantidad')
      }
      return costo
    },
  })
  const consumo = await repo.findById(id)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REGISTRAR_CONSUMO_MATERIALES', tabla: 'consumos_materiales', registroId: id,
    detalles: { comprobante: consumo.comprobante, actividad_id: actividadId, material_id: materialId, cantidad, costo_total: consumo.costo_total }, ip: ctx.ip,
  })
  return consumo
}

/** El maestro (o el administrador) solicita anular un consumo erróneo; no se anula hasta que un administrador lo autorice. */
export async function solicitarAnulacion(id, body = {}, ctx) {
  const c = await cargar(id)
  const propio = Number(c.registrado_por_usuario_id) === Number(ctx.usuarioId)
  if (!propio && !(await rolTienePermiso(ctx.usuario.rol, PERMISO_AUTORIZAR))) {
    throw new AppError('Solo quien registró el consumo o un administrador puede solicitar su anulación', 403)
  }
  const motivo = textoOpcional(body.motivo)
  if (!motivo) throw new AppError('Debe indicar el motivo de la anulación', 400, 'motivo')
  revisarLargo(motivo, 500, 'motivo')
  const ok = await repo.cambiarEstado(id, ['REGISTRADO'], 'ANULACION_SOLICITADA', {
    anulacion_motivo: motivo, anulacion_solicitada_por_usuario_id: ctx.usuarioId, anulacion_solicitada_en: new Date(),
  })
  if (!ok) throw new AppError(`No se puede solicitar la anulación de un consumo en estado ${c.estado}`, 409)
  await bitacora({ usuarioId: ctx.usuarioId, accion: 'SOLICITAR_ANULACION_CONSUMO', tabla: 'consumos_materiales', registroId: Number(id), detalles: { comprobante: c.comprobante, motivo }, ip: ctx.ip })
  return repo.findById(id)
}

/** Solo un administrador autoriza la anulación (la ruta exige el permiso). También puede anular directamente uno registrado, con motivo. */
export async function autorizarAnulacion(id, body = {}, ctx) {
  const c = await cargar(id)
  const observacion = textoOpcional(body.observaciones)
  revisarLargo(observacion, 500, 'observaciones')
  if (c.estado === 'REGISTRADO' && !observacion) {
    throw new AppError('Para anular un consumo sin solicitud indique el motivo en las observaciones', 400, 'observaciones')
  }
  const ok = await repo.cambiarEstado(id, ['ANULACION_SOLICITADA', 'REGISTRADO'], 'ANULADO', {
    anulacion_resuelta_por_usuario_id: ctx.usuarioId, anulacion_resuelta_en: new Date(), anulacion_observacion: observacion,
  })
  if (!ok) throw new AppError(`No se puede anular un consumo en estado ${c.estado}`, 409)
  await bitacora({ usuarioId: ctx.usuarioId, accion: 'AUTORIZAR_ANULACION_CONSUMO', tabla: 'consumos_materiales', registroId: Number(id), detalles: { comprobante: c.comprobante, costo_total: c.costo_total }, ip: ctx.ip })
  return repo.findById(id)
}

export async function rechazarAnulacion(id, body = {}, ctx) {
  const c = await cargar(id)
  const observacion = textoOpcional(body.observaciones)
  if (!observacion) throw new AppError('Debe indicar la observación que justifica el rechazo', 400, 'observaciones')
  revisarLargo(observacion, 500, 'observaciones')
  const ok = await repo.cambiarEstado(id, ['ANULACION_SOLICITADA'], 'REGISTRADO', {
    anulacion_resuelta_por_usuario_id: ctx.usuarioId, anulacion_resuelta_en: new Date(), anulacion_observacion: observacion,
  })
  if (!ok) throw new AppError(`No se puede rechazar la anulación de un consumo en estado ${c.estado}`, 409)
  await bitacora({ usuarioId: ctx.usuarioId, accion: 'RECHAZAR_ANULACION_CONSUMO', tabla: 'consumos_materiales', registroId: Number(id), detalles: { comprobante: c.comprobante, observacion }, ip: ctx.ip })
  return repo.findById(id)
}

/** Criterio 4: costo de materiales consumidos por actividad y total del proyecto. */
export async function consolidacionCostos(proyectoId, usuario) {
  const id = entero(proyectoId, 'proyecto_id')
  const proyecto = await proyectoRepository.findById(id)
  if (!proyecto) throw new AppError('Proyecto no encontrado', 404, 'proyecto_id')
  await verificarAccesoProyecto(usuario, id)
  const actividades = await repo.consolidacion(id)
  const total = Math.round(actividades.reduce((s, a) => s + a.costo_materiales, 0) * 100) / 100
  return { proyecto_id: id, proyecto: proyecto.nombre, costo_materiales_total: total, actividades }
}
