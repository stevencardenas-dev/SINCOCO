/**
 * HU-10: consulta del catálogo de herramientas (pruebas unitarias del backend).
 *
 * `db/pool.js` se reemplaza por un doble que guarda cada consulta SQL: así se
 * prueban la validación de los filtros y la forma de las consultas del
 * repositorio real, sin MySQL.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const consultas = []

mock.module('../src/db/pool.js', {
  namedExports: {
    pool: {
      query: async (sql, params = []) => {
        consultas.push({ sql: sql.replace(/\s+/g, ' ').trim(), params })
        return [[]]
      },
    },
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async () => {} } })

const { listarHerramientas } = await import('../src/services/herramientaService.js')

const rechaza = (promesa) => assert.rejects(promesa, (e) => e.statusCode === 400)

beforeEach(() => {
  consultas.length = 0
})

describe('HU-10 · filtros del catálogo', () => {
  test('por defecto solo lista las herramientas activas', async () => {
    await listarHerramientas({})
    assert.match(consultas[0].sql, /h\.activo = 1/)
  })

  test('incluirInactivos quita el filtro de activas', async () => {
    await listarHerramientas({ incluirInactivos: true })
    assert.ok(!/h\.activo = 1/.test(consultas[0].sql))
  })

  test('prestable deja solo las activas, disponibles y en buen estado (criterios 3 y 4)', async () => {
    await listarHerramientas({ prestable: true })
    const { sql } = consultas[0]
    assert.match(sql, /h\.disponibilidad = 'DISPONIBLE'/)
    assert.match(sql, /h\.estado_operativo IN \('EXCELENTE', 'BUENO', 'REGULAR'\)/)
  })

  test('los filtros viajan como parámetros, nunca dentro del SQL', async () => {
    await listarHerramientas({ buscar: "x'; DROP TABLE herramientas; --", almacenId: '2' })
    assert.ok(!consultas[0].sql.includes('DROP'))
    assert.ok(consultas[0].params.includes(2) || consultas[0].params.includes('2'))
  })

  test('los comodines de la búsqueda se tratan como texto literal', async () => {
    await listarHerramientas({ buscar: '50%_x' })
    assert.ok(consultas[0].params.includes('%50\\%\\_x%'))
  })

  test('un estado operativo desconocido responde 400', async () => {
    await rechaza(listarHerramientas({ estadoOperativo: 'ROTA' }))
  })

  test('una disponibilidad desconocida responde 400', async () => {
    await rechaza(listarHerramientas({ disponibilidad: 'PERDIDA' }))
  })

  test('un almacén no numérico responde 400', async () => {
    await rechaza(listarHerramientas({ almacenId: 'abc' }))
  })

  test('los filtros válidos se normalizan a mayúsculas', async () => {
    await listarHerramientas({ estadoOperativo: 'bueno', disponibilidad: 'prestada' })
    assert.ok(consultas[0].params.includes('BUENO'))
    assert.ok(consultas[0].params.includes('PRESTADA'))
  })
})
