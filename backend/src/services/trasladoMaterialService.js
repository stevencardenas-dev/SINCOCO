import * as repo from '../repositories/trasladoMaterialRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { textoOpcional, revisarLargo } from '../utils/campos.js'

/**
 * HU-29: traslado de materiales entre almacenes.
 * Un traslado mueve existencia de un almacén a otro sin compra ni salida hacia un proyecto: no cambia la existencia
 * total del material, solo su ubicación. El costo del material (costo de referencia vigente) se reasigna del almacén de
 * origen al de destino y queda registrado en el traslado junto con su comprobante consecutivo y el responsable.
 */

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

export const listarTraslados = () => repo.listar()
export const opcionesTraslado = () => repo.opciones()

export async function obtenerTraslado(id) {
  const t = await repo.findById(id)
  if (!t) throw new AppError('Traslado no encontrado', 404)
  return t
}

export async function registrarTraslado(body = {}, ctx) {
  const origenId = entero(body.almacen_origen_id, 'almacen_origen_id')
  const destinoId = entero(body.almacen_destino_id, 'almacen_destino_id')
  if (origenId === destinoId) throw new AppError('El almacén de destino debe ser distinto del de origen', 400, 'almacen_destino_id')
  const materialId = entero(body.material_id, 'material_id')
  const cantidad = positivo(body.cantidad, 'cantidad')
  const observaciones = textoOpcional(body.observaciones)
  if (observaciones) revisarLargo(observaciones, 500, 'observaciones')

  const id = await repo.registrar({
    origenId, destinoId, materialId, cantidad, usuarioId: ctx.usuarioId, observaciones,
    validar: ({ origen, destino, material, existenciaOrigen }) => {
      if (!origen || !origen.activo) throw new AppError('El almacén de origen no existe o está dado de baja', 404, 'almacen_origen_id')
      if (!destino || !destino.activo) throw new AppError('El almacén de destino no existe o está dado de baja', 404, 'almacen_destino_id')
      if (!material || !material.activo) throw new AppError('El material no existe o está dado de baja', 404, 'material_id')
      if (cantidad > existenciaOrigen) {
        throw new AppError(`Existencia insuficiente en el almacén de origen (disponible: ${existenciaOrigen})`, 409, 'cantidad')
      }
      // El costo del material viaja con él: se reasigna al destino con el costo de referencia vigente.
      return Number(material.costo_referencia ?? 0)
    },
  })
  const traslado = await repo.findById(id)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REGISTRAR_TRASLADO_MATERIALES', tabla: 'traslados_materiales', registroId: id,
    detalles: {
      comprobante: traslado.comprobante, material_id: materialId, cantidad, almacen_origen_id: origenId,
      almacen_destino_id: destinoId, costo_total: traslado.costo_total,
    },
    ip: ctx.ip,
  })
  return traslado
}
