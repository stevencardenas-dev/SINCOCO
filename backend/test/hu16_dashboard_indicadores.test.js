/**
 * HU-16: dashboard de indicadores de proyectos (pruebas unitarias).
 *
 * Corren sin MySQL: el repositorio del dashboard y el alcance del usuario se
 * reemplazan por dobles en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { proyectos: [], alertas: [], consultas: [], alcance: { total: true, trabajadorId: null } }

mock.module('../src/repositories/dashboardRepository.js', {
  namedExports: {
    indicadoresProyectos: async (filtros) => {
      estado.consultas.push(filtros)
      return estado.proyectos
    },
    alertasSinAtender: async () => estado.alertas,
  },
})
mock.module('../src/services/accesoService.js', {
  namedExports: { alcanceDeUsuario: async () => estado.alcance },
})

const { avanceTotal, obtenerIndicadores } = await import('../src/services/dashboardService.js')

const proyecto = {
  id: 1,
  codigo: 'PR-01',
  nombre: 'Torre Norte',
  estado: 'EN_EJECUCION',
  porcentaje_avance_total: '60.00',
  presupuesto_inicial: '1000.00',
  fecha_inicio_programada: '2026-01-10',
  fecha_fin_programada: '2026-12-20',
  costo_real: '950.75',
  desviacion_porcentaje: '-4.92',
  consolidado_en: '2026-11-25 08:30:00',
}

const sinConsolidar = {
  ...proyecto,
  id: 2,
  codigo: 'PR-02',
  nombre: 'Bodega Sur',
  estado: 'PLANIFICACION',
  porcentaje_avance_total: '10.00',
  presupuesto_inicial: '500.00',
  costo_real: null,
  desviacion_porcentaje: null,
  consolidado_en: null,
}

beforeEach(() => {
  estado.proyectos = [proyecto, sinConsolidar]
  estado.alertas = []
  estado.consultas = []
  estado.alcance = { total: true, trabajadorId: null }
})

describe('avance total', () => {
  test('se pondera por presupuesto, no es un promedio simple', () => {
    // (60×1000 + 10×500) / 1500 = 43.33, no 35.
    assert.equal(avanceTotal(estado.proyectos), 43.33)
  })

  test('sin presupuesto en ningún proyecto usa el promedio simple', () => {
    assert.equal(
      avanceTotal([
        { porcentaje_avance_total: '20.00', presupuesto_inicial: '0.00' },
        { porcentaje_avance_total: '40.00', presupuesto_inicial: '0.00' },
      ]),
      30,
    )
  })

  test('sin proyectos no inventa un avance', () => {
    assert.equal(avanceTotal([]), null)
  })
})

describe('obtenerIndicadores', () => {
  test('devuelve avance, estado y último costo de cada proyecto', async () => {
    const r = await obtenerIndicadores({}, { rol: 'GERENTE' })

    assert.equal(r.avance_total, 43.33)
    assert.equal(r.proyectos.length, 2)
    assert.deepEqual(
      { avance: r.proyectos[0].avance, costo: r.proyectos[0].costo_real, estado: r.proyectos[0].estado },
      { avance: 60, costo: 950.75, estado: 'EN_EJECUCION' },
    )
  })

  test('un proyecto sin consolidar se marca sin datos y no afecta al resto', async () => {
    const r = await obtenerIndicadores({}, { rol: 'GERENTE' })

    assert.equal(r.proyectos[1].sin_datos, true)
    assert.equal(r.proyectos[1].costo_real, null)
    assert.equal(r.proyectos[0].sin_datos, false)
    assert.equal(r.advertencias.length, 1)
    assert.match(r.advertencias[0], /PR-02/)
  })

  test('los filtros llegan al repositorio en el formato esperado', async () => {
    await obtenerIndicadores(
      { proyecto_id: '2', estado: 'planificacion', desde: '2026-01-01', hasta: '2026-12-31' },
      { rol: 'GERENTE' },
    )
    const filtros = estado.consultas[0]
    assert.equal(filtros.proyectoId, 2)
    assert.equal(filtros.estado, 'PLANIFICACION')
    assert.equal(filtros.desde, '2026-01-01')
    assert.equal(filtros.hasta, '2026-12-31')
  })

  test('rechaza un estado que no existe', async () => {
    await assert.rejects(
      () => obtenerIndicadores({ estado: 'TERMINADO' }, { rol: 'GERENTE' }),
      (e) => e.statusCode === 400 && e.campo === 'estado',
    )
  })

  test('rechaza un rango de fechas invertido', async () => {
    await assert.rejects(
      () => obtenerIndicadores({ desde: '2026-12-31', hasta: '2026-01-01' }, { rol: 'GERENTE' }),
      (e) => e.statusCode === 400,
    )
  })

  test('quien no ve todos los proyectos solo recibe alertas de los suyos', async () => {
    estado.alcance = { total: false, trabajadorId: 7 }
    estado.alertas = [
      { id: 1, tipo: 'ACTIVIDAD_ATRASADA', titulo: 'Actividad atrasada', proyecto_id: 1, creada_en: '2026-11-20' },
      { id: 2, tipo: 'STOCK_MINIMO', titulo: 'Stock mínimo', proyecto_id: null, creada_en: '2026-11-20' },
    ]
    const r = await obtenerIndicadores({}, { rol: 'MAESTRO_OBRA' })

    assert.equal(r.alertas.total, 1)
    assert.equal(r.alertas.activas[0].proyecto_id, 1)
    assert.equal(estado.consultas[0].alcance.trabajadorId, 7)
  })

  test('el gerente ve también las alertas que no dependen de un proyecto', async () => {
    estado.alertas = [
      { id: 1, tipo: 'ACTIVIDAD_ATRASADA', titulo: 'Actividad atrasada', proyecto_id: 1, creada_en: '2026-11-20' },
      { id: 2, tipo: 'STOCK_MINIMO', titulo: 'Stock mínimo', proyecto_id: null, creada_en: '2026-11-20' },
    ]
    const r = await obtenerIndicadores({}, { rol: 'GERENTE' })

    assert.equal(r.alertas.total, 2)
    assert.equal(r.alertas.por_tipo.length, 2)
  })

  test('filtrar por proyecto deja solo las alertas de ese proyecto', async () => {
    estado.alertas = [
      { id: 1, tipo: 'ACTIVIDAD_ATRASADA', titulo: 'A', proyecto_id: 1, creada_en: '2026-11-20' },
      { id: 2, tipo: 'ACTIVIDAD_ATRASADA', titulo: 'B', proyecto_id: 2, creada_en: '2026-11-20' },
    ]
    const r = await obtenerIndicadores({ proyecto_id: 1 }, { rol: 'GERENTE' })

    assert.equal(r.alertas.total, 1)
    assert.equal(r.filtros.proyecto_id, 1)
  })
})
