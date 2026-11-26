/**
 * HU-41: calificación de desempeño operacional de proveedores (pruebas
 * unitarias).
 *
 * Corren sin MySQL: los repositorios y la bitácora se reemplazan por dobles en
 * memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = {
  proveedor: null,
  servicio: null,
  orden: null,
  porServicio: null,
  porOrden: null,
  calificaciones: [],
  bitacora: [],
  creadas: [],
  actualizadas: [],
  promedios: {},
}

mock.module('../src/repositories/calificacionProveedorRepository.js', {
  namedExports: {
    findByServicio: async () => estado.porServicio,
    findByOrden: async () => estado.porOrden,
    findById: async (id) => estado.calificaciones.find((c) => Number(c.id) === Number(id)) ?? null,
    crear: async (datos) => {
      const id = estado.calificaciones.length + 1
      const calificacion = {
        id, ...datos, calificado_en: '2026-11-26 11:00:00',
        referencia: estado.servicio?.nombre_servicio ?? estado.orden?.codigo,
        tipo: datos.servicio_externo_id ? 'SERVICIO' : 'ORDEN_COMPRA',
      }
      estado.calificaciones.push(calificacion)
      estado.creadas.push(datos)
      return id
    },
    actualizar: async (id, datos) => {
      const c = estado.calificaciones.find((x) => Number(x.id) === Number(id))
      Object.assign(c, datos, { actualizado_en: '2026-11-26 12:00:00' })
      estado.actualizadas.push({ id, datos })
    },
    listarPorProveedor: async () => estado.calificaciones,
    promedio: async () => estado.promedios,
    calificables: async () => [
      { tipo: 'SERVICIO', id: 10, descripcion: 'Alquiler de grúa', fecha_pactada: '2026-11-01', valor: 5000000 },
    ],
    findOrdenRecibida: async (id) => {
      const recibida = estado.orden && ['RECIBIDA_PARCIAL', 'RECIBIDA_TOTAL'].includes(estado.orden.estado)
      return recibida && Number(estado.orden.id) === Number(id) ? estado.orden : null
    },
  },
})
mock.module('../src/repositories/proveedorRepository.js', {
  namedExports: {
    findById: async (id) => (estado.proveedor && Number(estado.proveedor.id) === Number(id) ? estado.proveedor : null),
  },
})
mock.module('../src/repositories/servicioExternoRepository.js', {
  namedExports: {
    findById: async (id) => (estado.servicio && Number(estado.servicio.id) === Number(id) ? estado.servicio : null),
  },
})
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (evento) => { estado.bitacora.push(evento) } },
})

const {
  validarPuntajes, calificar, corregirCalificacion, listarCalificaciones,
} = await import('../src/services/calificacionProveedorService.js')

const ctx = { usuarioId: 1, ip: '127.0.0.1' }

beforeEach(() => {
  estado.proveedor = { id: 5, razon_social: 'Transportes Andinos', estado: 'ACTIVO', activo: 1 }
  estado.servicio = {
    id: 10, proveedor_id: 5, nombre_servicio: 'Alquiler de grúa regulador', estado: 'FINALIZADO',
    fecha_fin: '2026-11-15', valor_contratado: 5000000,
  }
  estado.orden = { id: 7, codigo: 'OC-00007', proveedor_id: 5, fecha_entrega_estimada: '2026-11-10', estado: 'RECIBIDA_TOTAL' }
  estado.porServicio = null
  estado.porOrden = null
  estado.calificaciones = []
  estado.creadas = []
  estado.actualizadas = []
  estado.bitacora = []
  estado.promedios = { total: 1, puntualidad: 5, calidad: 4 }
})

describe('puntajes de la calificación', () => {
  test('acepta enteros de 1 a 5 con comentario opcional', () => {
    assert.deepEqual(validarPuntajes({ puntualidad: 5, calidad: 4 }), {
      puntualidad: 5, calidad: 4, comentario: null,
    })
  })

  test('exige comentario cuando algún puntaje es 2 o menor', () => {
    assert.throws(() => validarPuntajes({ puntualidad: 2, calidad: 5 }), {
      statusCode: 400, campo: 'comentario',
    })
    assert.throws(() => validarPuntajes({ puntualidad: 5, calidad: 1 }), {
      statusCode: 400, campo: 'comentario',
    })
    assert.equal(
      validarPuntajes({ puntualidad: 2, calidad: 5, comentario: 'Llegó tarde' }).comentario,
      'Llegó tarde',
    )
  })

  test('rechaza puntajes fuera de la escala y no enteros', () => {
    for (const valor of [0, 6, 3.5, 'bien', null]) {
      assert.throws(() => validarPuntajes({ puntualidad: valor, calidad: 4 }), { statusCode: 400 })
    }
  })
})

describe('calificar', () => {
  test('califica un servicio finalizado y deja la bitácora', async () => {
    const r = await calificar(5, { servicio_externo_id: 10, puntualidad: 5, calidad: 4 }, ctx)

    assert.equal(r.calificacion.puntualidad, 5)
    assert.equal(r.calificacion.fecha_pactada, '2026-11-15')
    assert.equal(r.calificacion.calificado_por_usuario_id, 1)
    assert.deepEqual(r.promedio, { total: 1, puntualidad: 5, calidad: 4 })
    assert.equal(estado.bitacora[0].accion, 'CALIFICAR_PROVEEDOR')
    assert.equal(estado.creadas[0].orden_compra_id, null)
  })

  test('califica una entrega recibida de una orden de compra', async () => {
    const r = await calificar(5, { orden_compra_id: 7, puntualidad: 3, calidad: 3 }, ctx)

    assert.equal(r.calificacion.tipo, 'ORDEN_COMPRA')
    assert.equal(r.calificacion.fecha_pactada, '2026-11-10')
    assert.equal(estado.creadas[0].servicio_externo_id, null)
  })

  test('no califica un servicio que todavía no termina (alternativo 3)', async () => {
    estado.servicio = { ...estado.servicio, estado: 'EN_EJECUCION' }
    await assert.rejects(
      () => calificar(5, { servicio_externo_id: 10, puntualidad: 5, calidad: 5 }, ctx),
      (e) => e.statusCode === 409 && e.campo === 'estado',
    )
  })

  test('no califica una orden que no se ha recibido', async () => {
    estado.orden = { ...estado.orden, estado: 'ENVIADA_PROVEEDOR' }
    await assert.rejects(
      () => calificar(5, { orden_compra_id: 7, puntualidad: 5, calidad: 5 }, ctx),
      (e) => e.statusCode === 404,
    )
  })

  test('impide el duplicado y devuelve la calificación existente (alternativo 2)', async () => {
    estado.porServicio = { id: 1, puntualidad: 5, calidad: 5 }
    await assert.rejects(
      () => calificar(5, { servicio_externo_id: 10, puntualidad: 4, calidad: 4 }, ctx),
      (e) => {
        assert.equal(e.statusCode, 409)
        assert.equal(e.extra.calificacion.id, 1)
        return true
      },
    )
    assert.equal(estado.creadas.length, 0)
  })

  test('exige una sola referencia y del mismo proveedor', async () => {
    await assert.rejects(
      () => calificar(5, { puntualidad: 5, calidad: 5 }, ctx),
      (e) => e.statusCode === 400,
    )
    await assert.rejects(
      () => calificar(5, { servicio_externo_id: 10, orden_compra_id: 7, puntualidad: 5, calidad: 5 }, ctx),
      (e) => e.statusCode === 400,
    )
    estado.servicio = { ...estado.servicio, proveedor_id: 99 }
    await assert.rejects(
      () => calificar(5, { servicio_externo_id: 10, puntualidad: 5, calidad: 5 }, ctx),
      (e) => e.statusCode === 400 && e.campo === 'servicio_externo_id',
    )
  })

  test('responde 404 si el proveedor no existe', async () => {
    await assert.rejects(
      () => calificar(99, { servicio_externo_id: 10, puntualidad: 5, calidad: 5 }, ctx),
      (e) => e.statusCode === 404,
    )
  })
})

describe('corregirCalificacion', () => {
  test('corrige sin borrar y registra el antes y el después en la bitácora', async () => {
    await calificar(5, { servicio_externo_id: 10, puntualidad: 5, calidad: 4 }, ctx)
    const r = await corregirCalificacion(5, 1, { calidad: 2, comentario: 'Retrasos en la entrega' }, ctx)

    assert.equal(r.calificacion.calidad, 2)
    assert.equal(r.calificacion.comentario, 'Retrasos en la entrega')
    assert.equal(estado.bitacora.at(-1).accion, 'CORREGIR_CALIFICACION_PROVEEDOR')
    assert.deepEqual(estado.bitacora.at(-1).detalles.anterior, { puntualidad: 5, calidad: 4, comentario: null })
    assert.deepEqual(estado.bitacora.at(-1).detalles.nuevo, {
      puntualidad: 5, calidad: 2, comentario: 'Retrasos en la entrega',
    })
  })

  test('una corrección con puntaje bajo exige comentario', async () => {
    await calificar(5, { servicio_externo_id: 10, puntualidad: 5, calidad: 4 }, ctx)
    await assert.rejects(
      () => corregirCalificacion(5, 1, { puntualidad: 2 }, ctx),
      (e) => e.statusCode === 400 && e.campo === 'comentario',
    )
  })

  test('responde 404 si la calificación no existe', async () => {
    await assert.rejects(() => corregirCalificacion(5, 99, {}, ctx), (e) => e.statusCode === 404)
  })
})

describe('listarCalificaciones', () => {
  test('devuelve el promedio, el historial y lo que falta por calificar', async () => {
    await calificar(5, { servicio_externo_id: 10, puntualidad: 5, calidad: 4 }, ctx)
    const r = await listarCalificaciones(5)

    assert.equal(r.proveedor.razon_social, 'Transportes Andinos')
    assert.deepEqual(r.promedio, { total: 1, puntualidad: 5, calidad: 4 })
    assert.equal(r.calificaciones.length, 1)
    assert.equal(r.calificables[0].tipo, 'SERVICIO')
  })
})
