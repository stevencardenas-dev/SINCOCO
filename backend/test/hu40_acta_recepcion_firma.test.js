/**
 * HU-40: acta de recepción de materiales y firma digital (pruebas unitarias).
 *
 * Corren sin MySQL: los repositorios, el alcance del usuario y la bitácora se
 * reemplazan por dobles en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { actas: [], cuenta: null, alertas: [], notificados: [], bitacora: [], consultas: [], firmaAplicada: true }

mock.module('../src/repositories/actaRecepcionRepository.js', {
  namedExports: {
    listar: async (filtros) => {
      estado.consultas.push(filtros)
      return estado.actas
    },
    findById: async (id) => {
      const acta = estado.actas.find((a) => Number(a.id) === Number(id))
      return acta ? JSON.parse(JSON.stringify(acta)) : null
    },
    firmar: async (id, datos) => {
      if (!estado.firmaAplicada) return { aplicada: false, inexistente: false }
      const acta = estado.actas.find((a) => Number(a.id) === Number(id))
      acta.estado = 'FIRMADA'
      acta.firmada_por_usuario_id = datos.usuarioId
      acta.firmada_en = '2026-11-26 11:00:00'
      for (const l of datos.lineas) {
        const linea = acta.detalles.find((d) => Number(d.id) === Number(l.detalle_id))
        linea.cantidad_recibida = l.cantidad_recibida
        linea.observacion = l.observacion
      }
      return { aplicada: true }
    },
    notificarBodega: async (aviso) => {
      estado.notificados.push(aviso)
      return 2
    },
  },
})
mock.module('../src/repositories/usuarioRepository.js', {
  namedExports: { findParaAcceso: async () => estado.cuenta },
})
mock.module('../src/repositories/alertaRepository.js', {
  namedExports: {
    crearSiNoExiste: async (alerta) => {
      estado.alertas.push(alerta)
      return true
    },
  },
})
mock.module('../src/services/accesoService.js', {
  namedExports: { alcanceDeUsuario: async () => ({ total: false, trabajadorId: 44 }) },
})
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (evento) => { estado.bitacora.push(evento) } },
})

const { puedeFirmar, validarLineas, listarActas, firmarActa } = await import('../src/services/actaRecepcionService.js')

const actaBase = () => ({
  id: 3,
  salida_id: 9,
  comprobante: 'SA-00009',
  estado: 'PENDIENTE',
  proyecto: 'Torre Norte',
  proyecto_responsable_id: 44,
  actividad_responsable_id: 45,
  entregado_a_trabajador_id: 46,
  entregado_a: 'Luis Peña',
  firmada_por_usuario_id: null,
  firmada_en: null,
  observaciones: null,
  detalles: [
    {
      id: 1, material: 'Cemento', material_codigo: 'MAT-01', unidad_medida: 'bulto',
      cantidad_despachada: 10, cantidad_recibida: null, observacion: null,
    },
    {
      id: 2, material: 'Arena', material_codigo: 'MAT-02', unidad_medida: 'm3',
      cantidad_despachada: 4, cantidad_recibida: null, observacion: null,
    },
  ],
})

const ctx = { usuarioId: 20, usuario: { id: 20, rol: 'MAESTRO_OBRA' }, ip: '127.0.0.1' }

beforeEach(() => {
  estado.actas = [actaBase()]
  estado.cuenta = { trabajador_id: 46 }
  estado.alertas = []
  estado.notificados = []
  estado.bitacora = []
  estado.consultas = []
  estado.firmaAplicada = true
})

describe('quién puede firmar', () => {
  test('el destinatario de la salida', () => {
    assert.equal(puedeFirmar(actaBase(), 46), true)
  })

  test('el responsable del proyecto o de la actividad', () => {
    assert.equal(puedeFirmar(actaBase(), 44), true)
    assert.equal(puedeFirmar(actaBase(), 45), true)
  })

  test('otra persona no puede, ni alguien sin ficha de trabajador', () => {
    assert.equal(puedeFirmar(actaBase(), 99), false)
    assert.equal(puedeFirmar(actaBase(), null), false)
  })
})

describe('validación de las líneas', () => {
  test('acepta las cantidades iguales a lo despachado sin observación', () => {
    const lineas = validarLineas(actaBase(), [
      { detalle_id: 1, cantidad_recibida: 10 },
      { detalle_id: 2, cantidad_recibida: 4 },
    ])
    assert.deepEqual(lineas, [
      { detalle_id: 1, cantidad_recibida: 10, observacion: null },
      { detalle_id: 2, cantidad_recibida: 4, observacion: null },
    ])
  })

  test('exige la observación cuando la cantidad recibida difiere', () => {
    assert.throws(
      () => validarLineas(actaBase(), [
        { detalle_id: 1, cantidad_recibida: 8 },
        { detalle_id: 2, cantidad_recibida: 4 },
      ]),
      { statusCode: 400, campo: 'observacion_1' },
    )
  })

  test('acepta la diferencia con observación', () => {
    const lineas = validarLineas(actaBase(), [
      { detalle_id: 1, cantidad_recibida: 8, observacion: 'Llegaron dos bultos rotos' },
      { detalle_id: 2, cantidad_recibida: 4 },
    ])
    assert.equal(lineas[0].observacion, 'Llegaron dos bultos rotos')
  })

  test('rechaza líneas faltantes, ajenas o repetidas', () => {
    assert.throws(() => validarLineas(actaBase(), [{ detalle_id: 1, cantidad_recibida: 10 }]), {
      statusCode: 400, campo: 'detalles',
    })
    assert.throws(
      () => validarLineas(actaBase(), [
        { detalle_id: 1, cantidad_recibida: 10 },
        { detalle_id: 2, cantidad_recibida: 4 },
        { detalle_id: 77, cantidad_recibida: 1 },
      ]),
      { statusCode: 400, campo: 'detalles' },
    )
    assert.throws(
      () => validarLineas(actaBase(), [
        { detalle_id: 1, cantidad_recibida: 10 },
        { detalle_id: 1, cantidad_recibida: 10 },
        { detalle_id: 2, cantidad_recibida: 4 },
      ]),
      { statusCode: 400, campo: 'detalles' },
    )
  })

  test('rechaza cantidades negativas', () => {
    assert.throws(
      () => validarLineas(actaBase(), [
        { detalle_id: 1, cantidad_recibida: -1 },
        { detalle_id: 2, cantidad_recibida: 4 },
      ]),
      { statusCode: 400 },
    )
  })
})

describe('listarActas', () => {
  test('valida el estado y pasa los filtros al repositorio', async () => {
    await listarActas({ estado: 'pendiente', salida_id: 9 }, { rol: 'ENCARGADO_BODEGA' })
    assert.deepEqual(estado.consultas[0], { estado: 'PENDIENTE', salidaId: 9, alcance: null })
    await assert.rejects(() => listarActas({ estado: 'ROTA' }, { rol: 'ENCARGADO_BODEGA' }), { statusCode: 400 })
  })

  test('el maestro solo consulta las actas de sus proyectos', async () => {
    await listarActas({}, { rol: 'MAESTRO_OBRA' })
    assert.deepEqual(estado.consultas[0].alcance, { total: false, trabajadorId: 44 })
  })
})

describe('firmarActa', () => {
  const detallesIguales = [
    { detalle_id: 1, cantidad_recibida: 10 },
    { detalle_id: 2, cantidad_recibida: 4 },
  ]

  test('firma con la sesión y deja usuario, fecha y bitácora', async () => {
    const acta = await firmarActa(3, { detalles: detallesIguales }, ctx)

    assert.equal(acta.estado, 'FIRMADA')
    assert.equal(acta.firmada_por_usuario_id, 20)
    assert.ok(acta.firmada_en)
    assert.equal(estado.bitacora[0].accion, 'FIRMAR_ACTA_RECEPCION')
    assert.equal(estado.bitacora[0].detalles.con_diferencias, false)
    assert.equal(estado.alertas.length, 0)
  })

  test('una diferencia genera alerta a bodega y notificación', async () => {
    await firmarActa(3, {
      detalles: [
        { detalle_id: 1, cantidad_recibida: 8, observacion: 'Dos bultos rotos' },
        { detalle_id: 2, cantidad_recibida: 4 },
      ],
    }, ctx)

    assert.equal(estado.alertas.length, 1)
    assert.equal(estado.alertas[0].tipo, 'DIFERENCIA_RECEPCION')
    assert.match(estado.alertas[0].descripcion, /Cemento: despachado 10, recibido 8/)
    assert.equal(estado.notificados.length, 1)
    assert.equal(estado.bitacora[0].detalles.con_diferencias, true)
  })

  test('rechaza la firma de alguien que no es destinatario ni responsable', async () => {
    estado.cuenta = { trabajador_id: 99 }
    await assert.rejects(() => firmarActa(3, { detalles: detallesIguales }, ctx), { statusCode: 403 })
    assert.equal(estado.actas[0].estado, 'PENDIENTE')
  })

  test('un acta ya firmada es inmutable', async () => {
    estado.actas[0].estado = 'FIRMADA'
    await assert.rejects(() => firmarActa(3, { detalles: detallesIguales }, ctx), { statusCode: 409 })
  })

  test('responde 409 si otra sesión la firmó justo antes', async () => {
    estado.firmaAplicada = false
    await assert.rejects(() => firmarActa(3, { detalles: detallesIguales }, ctx), { statusCode: 409 })
  })

  test('responde 404 si el acta no existe', async () => {
    await assert.rejects(() => firmarActa(99, { detalles: detallesIguales }, ctx), { statusCode: 404 })
  })
})
