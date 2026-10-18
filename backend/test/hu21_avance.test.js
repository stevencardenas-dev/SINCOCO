/**
 * HU-21: registro del porcentaje de avance (pruebas unitarias del backend).
 *
 * Corren sin MySQL: `db/pool.js` se reemplaza por una base en memoria que
 * entiende solo las consultas del seguimiento de avance, y la bitácora por un
 * registro en memoria. Así se prueban las reglas de la historia sin levantar
 * la base ni el servidor.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

// ---------------------------------------------------------------- base en memoria
const db = { actividades: [], etapas: [], proyectos: [], seguimiento: [], criterios: [], bitacora: [] }

function promedioPonderado(actividades) {
  const pesoTotal = actividades.reduce((s, a) => s + a.peso, 0)
  if (!pesoTotal) return 0
  const suma = actividades.reduce((s, a) => s + a.peso * a.porcentaje_avance, 0)
  return Math.round((suma / pesoTotal) * 100) / 100
}

const etapaActiva = (id) => db.etapas.find((e) => e.id === Number(id))?.activo === 1

async function query(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim()

  if (/FROM actividades a JOIN etapas_proyecto e .* FOR UPDATE/.test(s)) {
    const a = db.actividades.find((x) => x.id === Number(params[0]))
    if (!a) return [[]]
    const e = db.etapas.find((x) => x.id === a.etapa_id)
    return [[{ ...a, porcentaje_avance: String(a.porcentaje_avance), proyecto_id: e.proyecto_id }]]
  }
  if (s.startsWith('SELECT id, actividad_id, descripcion, cumplido, orden FROM criterios_aceptacion')) {
    return [db.criterios.filter((c) => c.actividad_id === Number(params[0])).map((c) => ({ ...c, cumplido: c.cumplido ? 1 : 0 }))]
  }
  if (s.startsWith('UPDATE criterios_aceptacion SET cumplido = ?, fecha_cumplido = ? WHERE id = ?')) {
    const [cumplido, , id, actividadId] = params
    const c = db.criterios.find((x) => x.id === Number(id) && x.actividad_id === Number(actividadId))
    if (c) c.cumplido = Boolean(cumplido)
    return [{ affectedRows: c ? 1 : 0 }]
  }
  if (s.startsWith('UPDATE criterios_aceptacion SET cumplido = 1')) {
    db.criterios.filter((c) => c.actividad_id === Number(params[1])).forEach((c) => { c.cumplido = true })
    return [{ affectedRows: 1 }]
  }
  if (s.startsWith('SELECT COUNT(*) AS total, COALESCE(SUM(cumplido), 0) AS cumplidos FROM criterios_aceptacion')) {
    const cs = db.criterios.filter((c) => c.actividad_id === Number(params[0]))
    return [[{ total: cs.length, cumplidos: cs.filter((c) => c.cumplido).length }]]
  }
  if (s.startsWith('INSERT INTO seguimiento_avance')) {
    const [actividad_id, usuario, anterior, nuevo, observaciones] = params
    db.seguimiento.push({ id: db.seguimiento.length + 1, actividad_id, usuario, anterior, nuevo, observaciones })
    return [{ insertId: db.seguimiento.length }]
  }
  if (s.startsWith('UPDATE actividades')) {
    const [porcentaje, id] = params
    const a = db.actividades.find((x) => x.id === Number(id))
    a.porcentaje_avance = porcentaje
    if (s.includes("estado = 'COMPLETADA'")) a.estado = 'COMPLETADA'
    return [{ affectedRows: 1 }]
  }
  if (/WHERE a.etapa_id = \? AND a.activo = 1/.test(s)) {
    const acts = db.actividades.filter((a) => a.etapa_id === Number(params[0]) && a.activo === 1)
    return [[{ avance: promedioPonderado(acts) }]]
  }
  if (/WHERE e.proyecto_id = \? AND a.activo = 1 AND e.activo = 1/.test(s)) {
    const etapas = db.etapas.filter((e) => e.proyecto_id === Number(params[0])).map((e) => e.id)
    const acts = db.actividades.filter((a) => etapas.includes(a.etapa_id) && a.activo === 1 && etapaActiva(a.etapa_id))
    return [[{ avance: promedioPonderado(acts) }]]
  }
  if (s.startsWith('UPDATE proyectos SET porcentaje_avance_total')) {
    const [avance, id] = params
    db.proyectos.find((p) => p.id === Number(id)).porcentaje_avance_total = avance
    return [{ affectedRows: 1 }]
  }
  throw new Error(`Consulta no simulada: ${s}`)
}

const transacciones = { commits: 0, rollbacks: 0 }
const conexion = {
  query,
  beginTransaction: async () => {},
  commit: async () => { transacciones.commits++ },
  rollback: async () => { transacciones.rollbacks++ },
  release: () => {},
}

mock.module('../src/db/pool.js', {
  namedExports: { pool: { query, getConnection: async () => conexion } },
})
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (entrada) => { db.bitacora.push(entrada) } },
})

const { aplicarAvance, recalcularAvanceProyecto } = await import('../src/services/avanceService.js')

// ---------------------------------------------------------------- datos de prueba
function sembrar() {
  db.proyectos = [{ id: 1, porcentaje_avance_total: 0 }]
  db.etapas = [
    { id: 10, proyecto_id: 1, activo: 1 },
    { id: 11, proyecto_id: 1, activo: 1 },
  ]
  db.actividades = [
    // Etapa 10: pesos 1 y 3 (promedio ponderado ≠ promedio simple).
    { id: 100, etapa_id: 10, estado: 'EN_PROCESO', activo: 1, porcentaje_avance: 20, peso: 1 },
    { id: 101, etapa_id: 10, estado: 'EN_PROCESO', activo: 1, porcentaje_avance: 0, peso: 3 },
    // Etapa 11.
    { id: 102, etapa_id: 11, estado: 'PENDIENTE', activo: 1, porcentaje_avance: 0, peso: 1 },
    { id: 103, etapa_id: 11, estado: 'ATRASADA', activo: 1, porcentaje_avance: 40, peso: 2 },
  ]
  // Criterios de aceptación (actividad 100: 4 criterios, 1 cumplido; 101: 2; 103: 2, 1 cumplido).
  db.criterios = [
    ...[1, 2, 3, 4].map((n) => ({ id: 100 + n, actividad_id: 100, descripcion: `C${n}`, cumplido: n === 1 })),
    ...[1, 2].map((n) => ({ id: 200 + n, actividad_id: 101, descripcion: `D${n}`, cumplido: false })),
    ...[1, 2].map((n) => ({ id: 300 + n, actividad_id: 103, descripcion: `E${n}`, cumplido: n === 1 })),
  ]
  db.seguimiento = []
  db.bitacora = []
  transacciones.commits = 0
  transacciones.rollbacks = 0
}

const ctx = { usuarioId: 7, ip: '127.0.0.1' }
const actividad = (id) => db.actividades.find((a) => a.id === id)

async function rechaza(promesa, status, texto) {
  await assert.rejects(promesa, (err) => {
    assert.equal(err.statusCode, status)
    if (texto) assert.match(err.message, texto)
    return true
  })
}

// ---------------------------------------------------------------- pruebas
const marcar = (id, criterioId, cumplido, extra = {}) =>
  aplicarAvance(id, { criterioId, cumplido, ...extra }, ctx)

describe('HU-21 · el avance se calcula de forma equitativa con los criterios cumplidos', () => {
  beforeEach(sembrar)

  test('conserva el porcentaje anterior y el nuevo (criterio 2)', async () => {
    // Actividad 100: 1 de 4 criterios cumplidos (25 %); al marcar el segundo pasa a 50 %.
    const r = await marcar(100, 102, true, { observaciones: 'Muros levantados' })

    assert.equal(r.porcentaje_anterior, 20)
    assert.equal(r.porcentaje_nuevo, 50)
    assert.deepEqual(db.seguimiento, [
      { id: 1, actividad_id: 100, usuario: 7, anterior: 20, nuevo: 50, observaciones: 'Muros levantados' },
    ])
    assert.equal(actividad(100).porcentaje_avance, 50)
    assert.equal(actividad(100).estado, 'EN_PROCESO')
    assert.equal(transacciones.commits, 1)
  })

  test('desmarcar un criterio baja el porcentaje', async () => {
    const r = await marcar(100, 101, false)
    assert.equal(r.porcentaje_nuevo, 0)
  })

  test('reparte el 100 % en partes iguales con redondeo a 2 decimales', async () => {
    db.criterios.push({ id: 105, actividad_id: 100, descripcion: 'C5', cumplido: false })
    db.criterios.push({ id: 106, actividad_id: 100, descripcion: 'C6', cumplido: false })
    db.criterios.push({ id: 107, actividad_id: 100, descripcion: 'C7', cumplido: false })
    // 2 de 7 = 28.57 %.
    const r = await marcar(100, 102, true)
    assert.equal(r.porcentaje_nuevo, 28.57)
  })

  test('recalcula el avance de la etapa y del proyecto por promedio ponderado (criterio 4)', async () => {
    // Actividad 101 (peso 3): 1 de 2 criterios = 50 %.
    const r = await marcar(101, 201, true)

    // Etapa 10: (1·20 + 3·50) / 4 = 42.5.
    assert.equal(r.avance_etapa, 42.5)
    // Proyecto: (1·20 + 3·50 + 1·0 + 2·40) / 7 = 250 / 7 = 35.71.
    assert.equal(r.avance_proyecto, 35.71)
    assert.equal(db.proyectos[0].porcentaje_avance_total, 35.71)
  })

  test('admite avanzar una actividad atrasada', async () => {
    const r = await marcar(103, 302, true)
    assert.equal(r.porcentaje_nuevo, 100)
  })

  test('deja constancia en la bitácora con el porcentaje anterior y el nuevo', async () => {
    await marcar(100, 102, true)
    assert.equal(db.bitacora.length, 1)
    assert.equal(db.bitacora[0].tabla, 'seguimiento_avance')
    assert.deepEqual(db.bitacora[0].detalles, { actividad_id: 100, porcentaje_anterior: 20, porcentaje_nuevo: 50 })
  })
})

describe('HU-21 · al cumplir todos los criterios', () => {
  beforeEach(sembrar)

  test('la actividad pasa automáticamente a COMPLETADA (criterio 3)', async () => {
    await marcar(101, 201, true)
    const r = await marcar(101, 202, true)
    assert.equal(r.estado, 'COMPLETADA')
    assert.equal(actividad(101).estado, 'COMPLETADA')
    assert.equal(actividad(101).porcentaje_avance, 100)
  })

  test('una actividad completada ya no admite más avance', async () => {
    await marcar(103, 302, true)
    await rechaza(marcar(103, 301, false), 409, /completada/)
  })

  test('«Finalizar» deja todos los criterios cumplidos al 100 %', async () => {
    const r = await aplicarAvance(100, { porcentaje: 100, observaciones: 'Actividad finalizada' }, ctx)
    assert.equal(r.estado, 'COMPLETADA')
    assert.ok(db.criterios.filter((c) => c.actividad_id === 100).every((c) => c.cumplido))
  })
})

describe('HU-21 · casos inválidos', () => {
  beforeEach(sembrar)

  test('rechaza un criterio que no pertenece a la actividad y no guarda nada', async () => {
    await rechaza(marcar(100, 201, true), 404, /no pertenece/)
    assert.equal(db.seguimiento.length, 0)
    assert.equal(transacciones.rollbacks, 1)
    assert.equal(transacciones.commits, 0)
  })

  test('rechaza repetir el estado de un criterio', async () => {
    await rechaza(marcar(100, 101, true), 409, /ya estaba cumplido/)
    await rechaza(marcar(100, 102, false), 409, /ya estaba pendiente/)
  })

  test('rechaza avanzar una actividad que no está en ejecución', async () => {
    await rechaza(marcar(102, 101, true), 409, /aún no ha empezado/)
    actividad(100).estado = 'SUSPENDIDA'
    await rechaza(marcar(100, 102, true), 409, /suspendida/)
  })

  test('rechaza avanzar una actividad dada de baja', async () => {
    actividad(100).activo = 0
    await rechaza(marcar(100, 102, true), 400, /dada de baja/)
  })

  test('devuelve 404 si la actividad no existe', async () => {
    await rechaza(marcar(999, 101, true), 404)
  })
})

describe('HU-21 · criterio 4: el avance del proyecto sigue los cambios del plan', () => {
  beforeEach(sembrar)

  test('excluye las actividades dadas de baja', async () => {
    // Todas activas: (20 + 0 + 0 + 80) / 7 = 14.29.
    assert.equal(await recalcularAvanceProyecto(1), 14.29)
    actividad(101).activo = 0
    // Sin la de peso 3: (20 + 0 + 80) / 4 = 25.
    assert.equal(await recalcularAvanceProyecto(1), 25)
    assert.equal(db.proyectos[0].porcentaje_avance_total, 25)
  })

  test('excluye las actividades de una etapa dada de baja', async () => {
    db.etapas[1].activo = 0
    // Solo la etapa 10: (20 + 0) / 4 = 5.
    assert.equal(await recalcularAvanceProyecto(1), 5)
  })

  test('refleja un cambio de esfuerzo (peso)', async () => {
    actividad(103).peso = 6
    // (20 + 0 + 0 + 240) / 11 = 23.64.
    assert.equal(await recalcularAvanceProyecto(1), 23.64)
  })

  test('un proyecto sin actividades queda en 0', async () => {
    db.actividades = []
    assert.equal(await recalcularAvanceProyecto(1), 0)
  })
})
