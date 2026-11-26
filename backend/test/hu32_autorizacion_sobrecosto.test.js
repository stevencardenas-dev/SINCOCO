/**
 * HU-32: notificación y autorización por sobrecosto de un servicio externo
 * (pruebas unitarias).
 *
 * Corren sin MySQL: los repositorios y la bitácora se reemplazan por dobles en
 * memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { servicios: [], actividad: null, bitacora: [], notificados: [], valorAplicado: null }

mock.module('../src/repositories/servicioExternoRepository.js', {
  namedExports: {
    findById: async (id) => estado.servicios.find((s) => Number(s.id) === Number(id)) ?? null,
    totalContratadoActividad: async () => estado.comprometido ?? 0,
    decidirAutorizacion: async (id, { estado: nuevo, usuarioId, observacion }) => {
      const servicio = estado.servicios.find((s) => Number(s.id) === Number(id))
      if (!servicio || servicio.autorizacion_estado !== 'PENDIENTE') return false
      Object.assign(servicio, {
        autorizacion_estado: nuevo,
        autorizado_por_usuario_id: usuarioId,
        autorizado_en: '2026-11-26 10:00:00',
        observacion_autorizacion: observacion ?? null,
      })
      return true
    },
    actualizarValor: async (id, { valorContratado, autorizacion, exceso }) => {
      const servicio = estado.servicios.find((s) => Number(s.id) === Number(id))
      Object.assign(servicio, {
        valor_contratado: valorContratado,
        autorizacion_estado: autorizacion,
        exceso_presupuesto: exceso,
        autorizado_por_usuario_id: null,
        autorizado_en: null,
        observacion_autorizacion: null,
      })
      estado.valorAplicado = { valorContratado, autorizacion, exceso }
    },
    notificarGerentes: async (aviso) => {
      estado.notificados.push(aviso)
      return 2
    },
  },
})
mock.module('../src/repositories/actividadRepository.js', {
  namedExports: { findById: async () => estado.actividad },
})
mock.module('../src/repositories/proveedorRepository.js', { namedExports: { findById: async () => null } })
mock.module('../src/repositories/proyectoRepository.js', { namedExports: { findById: async () => null } })
mock.module('../src/services/accesoService.js', {
  namedExports: {
    alcanceDeUsuario: async () => ({ total: true, trabajadorId: null }),
    verificarAccesoProyecto: async () => ({}),
  },
})
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (evento) => { estado.bitacora.push(evento) } },
})

const { evaluarPresupuesto, autorizarServicio, rechazarServicio, reajustarValor } = await import(
  '../src/services/servicioExternoService.js'
)

const servicio = (extra = {}) => ({
  id: 1,
  nombre_servicio: 'Transporte de escombros',
  proveedor_nombre: 'Transportes Andinos',
  proyecto_codigo: 'PR-01',
  proyecto_nombre: 'Torre Norte',
  actividad_id: 10,
  actividad_nombre: 'Excavación',
  valor_contratado: 6000000,
  exceso_presupuesto: 1000000,
  estado: 'PROGRAMADO',
  autorizacion_estado: 'PENDIENTE',
  autorizado_por_usuario_id: null,
  autorizado_en: null,
  observacion_autorizacion: null,
  ...extra,
})

const ctx = { usuarioId: 5, ip: '127.0.0.1' }

beforeEach(() => {
  estado.servicios = [servicio()]
  estado.actividad = { id: 10, nombre: 'Excavación', presupuesto: 5000000 }
  estado.comprometido = 0
  estado.bitacora = []
  estado.notificados = []
  estado.valorAplicado = null
})

describe('evaluarPresupuesto', () => {
  test('calcula el exceso en pesos sin perder centavos', () => {
    assert.deepEqual(evaluarPresupuesto(1000000, 250000, 1000000), {
      aplica: true,
      disponible: 750000,
      exceso: 250000,
    })
    assert.equal(evaluarPresupuesto(100, 99.9, 0.1).exceso, 0)
  })

  test('una actividad sin presupuesto nunca genera exceso', () => {
    assert.deepEqual(evaluarPresupuesto(null, 0, 999999999), { aplica: false, disponible: null, exceso: 0 })
  })
})

describe('autorizarServicio', () => {
  test('autoriza el servicio pendiente y deja la decisión en la bitácora', async () => {
    const r = await autorizarServicio(1, { observacion: 'Aprobado por gerencia' }, ctx)

    assert.equal(r.autorizacion_estado, 'AUTORIZADA')
    assert.equal(r.autorizado_por_usuario_id, 5)
    assert.equal(r.observacion_autorizacion, 'Aprobado por gerencia')
    assert.ok(r.autorizado_en)
    assert.equal(estado.bitacora[0].accion, 'AUTORIZAR_SOBRECOSTO')
  })

  test('no autoriza un servicio que no está pendiente', async () => {
    estado.servicios = [servicio({ autorizacion_estado: 'AUTORIZADA' })]
    await assert.rejects(() => autorizarServicio(1, {}, ctx), (e) => e.statusCode === 409)
  })

  test('responde 404 si el servicio no existe', async () => {
    await assert.rejects(() => autorizarServicio(99, {}, ctx), (e) => e.statusCode === 404)
  })
})

describe('rechazarServicio', () => {
  test('exige una observación para el reajuste', async () => {
    await assert.rejects(
      () => rechazarServicio(1, { observacion: '   ' }, ctx),
      (e) => e.statusCode === 400 && e.campo === 'observacion',
    )
    assert.equal(estado.servicios[0].autorizacion_estado, 'PENDIENTE')
  })

  test('rechaza y registra usuario, fecha y observación', async () => {
    const r = await rechazarServicio(1, { observacion: 'Ajuste el valor a 4.5M' }, ctx)

    assert.equal(r.autorizacion_estado, 'RECHAZADA')
    assert.equal(r.observacion_autorizacion, 'Ajuste el valor a 4.5M')
    assert.equal(estado.bitacora[0].accion, 'RECHAZAR_SOBRECOSTO')
  })

  test('no rechaza dos veces el mismo servicio', async () => {
    await rechazarServicio(1, { observacion: 'Ajuste' }, ctx)
    await assert.rejects(() => rechazarServicio(1, { observacion: 'Otra vez' }, ctx), (e) => e.statusCode === 409)
  })
})

describe('reajustarValor', () => {
  test('si el nuevo monto ya cabe en el presupuesto, se confirma sin autorización', async () => {
    const r = await reajustarValor(1, { valor_contratado: 4500000 }, ctx)

    assert.equal(r.valor_contratado, 4500000)
    assert.equal(r.autorizacion_estado, 'NO_REQUIERE')
    assert.equal(r.exceso_presupuesto, 0)
    assert.equal(estado.notificados.length, 0)
    assert.equal(estado.bitacora[0].accion, 'REAJUSTAR_SOBRECOSTO')
  })

  test('si sigue excediendo, vuelve a quedar pendiente y notifica al gerente', async () => {
    estado.actividad = { id: 10, nombre: 'Excavación', presupuesto: 3000000 }
    const r = await reajustarValor(1, { valor_contratado: 3500000 }, ctx)

    assert.equal(r.autorizacion_estado, 'PENDIENTE')
    assert.equal(r.exceso_presupuesto, 500000)
    assert.equal(estado.notificados.length, 1)
    assert.equal(estado.notificados[0].servicioId, 1)
  })

  test('solo reajusta un servicio pendiente o rechazado', async () => {
    estado.servicios = [servicio({ autorizacion_estado: 'AUTORIZADA' })]
    await assert.rejects(
      () => reajustarValor(1, { valor_contratado: 100 }, ctx),
      (e) => e.statusCode === 409,
    )
  })

  test('rechaza montos que no son mayores que cero', async () => {
    for (const valor of [0, -5, 'mucho']) {
      await assert.rejects(
        () => reajustarValor(1, { valor_contratado: valor }, ctx),
        (e) => e.statusCode === 400 && e.campo === 'valor_contratado',
      )
    }
  })
})
