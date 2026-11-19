/**
 * HU-15: consolidación del costo real de un proyecto (pruebas unitarias).
 *
 * Corren sin MySQL: los repositorios y la bitácora se reemplazan por dobles en
 * memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { proyectos: [], costos: {}, cortes: [], bitacora: [] }

mock.module('../src/repositories/proyectoRepository.js', {
  namedExports: {
    findById: async (id) => estado.proyectos.find((p) => Number(p.id) === Number(id)) ?? null,
  },
})
mock.module('../src/repositories/consolidacionCostoRepository.js', {
  namedExports: {
    costosDeProyecto: async (id) => estado.costos[id] ?? { materiales: 0, servicios: 0, ordenes_compra: 0 },
    registrar: async (datos) => {
      estado.cortes.push(datos)
      return estado.cortes.length
    },
    ultimaDeProyecto: async () => null,
    historialDeProyecto: async () => [],
    resumenPorProyecto: async () => estado.proyectos,
  },
})
mock.module('../src/db/bitacora.js', {
  namedExports: {
    registrar: async (evento) => {
      estado.bitacora.push(evento)
    },
  },
})

const { desviacion, consolidarProyecto, resumenCostos, consolidarTodos } = await import(
  '../src/services/consolidacionCostoService.js'
)

beforeEach(() => {
  estado.proyectos = [
    { id: 1, codigo: 'PR-01', nombre: 'Torre Norte', presupuesto_inicial: '1000.00', estado: 'EN_EJECUCION' },
    { id: 2, codigo: 'PR-02', nombre: 'Bodega Sur', presupuesto_inicial: '0.00', estado: 'FINALIZADO' },
  ]
  estado.costos = {
    1: { materiales: '600.50', servicios: '250.25', ordenes_compra: '100.00' },
    2: { materiales: '0.00', servicios: '0.00', ordenes_compra: '0.00' },
  }
  estado.cortes = []
  estado.bitacora = []
})

describe('desviación', () => {
  test('se calcula sobre el presupuesto inicial', () => {
    assert.equal(desviacion(950.75, 1000), -4.92)
    assert.equal(desviacion(1200, 1000), 20)
    assert.equal(desviacion(1000, 1000), 0)
  })

  test('con presupuesto 0 no inventa porcentaje', () => {
    assert.equal(desviacion(500, 0), null)
    assert.equal(desviacion(500, null), null)
  })
})

describe('consolidarProyecto', () => {
  test('suma las tres fuentes del criterio y guarda el corte', async () => {
    const r = await consolidarProyecto(1, { usuarioId: 9 })

    assert.equal(r.costo_materiales, 600.5)
    assert.equal(r.costo_servicios, 250.25)
    assert.equal(r.costo_ordenes_compra, 100)
    assert.equal(r.costo_real, 950.75)
    assert.equal(r.presupuesto_inicial, 1000)
    assert.equal(r.desviacion_porcentaje, -4.92)

    assert.equal(estado.cortes.length, 1)
    assert.equal(estado.cortes[0].consolidado_por_usuario_id, 9)
    assert.equal(estado.bitacora[0].accion, 'CONSOLIDAR_COSTO')
  })

  test('un proyecto sin costos consolidados da costo real 0', async () => {
    estado.costos = {}
    const r = await consolidarProyecto(1)
    assert.equal(r.costo_real, 0)
    assert.equal(r.desviacion_porcentaje, -100)
  })

  test('un proyecto inexistente responde 404', async () => {
    await assert.rejects(() => consolidarProyecto(99), (e) => e.statusCode === 404)
  })

  test('una segunda consolidación guarda un corte nuevo (histórico)', async () => {
    await consolidarProyecto(1)
    estado.costos[1] = { materiales: '700.00', servicios: '250.25', ordenes_compra: '100.00' }
    await consolidarProyecto(1)
    assert.equal(estado.cortes.length, 2)
    assert.equal(estado.cortes[1].costo_real, 1050.25)
  })
})

describe('resumenCostos y consolidación programada', () => {
  test('el resumen marca sin consolidar los proyectos sin corte', async () => {
    const filas = await resumenCostos({ estado: '' })
    assert.equal(filas.length, 2)
    assert.equal(filas[0].desviacion_porcentaje, null)
    assert.equal(filas[0].costo_real, null)
  })

  test('consolidarTodos omite los proyectos finalizados y cancelados', async () => {
    const r = await consolidarTodos({ usuarioId: 1 })
    assert.equal(r.consolidados, 1)
    assert.equal(r.resultados[0].proyecto.codigo, 'PR-01')
  })
})
