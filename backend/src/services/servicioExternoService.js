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
 */

export const ESTADOS_SERVICIO = ['PROGRAMADO', 'EN_EJECUCION', 'FINALIZADO', 'CANCELADO']
const ESTADOS_PROYECTO_CERRADO = ['FINALIZADO', 'CANCELADO']

// Los montos se comparan en centavos para no perder precisión con decimales.
const aCentavos = (monto) => Math.round(Number(monto) * 100)

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

  let exceso = 0
  if (actividad.presupuesto !== null) {
    const comprometido = await servicioExternoRepository.totalContratadoActividad(actividad.id)
    const disponible = aCentavos(actividad.presupuesto) - aCentavos(comprometido)
    exceso = Math.max(0, aCentavos(dto.valor_contratado) - disponible) / 100
    if (exceso > 0 && !dto.confirmar_exceso) {
      throw new AppError(
        'El valor contratado supera el presupuesto disponible de la actividad',
        409,
        'valor_contratado',
        {
          codigo: 'EXCEDE_PRESUPUESTO',
          presupuesto: actividad.presupuesto,
          comprometido,
          disponible: disponible / 100,
          valor_contratado: dto.valor_contratado,
          exceso,
        },
      )
    }
  }

  const id = await servicioExternoRepository.create({
    ...dto,
    proveedor_id: proveedor.id,
    proyecto_id: proyecto.id,
    actividad_id: actividad.id,
  })

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
      ...(exceso > 0 && { excede_presupuesto: true, exceso }),
    },
    ip: ctx.ip,
  })

  return servicioExternoRepository.findById(id)
}
