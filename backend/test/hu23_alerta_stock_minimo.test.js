/**
 * HU-23: alerta de stock mínimo (pruebas unitarias del backend).
 *
 * Corren sin MySQL: se usa el alertaService con su repositorio real y el pool de
 * MySQL se reemplaza por un doble que registra las consultas y devuelve filas en
 * memoria. La generación tras una salida la hace un trigger en MySQL; aquí se
 * cubre la evaluación que usa la aplicación (evaluarStockMinimo).
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { consultas: [], alertas: [], filasAfectadas: 1, bitacora: [] }

const ALERTA = { id: 1, tipo: 'STOCK_MINIMO', referencia_id: 10, tabla_referencia: 'materiales', fecha_generacion: new Date(), atendida: 0 }

const pool = {
  query: async (sql, params = []) => {
    estado.consultas.push({ sql, params })
    if (sql.startsWith('UPDATE alertas')) {
      const a = estado.alertas.find((x) => x.id === Number(params[0]) && !x.atendida)
      if (a) a.atendida = 1
      return [{ affectedRows: a ? 1 : 0 }]
    }
    if (sql.includes('INSERT INTO alertas')) return [{ affectedRows: estado.filasAfectadas }]
    if (sql.includes('WHERE a.id = ?')) return [estado.alertas.filter((a) => a.id === Number(params[0]))]
    return [estado.alertas]
  },
}
mock.module('../src/db/pool.js', { namedExports: { pool } })
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const { listarAlertas, atenderAlerta, evaluarStockMinimo } = await import('../src/services/alertaService.js')

const ctx = { usuarioId: 4, ip: '127.0.0.1' }
const ultima = () => estado.consultas.at(-1)

beforeEach(() => {
  estado.consultas = []
  estado.alertas = [{ ...ALERTA }]
  estado.filasAfectadas = 1
  estado.bitacora = []
})

describe('HU-23 · alerta de stock mínimo', () => {
  test('principal: genera la alerta cuando la existencia es igual o inferior al nivel mínimo del material', async () => {
    assert.equal(await evaluarStockMinimo(10), true)
    const { sql, params } = ultima()
    assert.match(sql, /'STOCK_MINIMO'/)
    assert.match(sql, /m\.existencia_total <= m\.nivel_minimo/)
    assert.deepEqual(params, [10])
  })

  test('criterio 1: el umbral es el nivel mínimo propio de cada material (y solo si está configurado)', async () => {
    await evaluarStockMinimo(10)
    assert.match(ultima().sql, /m\.nivel_minimo > 0/)
    assert.match(ultima().sql, /m\.activo = 1/)
  })

  test('criterio 2: la evaluación usa la conexión de la transacción que descuenta la existencia', async () => {
    const conn = { query: async (sql, params) => { conn.usada = { sql, params }; return [{ affectedRows: 0 }] } }
    assert.equal(await evaluarStockMinimo(10, conn), false)
    assert.deepEqual(conn.usada.params, [10])
    assert.equal(estado.consultas.length, 0)
  })

  test('criterio 3: la alerta registra tipo y referencia al material afectado', async () => {
    await evaluarStockMinimo(10)
    assert.match(ultima().sql, /m\.id, 'materiales'/)
    assert.match(ultima().sql, /referencia_id, tabla_referencia/)
  })

  test('criterio 4 (alerta ya pendiente): no se genera otra mientras exista una sin atender', async () => {
    estado.filasAfectadas = 0
    assert.equal(await evaluarStockMinimo(10), false)
    assert.match(ultima().sql, /NOT EXISTS \(SELECT 1 FROM alertas a WHERE a\.tipo = 'STOCK_MINIMO' AND a\.referencia_id = m\.id AND a\.atendida = 0\)/)
  })

  test('criterio 3: la alerta permanece pendiente hasta que bodega la atiende', async () => {
    const a = await atenderAlerta(1, ctx)
    assert.equal(a.atendida, 1)
    assert.equal(estado.bitacora[0].accion, 'ATENDER_ALERTA')
    assert.deepEqual(estado.bitacora[0].detalles, { tipo: 'STOCK_MINIMO', referencia_id: 10 })
  })

  test('una alerta ya atendida no se atiende de nuevo y una inexistente da 404', async () => {
    await atenderAlerta(1, ctx)
    await assert.rejects(() => atenderAlerta(1, ctx), { statusCode: 409 })
    await assert.rejects(() => atenderAlerta(99, ctx), { statusCode: 404 })
  })

  test('consulta: filtra por tipo y por pendientes o atendidas', async () => {
    await listarAlertas({ tipo: 'stock_minimo', atendida: '0' })
    assert.deepEqual(ultima().params, ['STOCK_MINIMO', 0])
    await listarAlertas({ atendida: 'true' })
    assert.deepEqual(ultima().params, [1])
    await listarAlertas()
    assert.deepEqual(ultima().params, [])
  })

  test('consulta: tipo o atendida inválidos dan 400', async () => {
    await assert.rejects(() => listarAlertas({ tipo: 'OTRO' }), { statusCode: 400 })
    await assert.rejects(() => listarAlertas({ atendida: 'quizas' }), { statusCode: 400 })
  })
})
