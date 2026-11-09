/**
 * HU-37: mantenimiento y cambio de estado de herramientas (pruebas unitarias del backend).
 *
 * Corren sin MySQL: los repositorios y la bitácora se reemplazan por dobles en
 * memoria; el doble de `cambiarEstado` ejecuta la decisión del service con la
 * herramienta, la reparación abierta y el préstamo vigente en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { herramienta: null, abierta: null, prestada: false, planes: [], bitacora: [] }

mock.module('../src/repositories/herramientaEstadoRepository.js', {
  namedExports: {
    listarReparaciones: async () => (estado.abierta ? [estado.abierta] : []),
    cambiarEstado: async (id, usuarioId, decidir) => {
      const h = estado.herramienta?.id === Number(id) ? estado.herramienta : null
      const plan = decidir(h, estado.abierta, estado.prestada)
      estado.planes.push({ ...plan, usuarioId })
      return { anterior: h.estado_operativo, plan }
    },
  },
})
mock.module('../src/repositories/herramientaRepository.js', {
  namedExports: { findById: async (id) => (estado.herramienta?.id === Number(id) ? estado.herramienta : null) },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const { cambiarEstado, historialReparaciones } = await import('../src/services/herramientaEstadoService.js')

const ctx = { usuarioId: 4, ip: '127.0.0.1' }
const dia = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const enReparacion = () => {
  estado.herramienta.estado_operativo = 'EN_MANTENIMIENTO'
  estado.abierta = { id: 1, estado_previo: 'REGULAR', fecha_ingreso: dia(-3) }
}

beforeEach(() => {
  estado.herramienta = { id: 20, activo: 1, disponibilidad: 'DISPONIBLE', estado_operativo: 'BUENO' }
  estado.abierta = null
  estado.prestada = false
  estado.planes = []
  estado.bitacora = []
})

describe('HU-37 · mantenimiento y estado de herramientas', () => {
  test('principal / criterio 1: disponible → en reparación abre una reparación', async () => {
    await cambiarEstado(20, { accion: 'en_reparacion', motivo: 'Motor recalentado' }, ctx)
    assert.deepEqual(estado.planes[0], { nuevaReparacion: true, motivo: 'Motor recalentado', estadoOperativo: 'EN_MANTENIMIENTO', usuarioId: 4 })
  })

  test('criterio 1: todo cambio exige un motivo y una acción válida', async () => {
    await assert.rejects(() => cambiarEstado(20, { accion: 'EN_REPARACION', motivo: '   ' }, ctx), { statusCode: 400 })
    await assert.rejects(() => cambiarEstado(20, { accion: 'PRESTADA', motivo: 'x' }, ctx), { statusCode: 400 })
    await assert.rejects(() => cambiarEstado(20, { accion: 'DE_BAJA', motivo: 'x'.repeat(501) }, ctx), { statusCode: 400 })
    assert.equal(estado.planes.length, 0)
  })

  test('criterio 1: no se envía a reparación una herramienta que ya está en reparación', async () => {
    enReparacion()
    await assert.rejects(() => cambiarEstado(20, { accion: 'EN_REPARACION', motivo: 'x' }, ctx), { statusCode: 409 })
  })

  test('criterio 1: solo una herramienta en reparación vuelve a disponible', async () => {
    await assert.rejects(() => cambiarEstado(20, { accion: 'DISPONIBLE', motivo: 'x' }, ctx), { statusCode: 409 })
  })

  test('criterio 1: cualquier estado → de baja; si estaba en reparación la cierra', async () => {
    await cambiarEstado(20, { accion: 'DE_BAJA', motivo: 'Irreparable' }, ctx)
    assert.equal(estado.planes[0].baja, true)
    assert.equal(estado.planes[0].cerrarReparacion, false)
    enReparacion()
    await cambiarEstado(20, { accion: 'DE_BAJA', motivo: 'Irreparable' }, ctx)
    assert.equal(estado.planes[1].cerrarReparacion, true)
  })

  test('alternativo 1 / criterio 2: con préstamo vigente se exige registrar primero la devolución', async () => {
    estado.prestada = true
    await assert.rejects(() => cambiarEstado(20, { accion: 'EN_REPARACION', motivo: 'x' }, ctx), { statusCode: 409 })
    estado.prestada = false
    estado.herramienta.disponibilidad = 'PRESTADA'
    await assert.rejects(() => cambiarEstado(20, { accion: 'DE_BAJA', motivo: 'x' }, ctx), { statusCode: 409 })
  })

  test('una herramienta en traslado no cambia de estado', async () => {
    estado.herramienta.disponibilidad = 'EN_TRASLADO'
    await assert.rejects(() => cambiarEstado(20, { accion: 'EN_REPARACION', motivo: 'x' }, ctx), { statusCode: 409 })
  })

  test('alternativo 2 / criterio 4: fin de reparación con fecha y costo opcional vuelve al estado previo', async () => {
    enReparacion()
    await cambiarEstado(20, { accion: 'DISPONIBLE', motivo: 'Reparada', costo: '150000.50', fecha_salida: dia(-1) }, ctx)
    const p = estado.planes[0]
    assert.equal(p.cerrarReparacion, true)
    assert.equal(p.costo, 150000.5)
    assert.equal(p.fechaSalida, `${dia(-1)} 12:00:00`)
    assert.equal(p.estadoOperativo, 'REGULAR')
  })

  test('alternativo 2: sin fecha ni costo la salida es ahora y sin estado previo prestable queda BUENO', async () => {
    enReparacion()
    estado.abierta.estado_previo = 'MALO'
    await cambiarEstado(20, { accion: 'DISPONIBLE', motivo: 'Reparada' }, ctx)
    assert.deepEqual([estado.planes[0].costo, estado.planes[0].fechaSalida, estado.planes[0].estadoOperativo], [null, null, 'BUENO'])
  })

  test('criterio 4: la fecha de salida no puede ser futura ni anterior al ingreso, y el costo no es negativo', async () => {
    enReparacion()
    await assert.rejects(() => cambiarEstado(20, { accion: 'DISPONIBLE', motivo: 'x', fecha_salida: dia(1) }, ctx), { statusCode: 400 })
    await assert.rejects(() => cambiarEstado(20, { accion: 'DISPONIBLE', motivo: 'x', fecha_salida: dia(-5) }, ctx), { statusCode: 400 })
    await assert.rejects(() => cambiarEstado(20, { accion: 'DISPONIBLE', motivo: 'x', costo: -1 }, ctx), { statusCode: 400 })
    assert.equal(estado.planes.length, 0)
  })

  test('alternativo 3 / criterio 5: la baja es definitiva', async () => {
    for (const h of [{ activo: 0 }, { disponibilidad: 'BAJA' }]) {
      Object.assign(estado.herramienta, { activo: 1, disponibilidad: 'DISPONIBLE' }, h)
      for (const accion of ['EN_REPARACION', 'DISPONIBLE', 'DE_BAJA']) {
        await assert.rejects(() => cambiarEstado(20, { accion, motivo: 'x' }, ctx), { statusCode: 409 })
      }
    }
  })

  test('criterio 6: cada cambio queda en la bitácora con estado anterior, nuevo y motivo', async () => {
    await cambiarEstado(20, { accion: 'EN_REPARACION', motivo: 'Motor' }, ctx)
    await cambiarEstado(20, { accion: 'DE_BAJA', motivo: 'Irreparable' }, ctx)
    assert.deepEqual(estado.bitacora.map((b) => [b.accion, b.detalles.de, b.detalles.a, b.detalles.motivo]), [
      ['HERRAMIENTA_EN_REPARACION', 'BUENO', 'EN_MANTENIMIENTO', 'Motor'],
      ['HERRAMIENTA_DE_BAJA', 'BUENO', 'BAJA', 'Irreparable'],
    ])
  })

  test('criterio 4: historial de reparaciones; herramienta inexistente da 404', async () => {
    enReparacion()
    assert.equal((await historialReparaciones(20)).length, 1)
    await assert.rejects(() => historialReparaciones(99), { statusCode: 404 })
    await assert.rejects(() => cambiarEstado(99, { accion: 'DE_BAJA', motivo: 'x' }, ctx), { statusCode: 404 })
  })
})
