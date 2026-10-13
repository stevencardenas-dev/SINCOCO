/**
 * HU-34: reprogramación de fechas del plan de trabajo (pruebas unitarias del
 * backend para los criterios 5 y 6).
 *
 * Corren sin MySQL: los repositorios, el control de acceso y la bitácora se
 * reemplazan por dobles en memoria. Los criterios 1 a 4 (fechas originales,
 * historial, cascada y fin del proyecto) los cubre la prueba de API
 * `tests/test_hu34_reprogramacion.py`.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = {
  etapas: [],
  actividades: [],
  proyecto: null,
  asignaciones: [],
  escrituras: [],
  consultasAsignaciones: [],
}

mock.module('../src/repositories/etapaRepository.js', {
  namedExports: {
    findById: async (id) => estado.etapas.find((e) => e.id === Number(id)) ?? null,
    listarPorProyecto: async () => estado.etapas,
    renumerar: async () => {},
  },
})
mock.module('../src/repositories/actividadRepository.js', {
  namedExports: {
    findById: async (id) => estado.actividades.find((a) => a.id === Number(id)) ?? null,
    listarPorEtapa: async (etapaId) => estado.actividades.filter((a) => a.etapa_id === Number(etapaId)),
  },
})
mock.module('../src/repositories/proyectoRepository.js', {
  namedExports: { findById: async () => estado.proyecto },
})
mock.module('../src/repositories/reprogramacionRepository.js', {
  namedExports: {
    conTransaccion: async (fn) => fn({}),
    fijarFechas: async (_c, tipo, id, inicio, fin) => { estado.escrituras.push({ tipo, id, inicio, fin }) },
    registrar: async () => {},
    listarPorEntidad: async () => [],
    asignacionesFueraDeFechas: async (actividadId, inicio, fin) => {
      estado.consultasAsignaciones.push({ actividadId, inicio, fin })
      return estado.asignaciones.filter(
        (a) =>
          a.actividad_id === actividadId &&
          (a.fecha_inicio < inicio || a.fecha_fin_programada > fin || a.fecha_fin_programada < fin),
      )
    },
  },
})
mock.module('../src/services/accesoService.js', {
  namedExports: { verificarGestionPlan: async () => {}, verificarAccesoProyecto: async () => {} },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async () => {} } })

const { reprogramarEtapa, reprogramarActividad } = await import('../src/services/reprogramacionService.js')

const dto = (inicio, fin, extra = {}) => ({
  motivo: 'Lluvias',
  fecha_inicio_programada: inicio,
  fecha_fin_programada: fin,
  confirmar: false,
  ...extra,
})
const rechaza = (promesa, estadoHttp) => assert.rejects(promesa, (e) => e.statusCode === estadoHttp)

beforeEach(() => {
  estado.proyecto = { id: 1, fecha_inicio_programada: '2026-01-01', fecha_fin_programada: '2026-12-31' }
  estado.etapas = [
    { id: 1, proyecto_id: 1, nombre: 'Cimentación', estado: 'EN_PROCESO', activo: 1,
      fecha_inicio_programada: '2026-02-01', fecha_fin_programada: '2026-03-31' },
    { id: 2, proyecto_id: 1, nombre: 'Estructura', estado: 'PENDIENTE', activo: 1,
      fecha_inicio_programada: '2026-04-01', fecha_fin_programada: '2026-06-30' },
  ]
  estado.actividades = [
    { id: 10, etapa_id: 1, proyecto_id: 1, nombre: 'Excavación', estado: 'EN_PROCESO', activo: 1,
      fecha_inicio_programada: '2026-02-01', fecha_fin_programada: '2026-02-28' },
    { id: 20, etapa_id: 2, proyecto_id: 1, nombre: 'Vaciado de columnas', estado: 'PENDIENTE', activo: 1,
      fecha_inicio_programada: '2026-04-01', fecha_fin_programada: '2026-04-30' },
  ]
  estado.asignaciones = []
  estado.escrituras = []
  estado.consultasAsignaciones = []
})

describe('HU-34 · criterio 5: lo completado no se reprograma', () => {
  test('una actividad completada responde 409 y no escribe fechas', async () => {
    estado.actividades[0].estado = 'COMPLETADA'
    await rechaza(reprogramarActividad(10, dto('2026-02-05', '2026-03-05')), 409)
    assert.equal(estado.escrituras.length, 0)
  })

  test('una etapa completada responde 409 y no escribe fechas', async () => {
    estado.etapas[0].estado = 'COMPLETADA'
    await rechaza(reprogramarEtapa(1, dto('2026-02-01', '2026-04-10')), 409)
    assert.equal(estado.escrituras.length, 0)
  })

  test('una etapa posterior completada impide el desplazamiento en cascada', async () => {
    estado.etapas[1].estado = 'COMPLETADA'
    await rechaza(reprogramarEtapa(1, dto('2026-02-01', '2026-04-10')), 409)
    assert.equal(estado.escrituras.length, 0)
  })

  test('una actividad completada de una etapa que se desplaza impide la cascada', async () => {
    estado.actividades[1].estado = 'COMPLETADA'
    await assert.rejects(
      reprogramarEtapa(1, dto('2026-02-01', '2026-04-10')),
      (e) => e.statusCode === 409 && /ya está completada/.test(e.message),
    )
    assert.equal(estado.escrituras.length, 0)
  })

  test('lo pendiente o en proceso sí se reprograma', async () => {
    const r = await reprogramarActividad(10, dto('2026-02-05', '2026-03-05'))
    assert.equal(r.actividad.id, 10)
    assert.deepEqual(estado.escrituras, [{ tipo: 'ACTIVIDAD', id: 10, inicio: '2026-02-05', fin: '2026-03-05' }])
  })
})

describe('HU-34 · criterio 6: asignaciones que quedan fuera de las nuevas fechas', () => {
  const asignacion = (extra) => ({
    id: 1, actividad_id: 10, actividad_nombre: 'Excavación', trabajador_nombre: 'Ana Pérez',
    fecha_inicio: '2026-02-01', fecha_fin_programada: '2026-02-28', ...extra,
  })

  test('lista, sin modificarlas, las asignaciones que comienzan antes de la nueva actividad', async () => {
    estado.asignaciones = [asignacion()]
    const r = await reprogramarActividad(10, dto('2026-02-10', '2026-03-10'))
    assert.equal(r.asignaciones_fuera_de_fechas.length, 1)
    assert.equal(r.asignaciones_fuera_de_fechas[0].razon, 'COMIENZA_ANTES_DE_LA_ACTIVIDAD')
    assert.equal(r.asignaciones_fuera_de_fechas[0].trabajador_nombre, 'Ana Pérez')
    // Solo se escribieron las fechas de la actividad: ninguna asignación se tocó.
    assert.deepEqual(estado.escrituras.map((e) => e.tipo), ['ACTIVIDAD'])
  })

  test('una asignación que termina después del nuevo fin se informa', async () => {
    estado.asignaciones = [asignacion({ fecha_fin_programada: '2026-03-20' })]
    const r = await reprogramarActividad(10, dto('2026-02-01', '2026-03-10'))
    assert.equal(r.asignaciones_fuera_de_fechas[0].razon, 'TERMINA_DESPUES_DE_LA_ACTIVIDAD')
  })

  test('una asignación que termina antes del nuevo fin se informa para extenderla con HU-31', async () => {
    estado.asignaciones = [asignacion()]
    const r = await reprogramarActividad(10, dto('2026-02-01', '2026-03-10'))
    assert.equal(r.asignaciones_fuera_de_fechas[0].razon, 'TERMINA_ANTES_DEL_FIN_DE_LA_ACTIVIDAD')
  })

  test('una asignación que encaja con las nuevas fechas no se informa', async () => {
    estado.asignaciones = [asignacion({ fecha_inicio: '2026-02-05', fecha_fin_programada: '2026-03-05' })]
    const r = await reprogramarActividad(10, dto('2026-02-01', '2026-03-05'))
    assert.deepEqual(r.asignaciones_fuera_de_fechas, [])
  })

  test('sin asignaciones la lista viene vacía', async () => {
    const r = await reprogramarActividad(10, dto('2026-02-05', '2026-03-05'))
    assert.deepEqual(r.asignaciones_fuera_de_fechas, [])
  })

  test('al reprogramar una etapa se revisan las actividades que se desplazan', async () => {
    estado.asignaciones = [
      asignacion({ id: 7, actividad_id: 20, actividad_nombre: 'Vaciado de columnas', fecha_inicio: '2026-04-01', fecha_fin_programada: '2026-04-30' }),
    ]
    const r = await reprogramarEtapa(1, dto('2026-02-01', '2026-04-10'))
    assert.equal(r.etapas_desplazadas.length, 1)
    assert.ok(estado.consultasAsignaciones.some((c) => c.actividadId === 20))
    assert.equal(r.asignaciones_fuera_de_fechas.length, 1)
    assert.equal(r.asignaciones_fuera_de_fechas[0].actividad_id, 20)
  })

  test('si ninguna actividad se desplaza no hay nada que informar', async () => {
    const r = await reprogramarEtapa(1, dto('2026-02-01', '2026-03-31'))
    assert.deepEqual(r.asignaciones_fuera_de_fechas, [])
  })
})
