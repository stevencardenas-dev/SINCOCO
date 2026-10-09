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
const db = { actividades: [], etapas: [], proyectos: [], seguimiento: [], bitacora: [] }

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

const { revisarPorcentaje, aplicarAvance, recalcularAvanceProyecto } = await import('../src/services/avanceService.js')

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
describe('HU-21 · criterio 1: el porcentaje está entre 0 y 100', () => {
  test('acepta 0, 100 y valores con hasta 2 decimales', () => {
    assert.equal(revisarPorcentaje(0), 0)
    assert.equal(revisarPorcentaje(100), 100)
    assert.equal(revisarPorcentaje('45.5'), 45.5)
    assert.equal(revisarPorcentaje(12.25), 12.25)
  })

  test('rechaza valores fuera de rango, vacíos, no numéricos o con más de 2 decimales', () => {
    for (const valor of [-1, -0.01, 100.01, 150, '', null, undefined, 'abc', 10.555]) {
      assert.throws(() => revisarPorcentaje(valor), (err) => err.statusCode === 400, `debió rechazar ${valor}`)
    }
  })
})

describe('HU-21 · escenario principal: avance físico', () => {
  beforeEach(sembrar)

  test('conserva el porcentaje anterior y el nuevo (criterio 2)', async () => {
    const r = await aplicarAvance(100, { porcentaje: 35, observaciones: 'Muros levantados' }, ctx)

    assert.equal(r.porcentaje_anterior, 20)
    assert.equal(r.porcentaje_nuevo, 35)
    assert.deepEqual(db.seguimiento, [
      { id: 1, actividad_id: 100, usuario: 7, anterior: 20, nuevo: 35, observaciones: 'Muros levantados' },
    ])
    assert.equal(actividad(100).porcentaje_avance, 35)
    assert.equal(actividad(100).estado, 'EN_PROCESO')
    assert.equal(transacciones.commits, 1)
  })

  test('recalcula el avance de la etapa y del proyecto por promedio ponderado (criterio 4)', async () => {
    const r = await aplicarAvance(101, { porcentaje: 60 }, ctx)

    // Etapa 10: (1·20 + 3·60) / 4 = 50.
    assert.equal(r.avance_etapa, 50)
    // Proyecto: (1·20 + 3·60 + 1·0 + 2·40) / 7 = 280 / 7 = 40.
    assert.equal(r.avance_proyecto, 40)
    assert.equal(db.proyectos[0].porcentaje_avance_total, 40)
  })

  test('admite registrar avance en una actividad atrasada', async () => {
    const r = await aplicarAvance(103, { porcentaje: 55 }, ctx)
    assert.equal(r.porcentaje_nuevo, 55)
  })

  test('deja constancia en la bitácora con el porcentaje anterior y el nuevo', async () => {
    await aplicarAvance(100, { porcentaje: 30 }, ctx)
    assert.equal(db.bitacora.length, 1)
    assert.equal(db.bitacora[0].tabla, 'seguimiento_avance')
    assert.deepEqual(db.bitacora[0].detalles, { actividad_id: 100, porcentaje_anterior: 20, porcentaje_nuevo: 30 })
  })
})

describe('HU-21 · escenario alternativo 1: avance al 100 %', () => {
  beforeEach(sembrar)

  test('la actividad pasa automáticamente a COMPLETADA (criterio 3)', async () => {
    const r = await aplicarAvance(100, { porcentaje: 100 }, ctx)
    assert.equal(r.estado, 'COMPLETADA')
    assert.equal(actividad(100).estado, 'COMPLETADA')
    assert.equal(actividad(100).porcentaje_avance, 100)
  })

  test('una actividad completada ya no admite más avance', async () => {
    await aplicarAvance(100, { porcentaje: 100 }, ctx)
    await rechaza(aplicarAvance(100, { porcentaje: 100 }, ctx), 409, /completada/)
  })
})

describe('HU-21 · escenario alternativo 2: valor inválido', () => {
  beforeEach(sembrar)

  test('rechaza un porcentaje inferior al último registrado y no guarda nada', async () => {
    await rechaza(aplicarAvance(103, { porcentaje: 39.99 }, ctx), 400, /inferior al último registrado \(40 %\)/)

    assert.equal(db.seguimiento.length, 0)
    assert.equal(actividad(103).porcentaje_avance, 40)
    assert.equal(transacciones.rollbacks, 1)
    assert.equal(transacciones.commits, 0)
  })

  test('rechaza repetir el mismo porcentaje', async () => {
    await rechaza(aplicarAvance(100, { porcentaje: 20 }, ctx), 400, /ya está en 20 %/)
  })

  test('«Finalizar» puede registrar el 100 % aunque ya estuviera en 100', async () => {
    actividad(100).porcentaje_avance = 100
    const r = await aplicarAvance(100, { porcentaje: 100 }, ctx, { permitirIgual: true })
    assert.equal(r.estado, 'COMPLETADA')
  })

  test('rechaza avanzar una actividad que no está en ejecución', async () => {
    await rechaza(aplicarAvance(102, { porcentaje: 10 }, ctx), 409, /aún no ha empezado/)
    actividad(100).estado = 'SUSPENDIDA'
    await rechaza(aplicarAvance(100, { porcentaje: 30 }, ctx), 409, /suspendida/)
  })

  test('rechaza avanzar una actividad dada de baja', async () => {
    actividad(100).activo = 0
    await rechaza(aplicarAvance(100, { porcentaje: 30 }, ctx), 400, /dada de baja/)
  })

  test('devuelve 404 si la actividad no existe', async () => {
    await rechaza(aplicarAvance(999, { porcentaje: 30 }, ctx), 404)
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

  test('refleja un cambio de peso', async () => {
    actividad(103).peso = 6
    // (20 + 0 + 0 + 240) / 11 = 23.64.
    assert.equal(await recalcularAvanceProyecto(1), 23.64)
  })

  test('un proyecto sin actividades queda en 0', async () => {
    db.actividades = []
    assert.equal(await recalcularAvanceProyecto(1), 0)
  })
})
