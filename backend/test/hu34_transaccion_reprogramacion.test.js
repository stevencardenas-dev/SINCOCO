/**
 * HU-34 · integridad transaccional de la reprogramación en cascada.
 *
 * A diferencia de hu34_reprogramacion.test.js, aquí el repositorio de
 * reprogramaciones es el REAL (conTransaccion, fijarFechas, registrar) y lo que
 * se reemplaza es el pool de MySQL por un doble que guarda las escrituras de la
 * transacción y solo las confirma en el COMMIT. Así se comprueba que un error a
 * mitad de la cascada revierte todo, y que exceder el fin del proyecto exige
 * confirmación antes de escribir nada.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const db = { confirmadas: [], fallarEn: null, rollbacks: 0, commits: 0 }
const bitacora = []

const pool = {
  query: async () => [[]],
  getConnection: async () => {
    const pendientes = []
    return {
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (db.fallarEn && db.fallarEn(sql, params)) throw new Error('fallo simulado de la base a mitad de la cascada')
        pendientes.push({ sql: sql.replace(/\s+/g, ' ').trim(), params })
        return [{ affectedRows: 1 }]
      },
      commit: async () => { db.commits++; db.confirmadas.push(...pendientes) },
      rollback: async () => { db.rollbacks++; pendientes.length = 0 },
      release: () => {},
    }
  },
}

const datos = {}
mock.module('../src/db/pool.js', { namedExports: { pool } })
mock.module('../src/repositories/etapaRepository.js', {
  namedExports: {
    findById: async (id) => datos.etapas.find((e) => e.id === Number(id)) ?? null,
    listarPorProyecto: async () => datos.etapas,
    renumerar: async () => {},
  },
})
mock.module('../src/repositories/actividadRepository.js', {
  namedExports: {
    findById: async (id) => datos.actividades.find((a) => a.id === Number(id)) ?? null,
    listarPorEtapa: async (etapaId) => datos.actividades.filter((a) => a.etapa_id === Number(etapaId)),
  },
})
mock.module('../src/repositories/proyectoRepository.js', { namedExports: { findById: async () => datos.proyecto } })
mock.module('../src/repositories/asignacionRepository.js', { namedExports: { activasFueraDeRango: async () => [] } })
mock.module('../src/services/accesoService.js', {
  namedExports: { verificarGestionPlan: async () => {}, verificarAccesoProyecto: async () => {} },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { bitacora.push(e) } } })

const { reprogramarEtapa } = await import('../src/services/reprogramacionService.js')

const dto = (inicio, fin, extra = {}) => ({
  motivo: 'Lluvias', fecha_inicio_programada: inicio, fecha_fin_programada: fin, confirmar: false, ...extra,
})
const actualizaciones = (tabla) => db.confirmadas.filter((q) => q.sql.startsWith(`UPDATE ${tabla}`))

beforeEach(() => {
  datos.proyecto = { id: 1, fecha_inicio_programada: '2026-01-01', fecha_fin_programada: '2026-12-31' }
  datos.etapas = [
    { id: 1, proyecto_id: 1, nombre: 'Cimentación', estado: 'EN_PROCESO', activo: 1, orden: 1,
      fecha_inicio_programada: '2026-02-01', fecha_fin_programada: '2026-03-31' },
    { id: 2, proyecto_id: 1, nombre: 'Estructura', estado: 'PENDIENTE', activo: 1, orden: 2,
      fecha_inicio_programada: '2026-04-01', fecha_fin_programada: '2026-06-30' },
  ]
  datos.actividades = [
    { id: 10, etapa_id: 1, proyecto_id: 1, nombre: 'Excavación', estado: 'EN_PROCESO', activo: 1,
      fecha_inicio_programada: '2026-02-01', fecha_fin_programada: '2026-02-28' },
    { id: 20, etapa_id: 2, proyecto_id: 1, nombre: 'Vaciado de columnas', estado: 'PENDIENTE', activo: 1,
      fecha_inicio_programada: '2026-04-01', fecha_fin_programada: '2026-04-30' },
  ]
  db.confirmadas = []
  db.fallarEn = null
  db.rollbacks = 0
  db.commits = 0
  bitacora.length = 0
})

describe('HU-34 · la reprogramación en cascada es todo o nada', () => {
  test('sin errores la cascada se confirma junta: etapa, etapa posterior, su actividad e historial', async () => {
    await reprogramarEtapa(1, dto('2026-02-01', '2026-04-15'), { usuarioId: 1 })
    assert.equal(db.commits, 1)
    assert.equal(actualizaciones('etapas_proyecto').length, 2)
    assert.equal(actualizaciones('actividades').length, 1)
    assert.ok(db.confirmadas.filter((q) => q.sql.startsWith('INSERT INTO reprogramaciones_plan')).length >= 3)
  })

  test('un error a mitad de la cascada revierte todo: nada confirmado y nada en la bitácora', async () => {
    // Falla al mover la actividad de la etapa posterior, cuando ya se escribieron las dos etapas.
    db.fallarEn = (sql) => /UPDATE actividades/.test(sql)
    await assert.rejects(reprogramarEtapa(1, dto('2026-02-01', '2026-04-15'), { usuarioId: 1 }), /fallo simulado/)
    assert.equal(db.rollbacks, 1)
    assert.equal(db.commits, 0)
    assert.deepEqual(db.confirmadas, [])
    assert.equal(bitacora.length, 0, 'una operación fallida no queda en la bitácora')
  })

  test('exceder la fecha final del proyecto sin confirmar responde 409 y no abre la transacción', async () => {
    await assert.rejects(
      reprogramarEtapa(1, dto('2026-02-01', '2026-10-31'), { usuarioId: 1 }),
      (e) => e.statusCode === 409 && /Confirme/.test(e.message),
    )
    assert.equal(db.commits + db.rollbacks, 0)
    assert.deepEqual(db.confirmadas, [])
  })

  test('al confirmar, el fin del proyecto se reprograma dentro de la misma transacción', async () => {
    await reprogramarEtapa(1, dto('2026-02-01', '2026-10-31', { confirmar: true }), { usuarioId: 1 })
    assert.equal(db.commits, 1)
    assert.equal(actualizaciones('proyectos').length, 1)
  })

  test('una etapa posterior completada responde 409 y no escribe nada', async () => {
    datos.etapas[1].estado = 'COMPLETADA'
    await assert.rejects(reprogramarEtapa(1, dto('2026-02-01', '2026-04-15'), { usuarioId: 1 }), (e) => e.statusCode === 409)
    assert.deepEqual(db.confirmadas, [])
  })
})
