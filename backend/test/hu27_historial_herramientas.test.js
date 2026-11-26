/**
 * HU-27: historial de movimientos de herramientas (pruebas unitarias).
 *
 * Corren sin MySQL: los repositorios de herramientas y de reparaciones se
 * reemplazan por dobles en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { herramienta: null, prestamos: [], reparaciones: [] }

mock.module('../src/repositories/herramientaRepository.js', {
  namedExports: {
    findById: async (id) => (estado.herramienta && Number(estado.herramienta.id) === Number(id) ? estado.herramienta : null),
    historialPrestamos: async () => estado.prestamos,
  },
})
mock.module('../src/repositories/herramientaEstadoRepository.js', {
  namedExports: { listarReparaciones: async () => estado.reparaciones },
})

const { diasEntre, movimientosDe, resumenDe, historialHerramienta } = await import(
  '../src/services/herramientaHistorialService.js'
)

const herramienta = {
  id: 4,
  codigo_serial: 'HR-004',
  nombre: 'Mezcladora',
  estado_operativo: 'BUENO',
  disponibilidad: 'DISPONIBLE',
  almacen: 'Central',
}

const prestamoVigente = {
  id: 12,
  fecha_prestamo: '2026-11-20 08:00:00',
  fecha_estimada_devolucion: '2026-11-27',
  fecha_real_devolucion: null,
  estado_entrega: 'BUENO',
  estado_devolucion: null,
  estado_prestamo: 'ACTIVO',
  trabajador: 'Luis Peña',
  proyecto: 'Torre Norte',
  proyecto_codigo: 'PR-01',
  entregado_por: 'Ana Rojas',
  recibido_por: null,
}

const prestamoDevuelto = {
  ...prestamoVigente,
  id: 9,
  fecha_prestamo: '2026-10-01 07:30:00',
  fecha_real_devolucion: '2026-10-11 17:00:00',
  estado_devolucion: 'REGULAR',
  estado_prestamo: 'DEVUELTO',
  trabajador: 'Marta Díaz',
  recibido_por: 'Ana Rojas',
}

const reparacion = {
  id: 3,
  fecha_ingreso: '2026-11-05 09:00:00',
  fecha_salida: '2026-11-09 16:00:00',
  descripcion: 'Cambio de banda',
  estado_previo: 'REGULAR',
  ingresada_por: 'bodega',
  costo: '85000.00',
  observaciones_salida: 'Quedó operativa',
}

beforeEach(() => {
  estado.herramienta = { ...herramienta }
  estado.prestamos = [{ ...prestamoDevuelto }, { ...prestamoVigente }]
  estado.reparaciones = [{ ...reparacion }]
})

describe('días de uso', () => {
  test('cuenta los días completos con un decimal', () => {
    assert.equal(diasEntre('2026-10-01 07:30:00', '2026-10-11 17:00:00'), 10.4)
  })

  test('sin alguna de las dos fechas no inventa un valor', () => {
    assert.equal(diasEntre(null, '2026-10-11'), null)
    assert.equal(diasEntre('2026-10-01', null), null)
  })
})

describe('movimientosDe', () => {
  test('une préstamos, devoluciones y reparaciones en orden cronológico inverso', () => {
    const movimientos = movimientosDe(estado.prestamos, estado.reparaciones)

    assert.deepEqual(
      movimientos.map((m) => m.tipo),
      ['PRESTAMO', 'SALIDA_REPARACION', 'REPARACION', 'DEVOLUCION', 'PRESTAMO'],
    )
    assert.equal(movimientos[0].fecha, '2026-11-20 08:00:00')
  })

  test('la devolución conserva el trabajador, el proyecto y el estado de entrega', () => {
    const devolucion = movimientosDe(estado.prestamos, []).find((m) => m.tipo === 'DEVOLUCION')

    assert.equal(devolucion.trabajador, 'Marta Díaz')
    assert.equal(devolucion.proyecto_codigo, 'PR-01')
    assert.equal(devolucion.estado_devolucion, 'REGULAR')
    assert.equal(devolucion.dias_uso, 10.4)
  })

  test('el envío a reparación queda reflejado con su estado previo y su salida', () => {
    const movimientos = movimientosDe([], estado.reparaciones)
    const ingreso = movimientos.find((m) => m.tipo === 'REPARACION')
    const salida = movimientos.find((m) => m.tipo === 'SALIDA_REPARACION')

    assert.equal(ingreso.estado_previo, 'REGULAR')
    assert.equal(ingreso.descripcion, 'Cambio de banda')
    assert.equal(salida.costo, 85000)
    assert.equal(salida.dias_en_reparacion, 4.3)
  })
})

describe('resumenDe', () => {
  test('cuenta préstamos, vigentes, reparaciones y promedio de días fuera', () => {
    const resumen = resumenDe(estado.prestamos, estado.reparaciones)

    assert.equal(resumen.total_prestamos, 2)
    assert.equal(resumen.prestamos_vigentes, 1)
    assert.equal(resumen.total_reparaciones, 1)
    assert.equal(resumen.dias_promedio_uso, 10.4)
    assert.deepEqual(resumen.trabajador_frecuente, { nombre: 'Marta Díaz', prestamos: 1 })
    assert.equal(resumen.ultimo_movimiento.tipo, 'PRESTAMO')
  })

  test('sin préstamos devueltos deja el promedio vacío', () => {
    const resumen = resumenDe([{ ...prestamoVigente }], [])
    assert.equal(resumen.dias_promedio_uso, null)
  })
})

describe('historialHerramienta', () => {
  test('devuelve la herramienta, su resumen y sus movimientos', async () => {
    const r = await historialHerramienta(4)

    assert.equal(r.herramienta.codigo_serial, 'HR-004')
    assert.equal(r.sin_movimientos, false)
    assert.equal(r.movimientos.length, 5)
    assert.equal(r.prestamos.length, 2)
  })

  test('avisa cuando la herramienta no registra movimientos', async () => {
    estado.prestamos = []
    estado.reparaciones = []
    const r = await historialHerramienta(4)

    assert.equal(r.sin_movimientos, true)
    assert.deepEqual(r.movimientos, [])
  })

  test('responde 404 si la herramienta no existe', async () => {
    await assert.rejects(() => historialHerramienta(99), (e) => e.statusCode === 404)
  })
})
