import * as repo from '../repositories/entradaInventarioRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { textoOpcional, revisarLargo } from '../utils/campos.js'

/** HU-19: ingreso de materiales al inventario (con o sin orden de compra). */

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
const ESTADOS_ORDEN = ['APROBADA', 'ENVIADA_PROVEEDOR', 'RECIBIDA_PARCIAL']

export const listarEntradas = () => repo.listar()
export const ordenesRecibibles = () => repo.ordenesRecibibles()
/** Proveedores para el selector del ingreso: quien ingresa no necesita el permiso del módulo de proveedores. */
export const proveedoresParaIngreso = () => repo.proveedoresActivos()

export async function obtenerEntrada(id) {
  const e = await repo.findById(id)
  if (!e) throw new AppError('Entrada no encontrada', 404)
  return e
}

export async function registrarEntrada(body = {}, ctx) {
  const almacenId = entero(body.almacen_id, 'almacen_id')
  const proveedorId = entero(body.proveedor_id, 'proveedor_id')
  const numero = String(body.numero_factura_remision ?? '').trim()
  if (!numero) throw new AppError('El número de factura o remisión es obligatorio', 400, 'numero_factura_remision')
  revisarLargo(numero, 50, 'numero_factura_remision')
  const ordenId = body.orden_compra_id ? entero(body.orden_compra_id, 'orden_compra_id') : null
  const observaciones = textoOpcional(body.observaciones)
  revisarLargo(observaciones, 500, 'observaciones')
  if (!Array.isArray(body.detalles) || body.detalles.length === 0) {
    throw new AppError('Debe registrar al menos un material', 400, 'detalles')
  }
  const detalles = body.detalles.map((d, i) => ({
    material_id: entero(d?.material_id, `detalles[${i}].material_id`),
    cantidad: positivo(d?.cantidad, `detalles[${i}].cantidad`),
    costo_unitario: positivo(d?.costo_unitario, `detalles[${i}].costo_unitario`),
  }))
  if (new Set(detalles.map((d) => d.material_id)).size !== detalles.length) {
    throw new AppError('Un material no puede repetirse en la misma entrada', 400, 'detalles')
  }

  const id = await repo.registrar({
    almacenId, proveedorId, usuarioId: ctx.usuarioId, numero, ordenId, observaciones, detalles,
    validar: ({ almacen, proveedor, materiales, orden, lineasOrden }) => {
      if (!almacen || !almacen.activo) throw new AppError('El almacén no existe o está dado de baja', 404, 'almacen_id')
      if (!proveedor || !proveedor.activo) throw new AppError('El proveedor no existe o está dado de baja', 404, 'proveedor_id')
      for (const d of detalles) {
        const m = materiales.find((x) => Number(x.id) === d.material_id)
        if (!m || !m.activo) throw new AppError(`El material ${d.material_id} no existe o está dado de baja`, 404, 'detalles')
      }
      if (!ordenId) return
      if (!orden || !orden.activo) throw new AppError('La orden de compra no existe', 404, 'orden_compra_id')
      if (!ESTADOS_ORDEN.includes(orden.estado)) {
        throw new AppError(`La orden de compra no puede recibir mercancía (estado ${orden.estado})`, 409, 'orden_compra_id')
      }
      if (Number(orden.proveedor_id) !== proveedorId) {
        throw new AppError('El proveedor no corresponde a la orden de compra', 400, 'proveedor_id')
      }
      for (const d of detalles) {
        const linea = lineasOrden.find((l) => Number(l.material_id) === d.material_id)
        if (!linea) throw new AppError(`El material ${d.material_id} no está en la orden de compra`, 400, 'detalles')
        const pendiente = Number(linea.cantidad_pedida) - Number(linea.cantidad_recibida)
        if (d.cantidad > pendiente) {
          throw new AppError(`La cantidad supera lo pendiente de la orden (${pendiente}) para el material ${d.material_id}`, 409, 'detalles')
        }
      }
    },
  })
  const entrada = await repo.findById(id)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'INGRESAR_MATERIALES', tabla: 'entradas_inventario', registroId: id,
    detalles: { comprobante: entrada.comprobante, almacen_id: almacenId, proveedor_id: proveedorId, orden_compra_id: ordenId, costo_total: entrada.costo_total }, ip: ctx.ip,
  })
  return entrada
}
