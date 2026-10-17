/**
 * HU-05 · CU-05 Alt 2: cierre automático de asignaciones cuya fecha fin
 * programada ya pasó (pruebas unitarias del backend).
 *
 * Corren sin MySQL: el repositorio y la bitácora se reemplazan por dobles.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { vencidas: [], finalizadas: [], bitacora: [], yaCerradas: new Set() }

mock.module('../src/repositories/asignacionRepository.js', {
  namedExports: {
    vencidasActivas: async () => estado.vencidas,
    finalizarVencida: async (id) => {
      if (estado.yaCerradas.has(id)) return 0
      estado.finalizadas.push(id)
      return 1
    },
  },
})
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (entrada) => { estado.bitacora.push(entrada) } },
})

const { cerrarAsignacionesVencidas } = await import('../src/services/cierreAsignacionesService.js')

beforeEach(() => {
  estado.vencidas = []
  estado.finalizadas = []
  estado.bitacora = []
  estado.yaCerradas = new Set()
})

describe('CU-05 · Alt 2: cierre al alcanzar la fecha fin programada', () => {
  test('finaliza cada asignación vencida y lo deja en la bitácora', async () => {
    estado.vencidas = [
      { id: 1, trabajador_id: 5, proyecto_id: 2, actividad_id: null, fecha_fin_programada: '2026-03-01' },
      { id: 2, trabajador_id: 6, proyecto_id: 2, actividad_id: 9, fecha_fin_programada: '2026-03-15' },
    ]
    assert.equal(await cerrarAsignacionesVencidas(), 2)
    assert.deepEqual(estado.finalizadas, [1, 2])
    assert.equal(estado.bitacora.length, 2)
    assert.equal(estado.bitacora[0].accion, 'CIERRE_AUTOMATICO')
    assert.equal(estado.bitacora[0].usuarioId, null)
    assert.equal(estado.bitacora[0].detalles.fecha_fin_real, '2026-03-01')
  })

  test('sin asignaciones vencidas no hace nada', async () => {
    assert.equal(await cerrarAsignacionesVencidas(), 0)
    assert.equal(estado.bitacora.length, 0)
  })

  test('una asignación que otro proceso ya cerró no se cuenta ni se registra dos veces', async () => {
    estado.vencidas = [{ id: 3, trabajador_id: 5, proyecto_id: 2, actividad_id: null, fecha_fin_programada: '2026-03-01' }]
    estado.yaCerradas.add(3)
    assert.equal(await cerrarAsignacionesVencidas(), 0)
    assert.equal(estado.bitacora.length, 0)
  })
})
