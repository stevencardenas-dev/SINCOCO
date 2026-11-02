/**
 * HU-12: devolución de herramientas (pruebas unitarias del backend).
 *
 * Corren sin MySQL: el repositorio y la bitácora se reemplazan por dobles en memoria, de modo que se prueban las
 * reglas del service (el cierre, la reparación, la baja y la incidencia en una transacción las cubre la prueba contra la base).
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const dia = (desplazamiento = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + desplazamiento)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const base = () => ({
  prestamo: { id: 7, herramienta_id: 1, trabajador_id: 3, proyecto_id: 2, estado_prestamo: 'ACTIVO', fecha_prestamo: `${dia(-10)} 08:00:00` },
  herramienta: { id: 1, nombre: 'Taladro', codigo_serial: 'HR-1', estado_operativo: 'BUENO' },
})
const estado = { datos: base(), llamadas: [], bitacora: [] }

mock.module('../src/repositories/prestamoHerramientaRepository.js', {
  namedExports: {
    findById: async (id) => ({ id: Number(id), herramienta: 'Taladro', estado_prestamo: 'DEVUELTO' }),
    listar: async () => [],
    reemplazosDisponibles: async () => [],
    reemplazar: async () => ({}),
    entregar: async () => ({}),
    devolver: async (datos) => {
      const incidencia = datos.validar(estado.datos)
      estado.llamadas.push({ ...datos, incidencia })
      return { incidenciaId: incidencia ? 55 : null, prestamo: estado.datos.prestamo, herramienta: estado.datos.herramienta }
    },
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const { registrarDevolucion } = await import('../src/services/prestamoHerramientaService.js')

const ctx = { usuario: { id: 2, rol: 'ENCARGADO_BODEGA' }, usuarioId: 2, ip: '127.0.0.1' }
const cuerpo = (extra = {}) => ({ condicion: 'BUENO', ...extra })

beforeEach(() => {
  estado.datos = base()
  estado.llamadas = []
  estado.bitacora = []
})

describe('HU-12 · condición y fecha real (criterio 1)', () => {
  test('principal: registra la condición de entrada y usa la fecha actual si no se indica', async () => {
    const r = await registrarDevolucion(7, cuerpo(), ctx)
    assert.equal(r.incidencia_id, null)
    assert.equal(estado.llamadas[0].condicion, 'BUENO')
    assert.equal(estado.llamadas[0].fechaReal, null)
    assert.equal(estado.bitacora[0].accion, 'DEVOLVER_HERRAMIENTA')
  })

  test('acepta todas las condiciones y rechaza una desconocida', async () => {
    for (const condicion of ['EXCELENTE', 'BUENO', 'REGULAR', 'excelente']) {
      await registrarDevolucion(7, cuerpo({ condicion }), ctx)
    }
    await assert.rejects(() => registrarDevolucion(7, cuerpo({ condicion: 'MALA' }), ctx), { statusCode: 400, campo: 'condicion' })
    await assert.rejects(() => registrarDevolucion(7, cuerpo({ condicion: undefined }), ctx), { statusCode: 400, campo: 'condicion' })
  })

  test('una fecha pasada se registra ese día al mediodía; hoy equivale a ahora', async () => {
    await registrarDevolucion(7, cuerpo({ fecha_real_devolucion: dia(-2) }), ctx)
    assert.equal(estado.llamadas[0].fechaReal, `${dia(-2)} 12:00:00`)
    await registrarDevolucion(7, cuerpo({ fecha_real_devolucion: dia(0) }), ctx)
    assert.equal(estado.llamadas[1].fechaReal, null)
  })

  test('la fecha no puede ser futura, anterior al préstamo ni inválida', async () => {
    await assert.rejects(() => registrarDevolucion(7, cuerpo({ fecha_real_devolucion: dia(1) }), ctx), { statusCode: 400, campo: 'fecha_real_devolucion' })
    await assert.rejects(() => registrarDevolucion(7, cuerpo({ fecha_real_devolucion: dia(-11) }), ctx), { statusCode: 400, campo: 'fecha_real_devolucion' })
    await assert.rejects(() => registrarDevolucion(7, cuerpo({ fecha_real_devolucion: 'ayer' }), ctx), { statusCode: 400, campo: 'fecha_real_devolucion' })
  })
})

describe('HU-12 · dañada o perdida (criterio 2)', () => {
  test('dañada exige una observación', async () => {
    await assert.rejects(() => registrarDevolucion(7, cuerpo({ condicion: 'DANIADA', observaciones: '  ' }), ctx), { statusCode: 400, campo: 'observaciones' })
    await assert.rejects(() => registrarDevolucion(7, cuerpo({ condicion: 'DANIADA' }), ctx), { statusCode: 400, campo: 'observaciones' })
    assert.equal(estado.llamadas.length, 0)
  })

  test('dañada genera una incidencia de avería', async () => {
    const r = await registrarDevolucion(7, cuerpo({ condicion: 'DANIADA', observaciones: 'Mandril roto' }), ctx)
    assert.equal(r.incidencia_id, 55)
    assert.equal(estado.llamadas[0].incidencia.tipo, 'AVERIA')
    assert.match(estado.llamadas[0].incidencia.titulo, /dañada: Taladro \(HR-1\)/)
    assert.equal(estado.bitacora[0].detalles.incidencia_id, 55)
  })

  test('perdida exige observación y genera una incidencia de severidad alta', async () => {
    await assert.rejects(() => registrarDevolucion(7, cuerpo({ condicion: 'PERDIDA' }), ctx), { statusCode: 400, campo: 'observaciones' })
    await registrarDevolucion(7, cuerpo({ condicion: 'PERDIDA', observaciones: 'Se extravió en la obra' }), ctx)
    assert.equal(estado.llamadas[0].incidencia.tipo, 'ACCIDENTE')
    assert.equal(estado.llamadas[0].incidencia.severidad, 'ALTA')
  })

  test('una devolución en buen estado no genera incidencia', async () => {
    for (const condicion of ['EXCELENTE', 'BUENO', 'REGULAR']) await registrarDevolucion(7, cuerpo({ condicion }), ctx)
    assert.ok(estado.llamadas.every((l) => l.incidencia === null))
  })
})

describe('HU-12 · cierre del préstamo (criterio 3)', () => {
  test('solo se devuelve un préstamo vigente', async () => {
    for (const e of ['ACTIVO', 'ATRASADO', 'CON_NOVEDAD']) {
      estado.datos.prestamo.estado_prestamo = e
      await registrarDevolucion(7, cuerpo(), ctx)
    }
    estado.datos.prestamo.estado_prestamo = 'DEVUELTO'
    await assert.rejects(() => registrarDevolucion(7, cuerpo(), ctx), { statusCode: 409 })
  })

  test('rechaza un préstamo o una herramienta inexistentes y un id inválido', async () => {
    estado.datos.prestamo = null
    await assert.rejects(() => registrarDevolucion(7, cuerpo(), ctx), { statusCode: 404 })
    estado.datos = base(); estado.datos.herramienta = null
    await assert.rejects(() => registrarDevolucion(7, cuerpo(), ctx), { statusCode: 404 })
    await assert.rejects(() => registrarDevolucion('x', cuerpo(), ctx), { statusCode: 400 })
  })
})

describe('HU-12 · quien recibe (criterio 4)', () => {
  test('registra al usuario que recibe la devolución', async () => {
    await registrarDevolucion(7, cuerpo(), ctx)
    assert.equal(estado.llamadas[0].usuarioId, 2)
    assert.equal(estado.bitacora[0].usuarioId, 2)
  })
})
