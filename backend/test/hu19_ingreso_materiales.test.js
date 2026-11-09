/**
 * HU-19: ingreso de materiales al inventario (pruebas unitarias del backend).
 *
 * Corren sin MySQL: el repositorio de entradas y la bitácora se reemplazan por
 * dobles en memoria; el doble de `registrar` ejecuta la validación del service
 * con el almacén, proveedor, materiales y orden en memoria. La suma de existencia
 * (trigger trg_entrada_suma_existencia) y la actualización de la orden ocurren en
 * MySQL y no se cubren aquí.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { contexto: null, registros: [], bitacora: [] }

mock.module('../src/repositories/entradaInventarioRepository.js', {
  namedExports: {
    listar: async () => [],
    ordenesRecibibles: async () => [],
    proveedoresActivos: async () => [],
    findById: async (id) => {
      const r = estado.registros[id - 1]
      if (!r) return null
      const costo = r.detalles.reduce((t, d) => t + d.cantidad * d.costo_unitario, 0)
      return { id, comprobante: `EI-${String(id).padStart(5, '0')}`, almacen_id: r.almacenId, proveedor_id: r.proveedorId,
        registrado_por_usuario_id: r.usuarioId, numero_factura_remision: r.numero, orden_compra_id: r.ordenId, costo_total: costo, detalles: r.detalles }
    },
    registrar: async (datos) => {
      datos.validar(estado.contexto)
      estado.registros.push(datos)
      return estado.registros.length
    },
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const { registrarEntrada } = await import('../src/services/entradaInventarioService.js')

const ctx = { usuarioId: 4, ip: '127.0.0.1' }
const cuerpo = (extra = {}) => ({
  almacen_id: 1, proveedor_id: 2, numero_factura_remision: ' FAC-100 ',
  detalles: [{ material_id: 10, cantidad: 5, costo_unitario: 1200.5 }, { material_id: 11, cantidad: 2, costo_unitario: 300 }], ...extra,
})

beforeEach(() => {
  estado.contexto = {
    almacen: { id: 1, activo: 1 }, proveedor: { id: 2, activo: 1 },
    materiales: [{ id: 10, activo: 1 }, { id: 11, activo: 1 }],
    orden: { id: 7, activo: 1, estado: 'APROBADA', proveedor_id: 2 },
    lineasOrden: [{ material_id: 10, cantidad_pedida: 10, cantidad_recibida: 4 }, { material_id: 11, cantidad_pedida: 2, cantidad_recibida: 0 }],
  }
  estado.registros = []
  estado.bitacora = []
})

describe('HU-19 · ingreso de materiales', () => {
  test('criterio 1: la entrada registra almacén, proveedor, responsable, factura y costo total', async () => {
    const e = await registrarEntrada(cuerpo(), ctx)
    assert.equal(e.almacen_id, 1)
    assert.equal(e.proveedor_id, 2)
    assert.equal(e.registrado_por_usuario_id, 4)
    assert.equal(e.numero_factura_remision, 'FAC-100')
    assert.equal(e.costo_total, 5 * 1200.5 + 2 * 300)
    assert.equal(estado.bitacora[0].accion, 'INGRESAR_MATERIALES')
  })

  test('criterio 1: almacén, proveedor y número de factura o remisión son obligatorios', async () => {
    for (const falta of [{ almacen_id: '' }, { proveedor_id: 0 }, { numero_factura_remision: '   ' }]) {
      await assert.rejects(() => registrarEntrada(cuerpo(falta), ctx), { statusCode: 400 })
    }
    assert.equal(estado.registros.length, 0)
  })

  test('criterio 1: almacén o proveedor inexistente o dado de baja se rechaza', async () => {
    estado.contexto.almacen.activo = 0
    await assert.rejects(() => registrarEntrada(cuerpo(), ctx), { statusCode: 404 })
    estado.contexto.almacen.activo = 1
    estado.contexto.proveedor = null
    await assert.rejects(() => registrarEntrada(cuerpo(), ctx), { statusCode: 404 })
  })

  test('criterio 2: cada línea registra cantidad y costo unitario por material', async () => {
    await registrarEntrada(cuerpo(), ctx)
    assert.deepEqual(estado.registros[0].detalles, [
      { material_id: 10, cantidad: 5, costo_unitario: 1200.5 },
      { material_id: 11, cantidad: 2, costo_unitario: 300 },
    ])
  })

  test('criterio 2: cantidad y costo deben ser positivos y con máximo 2 decimales', async () => {
    for (const d of [{ cantidad: 0, costo_unitario: 1 }, { cantidad: 1, costo_unitario: -5 }, { cantidad: 1.234, costo_unitario: 1 }, { cantidad: 1, costo_unitario: 'abc' }]) {
      await assert.rejects(() => registrarEntrada(cuerpo({ detalles: [{ material_id: 10, ...d }] }), ctx), { statusCode: 400 })
    }
  })

  test('criterio 2: se exige al menos un material y no se repite en la misma entrada', async () => {
    await assert.rejects(() => registrarEntrada(cuerpo({ detalles: [] }), ctx), { statusCode: 400 })
    const repetido = [{ material_id: 10, cantidad: 1, costo_unitario: 1 }, { material_id: 10, cantidad: 2, costo_unitario: 1 }]
    await assert.rejects(() => registrarEntrada(cuerpo({ detalles: repetido }), ctx), { statusCode: 400 })
  })

  test('criterio 2: un material inexistente o dado de baja se rechaza', async () => {
    estado.contexto.materiales[1].activo = 0
    await assert.rejects(() => registrarEntrada(cuerpo(), ctx), { statusCode: 404 })
  })

  test('principal: el ingreso sin orden de compra no valida la orden', async () => {
    estado.contexto.orden = null
    assert.equal((await registrarEntrada(cuerpo(), ctx)).orden_compra_id, null)
  })

  test('criterio 4: con orden de compra la entrada queda asociada a la orden', async () => {
    assert.equal((await registrarEntrada(cuerpo({ orden_compra_id: 7 }), ctx)).orden_compra_id, 7)
  })

  test('alternativo (ingreso parcial): se admite recibir menos de lo pendiente', async () => {
    const parcial = [{ material_id: 10, cantidad: 3, costo_unitario: 1000 }]
    assert.equal((await registrarEntrada(cuerpo({ orden_compra_id: 7, detalles: parcial }), ctx)).orden_compra_id, 7)
  })

  test('alternativo: no se recibe más de lo pendiente de la orden', async () => {
    const exceso = [{ material_id: 10, cantidad: 7, costo_unitario: 1000 }]
    await assert.rejects(() => registrarEntrada(cuerpo({ orden_compra_id: 7, detalles: exceso }), ctx), { statusCode: 409 })
  })

  test('la orden debe estar en estado recibible y pertenecer al proveedor', async () => {
    for (const e of ['BORRADOR', 'RECIBIDA_TOTAL', 'CANCELADA']) {
      estado.contexto.orden.estado = e
      await assert.rejects(() => registrarEntrada(cuerpo({ orden_compra_id: 7 }), ctx), { statusCode: 409 })
    }
    Object.assign(estado.contexto.orden, { estado: 'RECIBIDA_PARCIAL', proveedor_id: 99 })
    await assert.rejects(() => registrarEntrada(cuerpo({ orden_compra_id: 7 }), ctx), { statusCode: 400 })
  })

  test('un material que no está en la orden se rechaza', async () => {
    estado.contexto.lineasOrden = estado.contexto.lineasOrden.slice(0, 1)
    await assert.rejects(() => registrarEntrada(cuerpo({ orden_compra_id: 7 }), ctx), { statusCode: 400 })
    assert.equal(estado.registros.length, 0)
  })
})
