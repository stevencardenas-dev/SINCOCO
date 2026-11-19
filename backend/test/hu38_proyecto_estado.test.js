/**
 * HU-38: congelar, reanudar y finalizar proyectos (pruebas unitarias).
 *
 * Corren sin MySQL: el repositorio de estado, la consolidación de costos
 * (HU-15) y la bitácora se reemplazan por dobles en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = {
  proyecto: null,
  prestamos: 0,
  solicitudes: { materiales: 0, herramientas: 0 },
  cerradas: 0,
  bitacora: [],
  consolidaciones: [],
}

mock.module('../src/repositories/proyectoEstadoRepository.js', {
  namedExports: {
    estadoDeProyecto: async (id) => (estado.proyecto && Number(estado.proyecto.id) === Number(id) ? { ...estado.proyecto } : null),
    cambiarEstado: async (_id, nuevo) => {
      estado.proyecto.estado = nuevo
    },
    prestamosVigentes: async () => estado.prestamos,
    solicitudesPendientes: async () => estado.solicitudes,
    cerrarAsignaciones: async () => estado.cerradas,
  },
})
mock.module('../src/services/consolidacionCostoService.js', {
  namedExports: {
    consolidarProyecto: async (id) => {
      estado.consolidaciones.push(id)
      return { id: 1, proyecto_id: id, costo_real: 100, desviacion_porcentaje: -50 }
    },
  },
})
mock.module('../src/db/bitacora.js', {
  namedExports: {
    registrar: async (evento) => {
      estado.bitacora.push(evento)
    },
  },
})

const { cambiarEstadoProyecto, congelarProyecto, reanudarProyecto, finalizarProyecto, verificarProyectoOperable, esOperable } =
  await import('../src/services/proyectoEstadoService.js')

beforeEach(() => {
  estado.proyecto = {
    id: 4,
    codigo: 'PR-04',
    nombre: 'Torre Norte',
    estado: 'EN_EJECUCION',
    activo: 1,
    porcentaje_avance_total: '100.00',
  }
  estado.prestamos = 0
  estado.solicitudes = { materiales: 0, herramientas: 0 }
  estado.cerradas = 3
  estado.bitacora = []
  estado.consolidaciones = []
})

describe('guardas de estado', () => {
  test('solo planificación y en ejecución admiten operaciones', () => {
    assert.equal(esOperable('EN_EJECUCION'), true)
    assert.equal(esOperable('PLANIFICACION'), true)
    assert.equal(esOperable('PAUSADO'), false)
    assert.equal(esOperable('FINALIZADO'), false)
  })

  test('un proyecto congelado rechaza operaciones nuevas con 409', async () => {
    estado.proyecto.estado = 'PAUSADO'
    await assert.rejects(() => verificarProyectoOperable(4), (e) => e.statusCode === 409 && /congelado/i.test(e.message))
  })

  test('un proyecto finalizado rechaza operaciones nuevas', async () => {
    estado.proyecto.estado = 'FINALIZADO'
    await assert.rejects(() => verificarProyectoOperable(4), (e) => e.statusCode === 409)
  })

  test('un proyecto en ejecución pasa y sin proyecto no hace nada', async () => {
    await verificarProyectoOperable(4)
    await verificarProyectoOperable(null)
  })

  test('un proyecto dado de baja no admite operaciones', async () => {
    estado.proyecto.activo = 0
    await assert.rejects(() => verificarProyectoOperable(4), (e) => e.statusCode === 409)
  })
})

describe('cambios de estado', () => {
  test('congelar exige motivo', async () => {
    await assert.rejects(() => congelarProyecto(4, { motivo: '  ' }, {}), (e) => e.statusCode === 400)
  })

  test('congelar pasa de en ejecución a congelado y deja bitácora con motivo', async () => {
    const r = await congelarProyecto(4, { motivo: 'Falta de materiales en obra' }, { usuarioId: 7 })
    assert.equal(r.proyecto.estado, 'PAUSADO')
    assert.equal(estado.bitacora[0].accion, 'CONGELAR')
    assert.equal(estado.bitacora[0].detalles.motivo, 'Falta de materiales en obra')
    assert.equal(estado.bitacora[0].detalles.estado_nuevo, 'PAUSADO')
  })

  test('no se puede congelar un proyecto en planificación', async () => {
    estado.proyecto.estado = 'PLANIFICACION'
    await assert.rejects(() => congelarProyecto(4, { motivo: 'prueba larga' }, {}), (e) => e.statusCode === 409)
  })

  test('reanudar devuelve el proyecto a en ejecución', async () => {
    estado.proyecto.estado = 'PAUSADO'
    const r = await reanudarProyecto(4, { motivo: 'Llegó el material' }, { usuarioId: 7 })
    assert.equal(r.proyecto.estado, 'EN_EJECUCION')
    assert.equal(estado.bitacora[0].accion, 'REANUDAR')
  })

  test('no se puede reanudar un proyecto que no está congelado', async () => {
    await assert.rejects(() => reanudarProyecto(4, { motivo: 'prueba larga' }, {}), (e) => e.statusCode === 409)
  })
})

describe('finalizar', () => {
  test('exige confirmación cuando el avance es menor a 100%', async () => {
    estado.proyecto.porcentaje_avance_total = '72.50'
    await assert.rejects(
      () => finalizarProyecto(4, { motivo: 'Cierre anticipado' }, {}),
      (e) => e.statusCode === 409 && e.extra?.codigo === 'CONFIRMACION_REQUERIDA' && e.extra?.avance === 72.5,
    )
  })

  test('con confirmación finaliza, cierra asignaciones y consolida costos', async () => {
    estado.proyecto.porcentaje_avance_total = '72.50'
    const r = await finalizarProyecto(4, { motivo: 'Cierre anticipado', confirmar: true }, { usuarioId: 7 })

    assert.equal(r.proyecto.estado, 'FINALIZADO')
    assert.equal(r.cierre.asignaciones_cerradas, 3)
    assert.equal(estado.consolidaciones.length, 1)
    assert.equal(estado.bitacora[0].accion, 'FINALIZAR')
    assert.equal(estado.bitacora[0].detalles.cierre.asignaciones_cerradas, 3)
  })

  test('no finaliza con préstamos de herramientas vigentes', async () => {
    estado.prestamos = 2
    await assert.rejects(
      () => finalizarProyecto(4, { motivo: 'Cierre del proyecto' }, {}),
      (e) => e.statusCode === 409 && /préstamos vigentes/.test(e.message),
    )
  })

  test('no finaliza con solicitudes pendientes', async () => {
    estado.solicitudes = { materiales: 1, herramientas: 2 }
    await assert.rejects(
      () => finalizarProyecto(4, { motivo: 'Cierre del proyecto' }, {}),
      (e) => e.statusCode === 409 && /solicitudes|materiales/.test(e.message),
    )
  })

  test('finalizar es irreversible: no se puede volver a cambiar', async () => {
    estado.proyecto.estado = 'FINALIZADO'
    await assert.rejects(() => cambiarEstadoProyecto(4, 'finalizar', { motivo: 'otra vez' }, {}), (e) => e.statusCode === 409)
  })

  test('un proyecto inexistente responde 404', async () => {
    await assert.rejects(() => finalizarProyecto(99, { motivo: 'cierre total' }, {}), (e) => e.statusCode === 404)
  })
})
