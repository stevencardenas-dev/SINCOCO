/**
 * Existencia de un material por almacén (pruebas unitarias del backend).
 * Corren sin MySQL: el repositorio se reemplaza por un doble en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const { Material } = await import('../src/entities/Material.js')

const estado = { materiales: [], existencias: [] }

mock.module('../src/repositories/materialRepository.js', {
  namedExports: {
    findById: async (id) => Material.fromRow(estado.materiales.find((m) => m.id === Number(id))),
    existenciasPorAlmacen: async (id) => estado.existencias.filter((e) => e.material_id === Number(id)),
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async () => {} } })
mock.module('../src/services/alertaService.js', { namedExports: { evaluarStockMinimo: async () => {} } })

const service = await import('../src/services/materialService.js')

beforeEach(() => {
  estado.materiales = [{ id: 1, codigo: 'CEM001', activo: 1, existencia_total: 100, nivel_minimo: 0 }]
  estado.existencias = [
    { material_id: 1, almacen: 'Central', cantidad: 70 },
    { material_id: 1, almacen: 'Obra Norte', cantidad: 30 },
  ]
})

describe('Material · existencia por almacén', () => {
  test('sin almacén elegido no trae existencia_almacen', () => {
    assert.equal(Material.fromRow({ id: 1, existencia_total: 100 }).existencia_almacen, null)
  })

  test('con almacén elegido trae la cantidad de ese almacén y conserva el total', () => {
    const m = Material.fromRow({ id: 1, existencia_total: 100, existencia_almacen: '30.00' })
    assert.equal(m.existencia_almacen, 30)
    assert.equal(m.existencia_total, 100)
  })

  test('el saldo por almacén se consulta por material', async () => {
    const r = await service.listarExistenciasPorAlmacen(1)
    assert.deepEqual(r.map((e) => e.cantidad), [70, 30])
  })

  test('un material que no existe responde 404', async () => {
    await assert.rejects(service.listarExistenciasPorAlmacen(99), (e) => e.statusCode === 404)
  })
})
