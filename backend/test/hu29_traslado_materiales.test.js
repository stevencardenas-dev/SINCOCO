/**
 * HU-29: traslado de materiales entre almacenes (pruebas unitarias del backend).
 *
 * Corren sin MySQL: el repositorio y la bitácora se reemplazan por dobles en memoria, de modo que se
 * prueban las reglas del service.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const base = () => ({
  origen: { id: 1, activo: 1 },
  destino: { id: 2, activo: 1 },
  material: { id: 10, activo: 1, costo_referencia: 25000 },
  existenciaOrigen: 50,
})
const estado = { datos: base(), traslados: [], bitacora: [] }

mock.module('../src/repositories/trasladoMaterialRepository.js', {
  namedExports: {
    findById: async (id) => {
      const t = estado.traslados.find((x) => x.id === Number(id))
      return t ? { ...t, comprobante: `TR-${String(t.id).padStart(5, '0')}` } : null
    },
    listar: async () => estado.traslados,
    opciones: async () => ({ almacenes: [], existencias: [] }),
    registrar: async (datos) => {
      const costoUnitario = datos.validar(estado.datos)
      const id = estado.traslados.length + 1
      estado.traslados.push({
        id, almacen_origen_id: datos.origenId, almacen_destino_id: datos.destinoId, material_id: datos.materialId,
        cantidad: datos.cantidad, costo_unitario: costoUnitario, costo_total: Math.round(datos.cantidad * costoUnitario * 100) / 100,
        responsable_usuario_id: datos.usuarioId,
      })
      return id
    },
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const { registrarTraslado, obtenerTraslado } = await import('../src/services/trasladoMaterialService.js')

const ctx = { usuario: { id: 2, rol: 'ENCARGADO_BODEGA' }, usuarioId: 2, ip: '127.0.0.1' }
const cuerpo = (extra = {}) => ({ almacen_origen_id: 1, almacen_destino_id: 2, material_id: 10, cantidad: 8, ...extra })

beforeEach(() => {
  estado.datos = base()
  estado.traslados = []
  estado.bitacora = []
})

describe('HU-29 · registrar traslado', () => {
  test('principal: queda con comprobante consecutivo y con el responsable que lo ejecuta', async () => {
    const t = await registrarTraslado(cuerpo(), ctx)
    assert.equal(t.comprobante, 'TR-00001')
    assert.equal(t.responsable_usuario_id, 2)
    assert.equal(t.cantidad, 8)
    assert.equal(estado.bitacora[0].accion, 'REGISTRAR_TRASLADO_MATERIALES')
    assert.equal((await registrarTraslado(cuerpo(), ctx)).comprobante, 'TR-00002')
  })

  test('criterio 1: origen y destino son obligatorios', async () => {
    for (const campo of ['almacen_origen_id', 'almacen_destino_id']) {
      await assert.rejects(() => registrarTraslado(cuerpo({ [campo]: undefined }), ctx), { statusCode: 400, campo })
    }
  })

  test('criterio 1: origen y destino deben ser distintos', async () => {
    await assert.rejects(() => registrarTraslado(cuerpo({ almacen_destino_id: 1 }), ctx), { statusCode: 400, campo: 'almacen_destino_id' })
  })

  test('exige material y una cantidad mayor que cero de hasta 2 decimales', async () => {
    await assert.rejects(() => registrarTraslado(cuerpo({ material_id: undefined }), ctx), { statusCode: 400, campo: 'material_id' })
    await assert.rejects(() => registrarTraslado(cuerpo({ cantidad: 0 }), ctx), { statusCode: 400, campo: 'cantidad' })
    await assert.rejects(() => registrarTraslado(cuerpo({ cantidad: 1.234 }), ctx), { statusCode: 400, campo: 'cantidad' })
  })

  test('criterio 2: valida existencia suficiente en el origen', async () => {
    await assert.rejects(() => registrarTraslado(cuerpo({ cantidad: 50.01 }), ctx), { statusCode: 409, campo: 'cantidad' })
    assert.equal(estado.traslados.length, 0)
    await registrarTraslado(cuerpo({ cantidad: 50 }), ctx)
    assert.equal(estado.traslados.length, 1)
  })

  test('criterio 3: el costo se reasigna al destino con el costo de referencia vigente', async () => {
    const t = await registrarTraslado(cuerpo({ cantidad: 4 }), ctx)
    assert.equal(t.costo_unitario, 25000)
    assert.equal(t.costo_total, 100000)
    assert.equal(estado.bitacora[0].detalles.costo_total, 100000)
  })

  test('rechaza almacenes o material inexistentes o dados de baja', async () => {
    estado.datos.origen = { id: 1, activo: 0 }
    await assert.rejects(() => registrarTraslado(cuerpo(), ctx), { statusCode: 404, campo: 'almacen_origen_id' })
    estado.datos = base(); estado.datos.destino = null
    await assert.rejects(() => registrarTraslado(cuerpo(), ctx), { statusCode: 404, campo: 'almacen_destino_id' })
    estado.datos = base(); estado.datos.material = { id: 10, activo: 0 }
    await assert.rejects(() => registrarTraslado(cuerpo(), ctx), { statusCode: 404, campo: 'material_id' })
  })
})

describe('HU-29 · consulta', () => {
  test('un traslado inexistente responde 404', async () => {
    await assert.rejects(() => obtenerTraslado(99), { statusCode: 404 })
  })
})
