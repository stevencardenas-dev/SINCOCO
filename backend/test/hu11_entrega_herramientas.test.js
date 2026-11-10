/**
 * HU-11: entrega de herramientas a trabajadores (pruebas unitarias del backend).
 *
 * Corren sin MySQL: el repositorio de préstamos y la bitácora se reemplazan por
 * dobles en memoria; el doble de `entregar` ejecuta la validación del service
 * con la solicitud y la herramienta en memoria, como hace el repositorio real.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { solicitud: null, herramienta: null, prestamos: [], bitacora: [] }

mock.module('../src/repositories/prestamoHerramientaRepository.js', {
  namedExports: {
    listar: async () => estado.prestamos,
    findById: async (id) => estado.prestamos.find((p) => p.id === id) ?? null,
    entregar: async ({ solicitudId, usuarioId, observaciones, validar }) => {
      const sol = estado.solicitud?.id === solicitudId ? estado.solicitud : null
      const herr = sol ? estado.herramienta : null
      const fechaDevolucion = await validar(sol, herr)
      const id = estado.prestamos.length + 1
      estado.prestamos.push({
        id, solicitud_id: sol.id, herramienta_id: sol.herramienta_id, trabajador_id: sol.para_trabajador_id,
        proyecto_id: sol.proyecto_id, entregado_por_usuario_id: usuarioId, fecha_prestamo: new Date(),
        fecha_estimada_devolucion: fechaDevolucion, estado_entrega: herr.estado_operativo,
        observaciones_entrega: observaciones, estado_prestamo: 'ACTIVO',
      })
      herr.disponibilidad = 'PRESTADA'
      sol.estado = 'ENTREGADA'
      return { id, solicitud: sol, herramienta: herr }
    },
    reemplazosDisponibles: async () => [],
    reemplazar: async () => ({}),
    devolver: async () => ({}),
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const { registrarEntrega } = await import('../src/services/prestamoHerramientaService.js')

const ctx = { usuarioId: 9, ip: '127.0.0.1' }
const dia = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

beforeEach(() => {
  estado.solicitud = { id: 1, estado: 'APROBADA', herramienta_id: 20, para_trabajador_id: 3, proyecto_id: 1, fecha_estimada_devolucion: dia(5) }
  estado.herramienta = { id: 20, activo: 1, disponibilidad: 'DISPONIBLE', estado_operativo: 'BUENO' }
  estado.prestamos = []
  estado.bitacora = []
})

describe('HU-11 · entrega de herramientas', () => {
  test('criterio 1: el préstamo registra herramienta, trabajador, proyecto, quién entrega y la fecha', async () => {
    const p = await registrarEntrega({ solicitud_id: 1 }, ctx)
    assert.equal(p.herramienta_id, 20)
    assert.equal(p.trabajador_id, 3)
    assert.equal(p.proyecto_id, 1)
    assert.equal(p.entregado_por_usuario_id, 9)
    assert.ok(p.fecha_prestamo instanceof Date)
  })

  test('criterio 2: al registrarse el préstamo la herramienta pasa a PRESTADA', async () => {
    await registrarEntrega({ solicitud_id: 1 }, ctx)
    assert.equal(estado.herramienta.disponibilidad, 'PRESTADA')
    assert.equal(estado.solicitud.estado, 'ENTREGADA')
  })

  test('criterio 3: sin fecha en el cuerpo se toma la fecha estimada de la solicitud', async () => {
    assert.equal((await registrarEntrega({ solicitud_id: 1 }, ctx)).fecha_estimada_devolucion, dia(5))
  })

  test('criterio 3: la fecha del cuerpo reemplaza a la de la solicitud', async () => {
    assert.equal((await registrarEntrega({ solicitud_id: 1, fecha_estimada_devolucion: dia(10) }, ctx)).fecha_estimada_devolucion, dia(10))
  })

  test('criterio 3: la fecha estimada de devolución es obligatoria', async () => {
    estado.solicitud.fecha_estimada_devolucion = null
    await assert.rejects(() => registrarEntrega({ solicitud_id: 1 }, ctx), { statusCode: 400 })
    assert.equal(estado.prestamos.length, 0)
  })

  test('criterio 3: la fecha estimada no puede ser anterior a hoy ni tener formato inválido', async () => {
    await assert.rejects(() => registrarEntrega({ solicitud_id: 1, fecha_estimada_devolucion: dia(-1) }, ctx), { statusCode: 400 })
    await assert.rejects(() => registrarEntrega({ solicitud_id: 1, fecha_estimada_devolucion: 'mañana' }, ctx), { statusCode: 400 })
    assert.equal(estado.prestamos.length, 0)
  })

  test('criterio 4: deja constancia de la condición de entrega y las observaciones', async () => {
    estado.herramienta.estado_operativo = 'REGULAR'
    const p = await registrarEntrega({ solicitud_id: 1, observaciones: '  Mango con desgaste  ' }, ctx)
    assert.equal(p.estado_entrega, 'REGULAR')
    assert.equal(p.observaciones_entrega, 'Mango con desgaste')
    assert.equal(estado.bitacora[0].accion, 'ENTREGAR_HERRAMIENTA')
    assert.equal(estado.bitacora[0].detalles.estado_entrega, 'REGULAR')
  })

  test('las observaciones no superan 500 caracteres', async () => {
    await assert.rejects(() => registrarEntrega({ solicitud_id: 1, observaciones: 'x'.repeat(501) }, ctx), { statusCode: 400 })
  })

  test('alternativo: no se entrega una herramienta prestada, en traslado o en mantenimiento', async () => {
    for (const cambio of [{ disponibilidad: 'PRESTADA' }, { disponibilidad: 'EN_TRASLADO' }, { estado_operativo: 'EN_MANTENIMIENTO' }]) {
      Object.assign(estado.herramienta, { disponibilidad: 'DISPONIBLE', estado_operativo: 'BUENO' }, cambio)
      await assert.rejects(() => registrarEntrega({ solicitud_id: 1 }, ctx), { statusCode: 409 })
    }
    assert.equal(estado.prestamos.length, 0)
  })

  test('alternativo: no se entrega una herramienta dada de baja', async () => {
    estado.herramienta.activo = 0
    await assert.rejects(() => registrarEntrega({ solicitud_id: 1 }, ctx), { statusCode: 404 })
  })

  test('solo se entrega una solicitud APROBADA', async () => {
    for (const e of ['PENDIENTE', 'RECHAZADA', 'ENTREGADA']) {
      estado.solicitud.estado = e
      await assert.rejects(() => registrarEntrega({ solicitud_id: 1 }, ctx), { statusCode: 409 })
    }
  })

  test('la solicitud es obligatoria y debe existir', async () => {
    await assert.rejects(() => registrarEntrega({}, ctx), { statusCode: 400 })
    await assert.rejects(() => registrarEntrega({ solicitud_id: 99 }, ctx), { statusCode: 404 })
  })
})
