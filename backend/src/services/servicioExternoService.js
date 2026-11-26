import * as servicioExternoRepository from '../repositories/servicioExternoRepository.js'
import * as proveedorRepository from '../repositories/proveedorRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import { alcanceDeUsuario, verificarAccesoProyecto } from './accesoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { aFechaDia } from '../utils/fechas.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-28: servicios externos contratados. Cada servicio queda ligado a un
 * proveedor, un proyecto y una actividad; su valor suma al costo de servicios
 * externos del proyecto (criterio 3, ya consolidado por el dashboard) y se
 * compara con el presupuesto de la actividad (criterio 4).
 *
 * HU-32: cuando el valor supera el presupuesto disponible de la actividad, el
 * servicio no se registra con una simple advertencia: queda PENDIENTE de
 * autorización, se notifica al gerente con el detalle del exceso y no suma a la
 * consolidación de costos hasta que se autorice. El rechazo lo devuelve al
 * administrador para reajustar el monto y reevaluarlo.
 */

export const ESTADOS_SERVICIO = ['PROGRAMADO', 'EN_EJECUCION', 'FINALIZADO', 'CANCELADO']
const ESTADOS_PROYECTO_CERRADO = ['FINALIZADO', 'CANCELADO']

export const AUTORIZACIONES = ['NO_REQUIERE', 'PENDIENTE', 'AUTORIZADA', 'RECHAZADA']

// Los montos se comparan en centavos para no perder precisión con decimales.
const aCentavos = (monto) => Math.round(Number(monto) * 100)

const pesos = (centavos) => centavos / 100

/**
 * Compara el valor de un servicio con el presupuesto disponible de la
 * actividad. Sin presupuesto definido no hay nada que comparar y nunca hay
 * exceso.
 */
export function evaluarPresupuesto(presupuesto, comprometido, valor) {
  if (presupuesto === null || presupuesto === undefined) {
    return { aplica: false, disponible: null, exceso: 0 }
  }
  const disponible = aCentavos(presupuesto) - aCentavos(comprometido)
  const exceso = Math.max(0, aCentavos(valor) - disponible)
  return { aplica: true, disponible: pesos(disponible), exceso: pesos(exceso) }
}

const monto = (valor) =>
  Number(valor ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

/** Avisa al gerente con el detalle que necesita para autorizar o rechazar. */
async function notificarSobrecosto({ servicioId, nombre, proveedor, proyecto, actividad, presupuesto, disponible, valor, exceso }) {
  return servicioExternoRepository.notificarGerentes({
    titulo: `Servicio externo pendiente de autorización: ${nombre}`,
    mensaje:
      `${proveedor} · ${proyecto} · ${actividad}. ` +
      `Presupuesto de la actividad ${monto(presupuesto)}, disponible ${monto(disponible)}, ` +
      `valor contratado ${monto(valor)} y exceso ${monto(exceso)}. ` +
      'Autorícelo o rechágelo para que el administrador reajuste el monto.',
    servicioId,
  })
}

function idDeFiltro(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return undefined
  const n = Number(valor)
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`${campo} debe ser un identificador válido`, 400, campo)
  return n
}

/** Administrador y gerente listan sin filtros; el resto debe indicar un proyecto con acceso. */
export async function listarServicios(filtros = {}, usuario = null) {
  const proyectoId = idDeFiltro(filtros.proyecto_id, 'proyecto_id')
  const estado = filtros.estado ? String(filtros.estado).toUpperCase() : undefined
  if (estado && !ESTADOS_SERVICIO.includes(estado)) {
    throw new AppError(`estado debe ser uno de: ${ESTADOS_SERVICIO.join(', ')}`, 400, 'estado')
  }
  if (proyectoId) await verificarAccesoProyecto(usuario, proyectoId)
  else if (!(await alcanceDeUsuario(usuario)).total) {
    throw new AppError('Indique el proyecto cuyos servicios desea consultar', 403)
  }
  return servicioExternoRepository.listar({
    proyectoId,
    actividadId: idDeFiltro(filtros.actividad_id, 'actividad_id'),
    proveedorId: idDeFiltro(filtros.proveedor_id, 'proveedor_id'),
    estado,
  })
}

/**
 * Registra un servicio externo.
 *  - Criterio 1: proveedor activo, proyecto abierto y actividad del proyecto.
 *  - Criterio 2: fin no anterior al inicio y valor mayor que cero.
 *  - Criterio 4: si el valor supera el presupuesto disponible de la actividad
 *    responde 409 EXCEDE_PRESUPUESTO con el detalle y no guarda nada hasta que
 *    llegue `confirmar_exceso`.
 */
export async function registrarServicio(dto, ctx = {}) {
  const proveedor = await proveedorRepository.findById(dto.proveedor_id)
  if (!proveedor) throw new AppError('El proveedor indicado no existe', 404, 'proveedor_id')
  if (!proveedor.activo || proveedor.estado !== 'ACTIVO') {
    throw new AppError('El proveedor está inactivo y no admite servicios nuevos', 400, 'proveedor_id')
  }

  const proyecto = await proyectoRepository.findById(dto.proyecto_id)
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  if (!proyecto.activo) throw new AppError('El proyecto está dado de baja', 400, 'proyecto_id')
  if (ESTADOS_PROYECTO_CERRADO.includes(proyecto.estado)) {
    throw new AppError(
      `El proyecto está ${proyecto.estado.toLowerCase()} y no admite servicios externos nuevos`,
      409,
      'proyecto_id',
    )
  }
  await verificarAccesoProyecto(ctx.usuario, proyecto.id)

  const actividad = await actividadRepository.findById(dto.actividad_id)
  if (!actividad) throw new AppError('La actividad indicada no existe', 404, 'actividad_id')
  if (!actividad.activo) throw new AppError('La actividad está dada de baja', 400, 'actividad_id')
  if (Number(actividad.proyecto_id) !== Number(proyecto.id)) {
    throw new AppError('La actividad no pertenece al proyecto indicado', 400, 'actividad_id')
  }

  if (aFechaDia(dto.fecha_fin) < aFechaDia(dto.fecha_inicio)) {
    throw new AppError('La fecha de fin no puede ser anterior a la de inicio', 400, 'fecha_fin')
  }
  if (!(dto.valor_contratado > 0)) {
    throw new AppError('El valor contratado debe ser mayor que 0', 400, 'valor_contratado')
  }

  const comprometido = await servicioExternoRepository.totalContratadoActividad(actividad.id)
  const { disponible, exceso } = evaluarPresupuesto(actividad.presupuesto, comprometido, dto.valor_contratado)
  // Criterio 1: con exceso el servicio queda pendiente de autorización y no se
  // suma a la consolidación de costos hasta que el gerente lo autorice.
  const autorizacion = exceso > 0 ? 'PENDIENTE' : 'NO_REQUIERE'

  const id = await servicioExternoRepository.create({
    ...dto,
    proveedor_id: proveedor.id,
    proyecto_id: proyecto.id,
    actividad_id: actividad.id,
    autorizacion_estado: autorizacion,
    exceso_presupuesto: exceso,
  })

  // Criterio 2: notificación al gerente con servicio, proveedor, actividad,
  // presupuesto disponible, valor contratado y exceso.
  const notificados = exceso > 0
    ? await notificarSobrecosto({
        servicioId: id,
        nombre: dto.nombre_servicio,
        proveedor: proveedor.razon_social,
        proyecto: `${proyecto.codigo} ${proyecto.nombre}`,
        actividad: actividad.nombre,
        presupuesto: actividad.presupuesto,
        disponible,
        valor: dto.valor_contratado,
        exceso,
      })
    : 0

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'servicios_externos',
    registroId: id,
    detalles: {
      proveedor_id: proveedor.id,
      proyecto_id: proyecto.id,
      actividad_id: actividad.id,
      nombre_servicio: dto.nombre_servicio,
      valor_contratado: dto.valor_contratado,
      autorizacion_estado: autorizacion,
      ...(exceso > 0 && { excede_presupuesto: true, exceso }),
    },
    ip: ctx.ip,
  })

  return { ...(await servicioExternoRepository.findById(id)), notificados }
}

async function servicioDeId(id) {
  const servicio = await servicioExternoRepository.findById(id)
  if (!servicio) throw new AppError('El servicio externo no existe', 404)
  return servicio
}

/** Criterio 3: el gerente autoriza el servicio pendiente y se suma a los costos. */
export async function autorizarServicio(id, body = {}, ctx = {}) {
  const servicio = await servicioDeId(id)
  if (servicio.estado === 'CANCELADO') {
    throw new AppError('El servicio está cancelado; no hay nada que autorizar', 409, 'estado')
  }
  if (servicio.autorizacion_estado !== 'PENDIENTE') {
    throw new AppError(
      `El servicio no está pendiente de autorización (estado: ${servicio.autorizacion_estado})`,
      409,
      'autorizacion_estado',
    )
  }

  const observacion = body.observacion ? String(body.observacion).trim() : null
  const aplicado = await servicioExternoRepository.decidirAutorizacion(id, {
    estado: 'AUTORIZADA',
    usuarioId: ctx.usuarioId,
    observacion,
  })
  if (!aplicado) throw new AppError('El servicio ya fue decidido por otro usuario', 409, 'autorizacion_estado')

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'AUTORIZAR_SOBRECOSTO',
    tabla: 'servicios_externos',
    registroId: Number(id),
    detalles: { exceso: servicio.exceso_presupuesto, valor_contratado: servicio.valor_contratado, observacion },
    ip: ctx.ip,
  })

  return servicioDeId(id)
}

/** Criterio 3 (alternativo 1): rechazo con observación obligatoria para reajustar. */
export async function rechazarServicio(id, body = {}, ctx = {}) {
  const servicio = await servicioDeId(id)
  if (servicio.autorizacion_estado !== 'PENDIENTE') {
    throw new AppError(
      `El servicio no está pendiente de autorización (estado: ${servicio.autorizacion_estado})`,
      409,
      'autorizacion_estado',
    )
  }
  const observacion = String(body.observacion ?? '').trim()
  if (!observacion) {
    throw new AppError('El rechazo exige una observación para que se reajuste el monto', 400, 'observacion')
  }
  if (observacion.length > 500) {
    throw new AppError('La observación admite máximo 500 caracteres', 400, 'observacion')
  }

  const aplicado = await servicioExternoRepository.decidirAutorizacion(id, {
    estado: 'RECHAZADA',
    usuarioId: ctx.usuarioId,
    observacion,
  })
  if (!aplicado) throw new AppError('El servicio ya fue decidido por otro usuario', 409, 'autorizacion_estado')

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'RECHAZAR_SOBRECOSTO',
    tabla: 'servicios_externos',
    registroId: Number(id),
    detalles: { exceso: servicio.exceso_presupuesto, valor_contratado: servicio.valor_contratado, observacion },
    ip: ctx.ip,
  })

  return servicioDeId(id)
}

/**
 * Criterio 4: al reajustar el monto el servicio se reevalúa contra el
 * presupuesto de la actividad. Si ya cabe, se confirma sin autorización
 * (alternativo 2); si sigue excediendo, vuelve a quedar pendiente y se notifica
 * de nuevo al gerente.
 */
export async function reajustarValor(id, body = {}, ctx = {}) {
  const servicio = await servicioDeId(id)
  if (!['PENDIENTE', 'RECHAZADA'].includes(servicio.autorizacion_estado)) {
    throw new AppError(
      'Solo se reajusta el monto de un servicio pendiente o rechazado',
      409,
      'autorizacion_estado',
    )
  }
  const valor = Number(body.valor_contratado)
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new AppError('El valor contratado debe ser mayor que 0', 400, 'valor_contratado')
  }
  if (Number(valor.toFixed(2)) !== valor) {
    throw new AppError('El valor contratado admite máximo 2 decimales', 400, 'valor_contratado')
  }
  if (!servicio.actividad_id) {
    throw new AppError('El servicio no tiene actividad asociada para revalidar el presupuesto', 409, 'actividad_id')
  }

  const actividad = await actividadRepository.findById(servicio.actividad_id)
  const comprometido = await servicioExternoRepository.totalContratadoActividad(actividad.id, servicio.id)
  const { disponible, exceso } = evaluarPresupuesto(actividad.presupuesto, comprometido, valor)
  const autorizacion = exceso > 0 ? 'PENDIENTE' : 'NO_REQUIERE'

  await servicioExternoRepository.actualizarValor(servicio.id, {
    valorContratado: valor,
    autorizacion,
    exceso,
  })

  if (exceso > 0) {
    await notificarSobrecosto({
      servicioId: servicio.id,
      nombre: servicio.nombre_servicio,
      proveedor: servicio.proveedor_nombre,
      proyecto: `${servicio.proyecto_codigo} ${servicio.proyecto_nombre}`,
      actividad: servicio.actividad_nombre,
      presupuesto: actividad.presupuesto,
      disponible,
      valor,
      exceso,
    })
  }

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'REAJUSTAR_SOBRECOSTO',
    tabla: 'servicios_externos',
    registroId: Number(servicio.id),
    detalles: {
      valor_anterior: servicio.valor_contratado,
      valor_nuevo: valor,
      autorizacion_estado: autorizacion,
      exceso,
    },
    ip: ctx.ip,
  })

  return servicioDeId(id)
}
