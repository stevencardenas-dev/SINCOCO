/**
 * HU-37: cambio de estado operativo de herramientas (pruebas unitarias del backend).
 *
 * Corren sin MySQL: los repositorios y la bitácora se reemplazan por dobles en memoria, de modo que se prueban las
 * reglas del service (la transacción con bloqueo la cubre la prueba contra la base).
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const base = () => ({
  herramienta: { id: 1, activo: 1, disponibilidad: 'DISPONIBLE', estado_operativo: 'BUENO' },
  abierta: null,
  prestada: false,
})
const estado = { datos: base(), plan: null, bitacora: [], existe: true }

mock.module('../src/repositories/herramientaEstadoRepository.js', {
  namedExports: {
    listarReparaciones: async () => [{ id: 1 }],
    cambiarEstado: async (id, usuarioId, decidir) => {
      const { herramienta, abierta, prestada } = estado.datos
      const plan = decidir(estado.existe ? herramienta : null, abierta, prestada)
      estado.plan = plan
      return { anterior: herramienta.estado_operativo, plan }
    },
  },
})
mock.module('../src/repositories/herramientaRepository.js', {
  namedExports: { findById: async (id) => (estado.existe ? { id: Number(id), ...estado.datos.herramienta } : null) },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const { cambiarEstado, historialReparaciones } = await import('../src/services/herramientaEstadoService.js')

const ctx = { usuario: { id: 2, rol: 'ENCARGADO_BODEGA' }, usuarioId: 2, ip: '127.0.0.1' }
const enReparacion = () => {
  estado.datos.herramienta = { id: 1, activo: 1, disponibilidad: 'DISPONIBLE', estado_operativo: 'EN_MANTENIMIENTO' }
  estado.datos.abierta = { id: 4, estado_previo: 'REGULAR', fecha_ingreso: '2026-11-01 08:00:00' }
}
const rechaza = (promesa, estatus, texto) =>
  assert.rejects(promesa, (e) => e.statusCode === estatus && (!texto || texto.test(e.message)))

beforeEach(() => {
  estado.datos = base()
  estado.plan = null
  estado.bitacora = []
  estado.existe = true
})

describe('HU-37 · cambios permitidos', () => {
  test('principal: disponible -> en reparación abre una reparación y queda en bitácora', async () => {
    await cambiarEstado(1, { accion: 'EN_REPARACION', motivo: 'El motor hace ruido' }, ctx)
    assert.equal(estado.plan.nuevaReparacion, true)
    assert.equal(estado.plan.estadoOperativo, 'EN_MANTENIMIENTO')
    assert.equal(estado.bitacora[0].accion, 'HERRAMIENTA_EN_REPARACION')
    assert.equal(estado.bitacora[0].detalles.motivo, 'El motor hace ruido')
  })

  test('Alt. 2: en reparación -> disponible cierra la reparación con costo y recupera el estado previo', async () => {
    enReparacion()
    await cambiarEstado(1, { accion: 'DISPONIBLE', motivo: 'Cambio de carbones', costo: 45000 }, ctx)
    assert.equal(estado.plan.cerrarReparacion, true)
    assert.equal(estado.plan.costo, 45000)
    assert.equal(estado.plan.estadoOperativo, 'REGULAR')
    assert.equal(estado.bitacora[0].accion, 'HERRAMIENTA_DISPONIBLE')
  })

  test('al volver de reparación sin estado previo prestable queda en BUENO', async () => {
    enReparacion()
    estado.datos.abierta.estado_previo = 'DANIADA'
    await cambiarEstado(1, { accion: 'DISPONIBLE', motivo: 'Reparada' }, ctx)
    assert.equal(estado.plan.estadoOperativo, 'BUENO')
  })

  test('cualquiera -> de baja aplica la baja lógica; si estaba en reparación la cierra', async () => {
    await cambiarEstado(1, { accion: 'DE_BAJA', motivo: 'Obsoleta' }, ctx)
    assert.equal(estado.plan.baja, true)
    assert.equal(estado.plan.cerrarReparacion, false)
    assert.equal(estado.bitacora[0].detalles.a, 'BAJA')

    enReparacion()
    await cambiarEstado(1, { accion: 'DE_BAJA', motivo: 'No tiene arreglo' }, ctx)
    assert.equal(estado.plan.cerrarReparacion, true)
  })

  test('el costo solo se registra al salir de reparación', async () => {
    await cambiarEstado(1, { accion: 'EN_REPARACION', motivo: 'Falla', costo: 999 }, ctx)
    assert.equal(estado.bitacora[0].detalles.costo, null)
  })
})

describe('HU-37 · validaciones', () => {
  test('criterio 1: la acción debe ser válida y todo cambio exige motivo', async () => {
    await rechaza(cambiarEstado(1, { accion: 'PRESTAR', motivo: 'x' }, ctx), 400, /accion/)
    await rechaza(cambiarEstado(1, { motivo: 'x' }, ctx), 400, /accion/)
    await rechaza(cambiarEstado(1, { accion: 'EN_REPARACION' }, ctx), 400, /motivo/)
    await rechaza(cambiarEstado(1, { accion: 'DE_BAJA', motivo: '   ' }, ctx), 400, /motivo/)
    await rechaza(cambiarEstado(1, { accion: 'DE_BAJA', motivo: 'x'.repeat(501) }, ctx), 400)
  })

  test('criterio 1: no se repara lo ya reparado ni se habilita lo que no está en reparación', async () => {
    enReparacion()
    await rechaza(cambiarEstado(1, { accion: 'EN_REPARACION', motivo: 'x' }, ctx), 409, /ya está en reparación/)
    estado.datos = base()
    await rechaza(cambiarEstado(1, { accion: 'DISPONIBLE', motivo: 'x' }, ctx), 409, /en reparación/)
  })

  test('Alt. 1 · criterio 2: con préstamo vigente exige registrar primero la devolución', async () => {
    estado.datos.prestada = true
    await rechaza(cambiarEstado(1, { accion: 'EN_REPARACION', motivo: 'x' }, ctx), 409, /devolución/)
    estado.datos = base()
    estado.datos.herramienta.disponibilidad = 'PRESTADA'
    await rechaza(cambiarEstado(1, { accion: 'DE_BAJA', motivo: 'x' }, ctx), 409, /devolución/)
    assert.equal(estado.bitacora.length, 0)
  })

  test('Alt. 3 · criterio 5: la baja es definitiva', async () => {
    estado.datos.herramienta = { id: 1, activo: 0, disponibilidad: 'BAJA', estado_operativo: 'BUENO' }
    for (const accion of ['EN_REPARACION', 'DISPONIBLE', 'DE_BAJA']) {
      await rechaza(cambiarEstado(1, { accion, motivo: 'x' }, ctx), 409, /definitiva/)
    }
  })

  test('una herramienta en traslado no cambia de estado', async () => {
    estado.datos.herramienta.disponibilidad = 'EN_TRASLADO'
    await rechaza(cambiarEstado(1, { accion: 'EN_REPARACION', motivo: 'x' }, ctx), 409, /traslado/)
  })

  test('una herramienta inexistente responde 404', async () => {
    estado.existe = false
    await rechaza(cambiarEstado(99, { accion: 'EN_REPARACION', motivo: 'x' }, ctx), 404)
  })
})

describe('HU-37 · fecha de salida (criterio 4)', () => {
  const dia = (desplazamiento) => {
    const d = new Date()
    d.setDate(d.getDate() + desplazamiento)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  test('no puede ser futura ni anterior al ingreso, y debe ser una fecha válida', async () => {
    enReparacion()
    await rechaza(cambiarEstado(1, { accion: 'DISPONIBLE', motivo: 'x', fecha_salida: dia(2) }, ctx), 400, /posterior a hoy/)
    await rechaza(cambiarEstado(1, { accion: 'DISPONIBLE', motivo: 'x', fecha_salida: '2026-10-01' }, ctx), 400, /anterior/)
    await rechaza(cambiarEstado(1, { accion: 'DISPONIBLE', motivo: 'x', fecha_salida: 'mañana' }, ctx), 400, /fecha de salida/)
  })

  test('un día pasado se guarda al mediodía y hoy usa el momento actual', async () => {
    enReparacion()
    estado.datos.abierta.fecha_ingreso = `${dia(-5)} 08:00:00`
    await cambiarEstado(1, { accion: 'DISPONIBLE', motivo: 'x', fecha_salida: dia(-2) }, ctx)
    assert.equal(estado.plan.fechaSalida, `${dia(-2)} 12:00:00`)
    await cambiarEstado(1, { accion: 'DISPONIBLE', motivo: 'x', fecha_salida: dia(0) }, ctx)
    assert.equal(estado.plan.fechaSalida, null)
  })
})

describe('HU-37 · historial de reparaciones', () => {
  test('lista las reparaciones de una herramienta existente', async () => {
    assert.equal((await historialReparaciones(1)).length, 1)
  })

  test('una herramienta inexistente responde 404', async () => {
    estado.existe = false
    await rechaza(historialReparaciones(99), 404)
  })
})
