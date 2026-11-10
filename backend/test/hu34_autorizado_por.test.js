/**
 * HU-34 · historial de reprogramaciones: quién autorizó el cambio.
 *
 * `autorizado_por_usuario_id` es opcional: si no llega, se guarda al usuario
 * que registra; si llega, debe ser un usuario activo. Usa el repositorio real
 * de reprogramaciones con un pool simulado para ver lo que se inserta.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const db = { inserts: [] }
const pool = {
  query: async () => [[]],
  getConnection: async () => ({
    beginTransaction: async () => {},
    query: async (sql, params) => {
      if (/INSERT INTO reprogramaciones_plan/.test(sql)) db.inserts.push({ sql, params })
      return [{ affectedRows: 1 }]
    },
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  }),
}
const usuarios = { 1: { id: 1, activo: 1 }, 2: { id: 2, activo: 1 }, 3: { id: 3, activo: 0 } }

mock.module('../src/db/pool.js', { namedExports: { pool } })
mock.module('../src/repositories/usuarioRepository.js', {
  namedExports: { findById: async (id) => usuarios[id] ?? null },
})
mock.module('../src/repositories/etapaRepository.js', {
  namedExports: { findById: async () => ({ id: 1, proyecto_id: 1, nombre: 'Cimentación', estado: 'EN_PROCESO', activo: 1, fecha_inicio_programada: '2026-02-01', fecha_fin_programada: '2026-03-31' }), listarPorProyecto: async () => [], renumerar: async () => {} },
})
mock.module('../src/repositories/actividadRepository.js', {
  namedExports: {
    findById: async () => ({ id: 10, etapa_id: 1, proyecto_id: 1, nombre: 'Excavación', estado: 'PENDIENTE', activo: 1,
      fecha_inicio_programada: '2026-02-01', fecha_fin_programada: '2026-02-28',
      etapa_fecha_inicio: '2026-02-01', etapa_fecha_fin: '2026-03-31' }),
    listarPorEtapa: async () => [],
  },
})
mock.module('../src/repositories/proyectoRepository.js', {
  namedExports: { findById: async () => ({ id: 1, fecha_inicio_programada: '2026-01-01', fecha_fin_programada: '2026-12-31' }) },
})
mock.module('../src/repositories/asignacionRepository.js', { namedExports: { activasFueraDeRango: async () => [] } })
mock.module('../src/services/accesoService.js', {
  namedExports: { verificarGestionPlan: async () => {}, verificarAccesoProyecto: async () => {} },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async () => {} } })

const { reprogramarActividad } = await import('../src/services/reprogramacionService.js')
const { ReprogramarDto } = await import('../src/dtos/reprogramacion/ReprogramarDto.js')

const cuerpo = (extra = {}) => ({ motivo: 'Lluvias', fecha_inicio_programada: '2026-02-05', fecha_fin_programada: '2026-03-05', ...extra })
const autorizadoInsertado = () => db.inserts[0].params[6]

beforeEach(() => { db.inserts = [] })

describe('HU-34 · autorizado por', () => {
  test('sin indicarlo, queda autorizado por el usuario que registra', async () => {
    await reprogramarActividad(10, ReprogramarDto.fromRequestBody(cuerpo()), { usuarioId: 1 })
    assert.match(db.inserts[0].sql, /autorizado_por_usuario_id/)
    assert.equal(db.inserts[0].params[5], 1)
    assert.equal(autorizadoInsertado(), 1)
  })

  test('se guarda quien autoriza, distinto de quien registra', async () => {
    await reprogramarActividad(10, ReprogramarDto.fromRequestBody(cuerpo({ autorizado_por_usuario_id: 2 })), { usuarioId: 1 })
    assert.equal(db.inserts[0].params[5], 1)
    assert.equal(autorizadoInsertado(), 2)
  })

  test('un autorizador inexistente o dado de baja responde 400 y no escribe', async () => {
    for (const id of [99, 3]) {
      await assert.rejects(
        reprogramarActividad(10, ReprogramarDto.fromRequestBody(cuerpo({ autorizado_por_usuario_id: id })), { usuarioId: 1 }),
        (e) => e.statusCode === 400,
      )
    }
    assert.equal(db.inserts.length, 0)
  })

  test('el DTO rechaza un id que no es entero positivo', () => {
    for (const v of ['abc', -1, 1.5]) {
      assert.throws(() => ReprogramarDto.fromRequestBody(cuerpo({ autorizado_por_usuario_id: v })), (e) => e.statusCode === 400)
    }
  })
})
