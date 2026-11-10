/**
 * HU-05 / HU-31 / HU-33 · concurrencia en la asignación de personal.
 *
 * Dos asignaciones simultáneas (Promise.all) del mismo trabajador a obras
 * distintas, con fechas que se cruzan: solo una puede quedar. Corre sin MySQL:
 * el pool se reemplaza por un doble en memoria que imita lo esencial de InnoDB
 * para este caso: `SELECT ... FOR UPDATE` toma un bloqueo exclusivo de la fila
 * hasta el COMMIT/ROLLBACK y lo insertado solo es visible para otros tras el
 * COMMIT. El repositorio y el service que se prueban son los reales.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const db = { filas: [], bloqueos: new Map(), consultas: [] }

/** Bloqueo exclusivo por clave: el segundo espera a que el primero libere. */
async function bloquear(clave) {
  while (db.bloqueos.has(clave)) await db.bloqueos.get(clave).promesa
  let liberar
  const promesa = new Promise((r) => { liberar = r })
  db.bloqueos.set(clave, { promesa, liberar })
  return () => { db.bloqueos.delete(clave); liberar() }
}

/** Evalúa las consultas del repositorio sobre las filas confirmadas (+ las propias de la transacción). */
function ejecutar(sql, params, propias = []) {
  const visibles = [...db.filas, ...propias]
  if (/INSERT INTO asignaciones_personal/.test(sql)) {
    const [trabajador_id, proyecto_id, actividad_id, fecha_inicio, fecha_fin_programada, rol_en_proyecto, estado, observaciones] = params
    const fila = { id: db.filas.length + propias.length + 1, trabajador_id, proyecto_id, actividad_id, fecha_inicio, fecha_fin_programada, rol_en_proyecto, estado, observaciones }
    return { fila, resultado: [{ insertId: fila.id }] }
  }
  if (/fecha_fin_programada >= \?/.test(sql)) {
    const [t, fin, , inicio, ignorar] = params
    const r = visibles.filter((a) => a.trabajador_id === t && a.estado === 'ACTIVO'
      && (fin == null || a.fecha_inicio <= fin)
      && (a.fecha_fin_programada == null || a.fecha_fin_programada >= inicio)
      && (ignorar == null || !(a.actividad_id == null && a.proyecto_id === ignorar)))
    return { resultado: [r.slice(0, 1)] }
  }
  if (/AND proyecto_id = \? AND estado = 'ACTIVO'/.test(sql)) {
    const [t, p, act] = params
    const r = visibles.filter((a) => a.trabajador_id === t && a.proyecto_id === p && a.estado === 'ACTIVO'
      && (act ? a.actividad_id === act : a.actividad_id == null))
    return { resultado: [r.slice(0, 1)] }
  }
  if (/WHERE a\.id = \?/.test(sql)) {
    return { resultado: [visibles.filter((a) => a.id === params[0])] }
  }
  return { resultado: [[]] }
}

const pool = {
  query: async (sql, params) => { db.consultas.push(sql); return ejecutar(sql, params).resultado },
  getConnection: async () => {
    const propias = []
    const liberaciones = []
    const cerrar = () => { while (liberaciones.length) liberaciones.pop()() }
    return {
      beginTransaction: async () => {},
      query: async (sql, params) => {
        db.consultas.push(sql)
        if (/FOR UPDATE/.test(sql)) {
          liberaciones.push(await bloquear(`trabajador:${params[0]}`))
          return [[{ id: params[0] }]]
        }
        const { fila, resultado } = ejecutar(sql, params, propias)
        if (fila) propias.push(fila)
        // Cede el turno: así la otra petición avanza en paralelo y la prueba es realista.
        await new Promise((r) => setImmediate(r))
        return resultado
      },
      commit: async () => { db.filas.push(...propias); cerrar() },
      rollback: async () => { propias.length = 0; cerrar() },
      release: () => {},
    }
  },
}

mock.module('../src/db/pool.js', { namedExports: { pool } })
mock.module('../src/repositories/proyectoRepository.js', {
  namedExports: { findById: async (id) => ({ id: Number(id), activo: 1 }) },
})
mock.module('../src/repositories/trabajadorRepository.js', {
  namedExports: { findById: async (id) => ({ id: Number(id), activo: 1 }) },
})
mock.module('../src/repositories/actividadRepository.js', { namedExports: { findById: async () => null } })
mock.module('../src/repositories/usuarioRepository.js', { namedExports: {} })
mock.module('../src/middleware/permisos.js', { namedExports: { rolTienePermiso: async () => true } })
const bitacora = []
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { bitacora.push(e) } } })

const { registrarAsignacion } = await import('../src/services/accesoService.js')
const { RegistrarAsignacionDto } = await import('../src/dtos/asignacion/RegistrarAsignacionDto.js')

const alta = (proyecto_id) => registrarAsignacion(RegistrarAsignacionDto.fromRequestBody({
  trabajador_id: 7,
  proyecto_id,
  fecha_inicio: '2026-03-01',
  fecha_fin_programada: '2026-03-31',
  rol_en_proyecto: 'Maestro de obra',
}))

beforeEach(() => {
  db.filas = []
  db.bloqueos = new Map()
  db.consultas = []
  bitacora.length = 0
})

describe('HU-05 / HU-31 / HU-33 · asignaciones simultáneas del mismo trabajador', () => {
  test('dos asignaciones en paralelo a obras distintas: una queda y la otra responde 409', async () => {
    const resultados = await Promise.allSettled([alta(1), alta(2)])
    const ok = resultados.filter((r) => r.status === 'fulfilled')
    const fallidas = resultados.filter((r) => r.status === 'rejected')
    assert.equal(ok.length, 1)
    assert.equal(fallidas.length, 1)
    assert.equal(fallidas[0].reason.statusCode, 409)
    // Estado final consistente: una sola asignación activa del trabajador.
    assert.equal(db.filas.filter((a) => a.trabajador_id === 7 && a.estado === 'ACTIVO').length, 1)
    // La bitácora solo registra la operación que se hizo, no la rechazada.
    assert.equal(bitacora.length, 1)
    assert.equal(db.bloqueos.size, 0, 'no quedan bloqueos tomados')
  })

  test('la comprobación definitiva va después del bloqueo de la fila del trabajador', async () => {
    await alta(1)
    const iBloqueo = db.consultas.findIndex((q) => /FROM trabajadores WHERE id = \? FOR UPDATE/.test(q))
    const iInsert = db.consultas.findIndex((q) => /INSERT INTO asignaciones_personal/.test(q))
    const iSolape = db.consultas.findLastIndex((q) => /fecha_fin_programada >= \?/.test(q))
    assert.ok(iBloqueo >= 0, 'se bloquea la fila del trabajador')
    assert.ok(iBloqueo < iSolape && iSolape < iInsert, 'bloqueo → verificación → inserción')
  })

  test('trabajadores distintos no se bloquean entre sí: ambas asignaciones quedan', async () => {
    const otro = registrarAsignacion(RegistrarAsignacionDto.fromRequestBody({
      trabajador_id: 8, proyecto_id: 2, fecha_inicio: '2026-03-01', fecha_fin_programada: '2026-03-31', rol_en_proyecto: 'Oficial',
    }))
    const r = await Promise.allSettled([alta(1), otro])
    assert.deepEqual(r.map((x) => x.status), ['fulfilled', 'fulfilled'])
    assert.equal(db.filas.length, 2)
  })
})
