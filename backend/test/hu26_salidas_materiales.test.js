/**
 * HU-26: consulta de salidas de materiales y existencia por almacén (pruebas unitarias del backend).
 *
 * Corren sin MySQL: los repositorios se reemplazan por dobles en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, mock } from 'node:test'
import assert from 'node:assert/strict'

const salida = {
  id: 1, comprobante: 'SA-00001', solicitud: 'SM-00001', almacen_origen: 'Bodega central', proyecto: 'Los Álamos', actividad: 'Excavación',
  despachado_por: 'Bodega Prueba', entregado_a: 'Maestro Prueba',
  detalles: [{ material_id: 10, cantidad_despachada: 4, costo_unitario_momento: 125000, subtotal: 500000 }], costo_total: 500000,
}

mock.module('../src/repositories/salidaMaterialRepository.js', {
  namedExports: {
    listar: async () => [salida],
    findById: async (id) => (id === 1 ? salida : null),
  },
})
mock.module('../src/repositories/existenciaAlmacenRepository.js', {
  namedExports: {
    existenciasPorAlmacen: async () => [{ almacen_id: 1, almacen: 'Bodega central', material_id: 10, existencia: 14 }],
    existenciaEnAlmacen: async () => 14,
  },
})

const { listarSalidas, obtenerSalida, existenciasPorAlmacen } = await import('../src/services/salidaMaterialService.js')

describe('HU-26 · constancia de la salida', () => {
  test('la salida deja constancia de almacén, proyecto, actividad, quién despacha, a quién se entrega y cada línea con su costo', async () => {
    const [s] = await listarSalidas()
    for (const campo of ['almacen_origen', 'proyecto', 'actividad', 'despachado_por', 'entregado_a', 'solicitud']) assert.ok(s[campo], campo)
    assert.equal(s.detalles[0].cantidad_despachada, 4)
    assert.equal(s.detalles[0].costo_unitario_momento, 125000)
    assert.equal(s.costo_total, 500000)
  })

  test('consulta una salida y rechaza una inexistente', async () => {
    assert.equal((await obtenerSalida(1)).comprobante, 'SA-00001')
    await assert.rejects(() => obtenerSalida(99), { statusCode: 404 })
  })

  test('expone la existencia por almacén', async () => {
    assert.equal((await existenciasPorAlmacen())[0].existencia, 14)
  })
})
