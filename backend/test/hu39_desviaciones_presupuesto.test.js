/**
 * HU-39: visualización de desviaciones presupuestales (pruebas unitarias).
 *
 * Corren sin MySQL: el repositorio de consolidación y el alcance del usuario se
 * reemplazan por dobles en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { filas: [], consultas: [], alcance: { total: true, trabajadorId: null } }

mock.module('../src/repositories/consolidacionCostoRepository.js', {
  namedExports: {
    resumenPorProyecto: async (filtros) => {
      estado.consultas.push(filtros)
      return estado.filas
    },
  },
})
mock.module('../src/services/accesoService.js', {
  namedExports: { alcanceDeUsuario: async () => estado.alcance },
})

const { semaforo, validarFiltros, listarDesviaciones } = await import('../src/services/desviacionService.js')

const fila = (extra = {}) => ({
  id: 1,
  codigo: 'PR-01',
  nombre: 'Torre Norte',
  estado: 'EN_EJECUCION',
  presupuesto_inicial: '1000.00',
  costo_materiales: '600.00',
  costo_servicios: '250.00',
  costo_ordenes_compra: '100.00',
  costo_real: '950.00',
  desviacion_porcentaje: '-5.00',
  consolidado_en: '2026-11-25 08:30:00',
  ...extra,
})

beforeEach(() => {
  estado.filas = [
    fila(),
    fila({ id: 2, codigo: 'PR-02', nombre: 'Bodega Sur', desviacion_porcentaje: '22.50', costo_real: '1225.00' }),
    fila({ id: 3, codigo: 'PR-03', nombre: 'Bodega Norte', consolidado_en: null, desviacion_porcentaje: null,
      costo_materiales: null, costo_servicios: null, costo_ordenes_compra: null, costo_real: null }),
  ]
  estado.consultas = []
  estado.alcance = { total: true, trabajadorId: null }
})

describe('semáforo de la desviación', () => {
  test('usa los umbrales configurables: normal, advertencia y crítica', () => {
    assert.equal(semaforo(-5), 'NORMAL')
    assert.equal(semaforo(5), 'NORMAL')
    assert.equal(semaforo(6), 'ADVERTENCIA')
    assert.equal(semaforo(15), 'ADVERTENCIA')
    assert.equal(semaforo(15.1), 'CRITICA')
  })

  test('sin consolidación no hay semáforo', () => {
    assert.equal(semaforo(null), 'SIN_DATOS')
    assert.equal(semaforo(undefined), 'SIN_DATOS')
  })

  test('acepta umbrales distintos de los de por defecto', () => {
    assert.equal(semaforo(8, { advertencia: 10, critico: 20 }), 'NORMAL')
    assert.equal(semaforo(12, { advertencia: 10, critico: 20 }), 'ADVERTENCIA')
    assert.equal(semaforo(25, { advertencia: 10, critico: 20 }), 'CRITICA')
  })
})

describe('validarFiltros', () => {
  test('normaliza los umbrales y el estado', () => {
    const f = validarFiltros({ estado: 'en_ejecucion', umbral_advertencia: '8', umbral_critico: '25' })
    assert.equal(f.estado, 'EN_EJECUCION')
    assert.deepEqual(f.umbrales, { advertencia: 8, critico: 25 })
  })

  test('rechaza un estado desconocido', () => {
    assert.throws(() => validarFiltros({ estado: 'ARCHIVADO' }), { statusCode: 400, campo: 'estado' })
  })

  test('rechaza umbrales negativos o invertidos', () => {
    assert.throws(() => validarFiltros({ umbral_advertencia: -1 }), { statusCode: 400 })
    assert.throws(
      () => validarFiltros({ umbral_advertencia: 20, umbral_critico: 10 }),
      { statusCode: 400, campo: 'umbral_critico' },
    )
  })
})

describe('listarDesviaciones', () => {
  test('calcula el desglose del costo real y el semáforo por proyecto', async () => {
    const r = await listarDesviaciones({}, { rol: 'GERENTE' })

    assert.equal(r.proyectos.length, 3)
    assert.deepEqual(r.proyectos[0].desglose, {
      materiales: 600,
      servicios_externos: 250,
      ordenes_compra: 100,
    })
    assert.equal(r.proyectos[0].costo_real, 950)
    assert.equal(r.proyectos[0].desviacion_porcentaje, -5)
    assert.equal(r.proyectos[0].semaforo, 'NORMAL')
    assert.equal(r.proyectos[1].semaforo, 'CRITICA')
  })

  test('un proyecto sin consolidar queda vacío con su advertencia y no afecta al resto', async () => {
    const r = await listarDesviaciones({}, { rol: 'GERENTE' })
    const sinDatos = r.proyectos[2]

    assert.equal(sinDatos.sin_datos, true)
    assert.equal(sinDatos.semaforo, 'SIN_DATOS')
    assert.equal(sinDatos.costo_real, null)
    assert.deepEqual(sinDatos.desglose, { materiales: null, servicios_externos: null, ordenes_compra: null })
    assert.match(sinDatos.advertencia, /no tiene costos consolidados/)
    assert.equal(r.proyectos[0].semaforo, 'NORMAL')
    assert.equal(r.advertencias.length, 1)
  })

  test('muestra la fecha de la última consolidación y el resumen', async () => {
    const r = await listarDesviaciones({}, { rol: 'GERENTE' })

    assert.equal(r.ultima_consolidacion, '2026-11-25 08:30:00')
    assert.deepEqual(r.resumen, {
      proyectos: 3,
      con_datos: 2,
      sin_datos: 1,
      criticos: 1,
      advertencia: 0,
      desviacion_promedio: 8.75,
    })
  })

  test('pasa los filtros y el alcance del usuario al repositorio', async () => {
    estado.alcance = { total: false, trabajadorId: 7 }
    await listarDesviaciones({ proyecto_id: '2', estado: 'pausado' }, { rol: 'MAESTRO_OBRA' })

    const filtros = estado.consultas[0]
    assert.equal(filtros.proyectoId, 2)
    assert.equal(filtros.estado, 'PAUSADO')
    assert.equal(filtros.alcance.trabajadorId, 7)
  })

  test('sin proyectos no inventa un promedio', async () => {
    estado.filas = []
    const r = await listarDesviaciones({}, { rol: 'GERENTE' })

    assert.equal(r.resumen.desviacion_promedio, null)
    assert.equal(r.ultima_consolidacion, null)
    assert.deepEqual(r.proyectos, [])
  })
})
