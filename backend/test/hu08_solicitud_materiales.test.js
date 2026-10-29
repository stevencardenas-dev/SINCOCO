/**
 * HU-08: solicitud de materiales (pruebas unitarias del backend).
 *
 * Corren sin MySQL: repositorios, permisos, acceso a proyectos y bitácora se
 * reemplazan por dobles en memoria, de modo que se prueban las reglas del service.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = {
  solicitudes: [],
  presupuesto: [],
  yaSolicitado: [],
  creaciones: [],
  notificaciones: [],
  salidas: [],
}

const LINEAS = [{ id: 1, material_id: 10, material: 'Cemento', unidad_medida: 'BOLSA', cantidad_solicitada: 10, cantidad_aprobada: 0, cantidad_despachada: 0, existencia_total: 4 }]

mock.module('../src/repositories/solicitudMaterialRepository.js', {
  namedExports: {
    findById: async (id) => {
      const s = estado.solicitudes.find((x) => x.id === Number(id))
      return s ? { ...s } : null
    },
    listar: async () => estado.solicitudes,
    findActividadProyecto: async (id) => (id === 5 ? { id: 5, estado: 'EN_PROCESO', proyecto_id: 1 } : null),
    findMateriales: async (ids) => ids.map((id) => ({ id, activo: 1, descripcion: 'Cemento' })),
    catalogoMateriales: async () => [{ id: 10, codigo: 'MAT-001', descripcion: 'Cemento', unidad_medida: 'BOLSA' }],
    presupuestoActividad: async () => estado.presupuesto,
    yaSolicitadoActividad: async () => estado.yaSolicitado,
    crear: async (datos) => {
      estado.creaciones.push(datos)
      const id = estado.solicitudes.length + 1
      estado.solicitudes.push({
        id, codigo: `SM-${String(id).padStart(5, '0')}`, proyecto_id: datos.proyectoId, actividad_id: datos.actividadId,
        solicitado_por_usuario_id: datos.usuarioId, estado: 'PENDIENTE', excede_presupuesto: datos.excedePresupuesto ? 1 : 0,
        detalles: datos.detalles.map((d, i) => ({ id: i + 1, ...d, cantidad_solicitada: d.cantidad })),
      })
      return id
    },
    aprobar: async (id, aprobadas, observaciones, notificacion) => {
      const s = estado.solicitudes.find((x) => x.id === Number(id))
      s.estado = 'APROBADA'
      aprobadas.forEach((a) => { s.detalles.find((d) => d.id === a.detalle_id).cantidad_aprobada = a.cantidad })
      if (notificacion) estado.notificaciones.push(notificacion)
    },
    cambiarEstado: async (id, desde, hacia) => {
      const s = estado.solicitudes.find((x) => x.id === Number(id))
      if (!s || !desde.includes(s.estado)) return false
      s.estado = hacia
      return true
    },
    crearNotificacion: async (n) => { estado.notificaciones.push(n) },
    // Ejecuta la validación del service con la solicitud y líneas en memoria, como hace el repositorio.
    despachar: async ({ id, validar }) => {
      const sol = estado.solicitudes.find((x) => x.id === Number(id))
      estado.salidas = validar(sol, sol.detalles)
      return 1
    },
  },
})
mock.module('../src/repositories/proyectoRepository.js', { namedExports: { findById: async (id) => (id === 1 ? { id: 1 } : null) } })
mock.module('../src/services/accesoService.js', { namedExports: { verificarAccesoProyecto: async () => {} } })
mock.module('../src/middleware/permisos.js', { namedExports: { rolTienePermiso: async (rol) => rol === 'ENCARGADO_BODEGA' } })
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async () => {} } })

const {
  crearSolicitud, aprobarSolicitud, rechazarSolicitud, catalogoMateriales, despacharSolicitud,
} = await import('../src/services/solicitudMaterialService.js')

const ctx = { usuario: { id: 7, rol: 'MAESTRO_OBRA' }, usuarioId: 7, ip: '127.0.0.1' }
const cuerpo = (extra = {}) => ({ proyecto_id: 1, actividad_id: 5, detalles: [{ material_id: 10, cantidad: 10 }], ...extra })

beforeEach(() => {
  estado.solicitudes = []
  estado.presupuesto = []
  estado.yaSolicitado = []
  estado.creaciones = []
  estado.notificaciones = []
})

describe('HU-08 · solicitar materiales', () => {
  test('el catálogo para solicitar no depende del permiso del inventario', async () => {
    assert.deepEqual(Object.keys((await catalogoMateriales())[0]), ['id', 'codigo', 'descripcion', 'unidad_medida'])
  })

  test('principal: queda PENDIENTE, asociada a proyecto, actividad y usuario', async () => {
    const s = await crearSolicitud(cuerpo(), ctx)
    assert.equal(s.estado, 'PENDIENTE')
    assert.equal(s.proyecto_id, 1)
    assert.equal(s.actividad_id, 5)
    assert.equal(s.solicitado_por_usuario_id, 7)
  })

  test('exige proyecto, actividad y al menos un material', async () => {
    await assert.rejects(() => crearSolicitud(cuerpo({ actividad_id: undefined }), ctx), { statusCode: 400 })
    await assert.rejects(() => crearSolicitud(cuerpo({ detalles: [] }), ctx), { statusCode: 400 })
  })

  test('Alt 1: si excede lo presupuestado responde 409 con el detalle y no crea nada', async () => {
    estado.presupuesto = [{ material_id: 10, cantidad_presupuestada: 8 }]
    await assert.rejects(() => crearSolicitud(cuerpo(), ctx), (err) => {
      assert.equal(err.statusCode, 409)
      assert.equal(err.extra.codigo, 'EXCEDE_PRESUPUESTO')
      assert.deepEqual(err.extra.excesos[0], { material_id: 10, material: 'Cemento', presupuestado: 8, ya_solicitado: 0, solicitado: 10 })
      return true
    })
    assert.equal(estado.creaciones.length, 0)
  })

  test('Alt 1: cuenta lo ya solicitado en la actividad', async () => {
    estado.presupuesto = [{ material_id: 10, cantidad_presupuestada: 15 }]
    estado.yaSolicitado = [{ material_id: 10, cantidad: 6 }]
    await assert.rejects(() => crearSolicitud(cuerpo(), ctx), { statusCode: 409 })
  })

  test('Alt 1: confirmado y justificado se crea marcada como excedida', async () => {
    estado.presupuesto = [{ material_id: 10, cantidad_presupuestada: 8 }]
    const s = await crearSolicitud(cuerpo({ confirmar_exceso: true, observaciones: 'Obra adicional' }), ctx)
    assert.equal(s.excede_presupuesto, 1)
    assert.equal(estado.creaciones[0].excedePresupuesto, true)
  })

  test('Alt 1: confirmar sin justificar se rechaza', async () => {
    estado.presupuesto = [{ material_id: 10, cantidad_presupuestada: 8 }]
    await assert.rejects(() => crearSolicitud(cuerpo({ confirmar_exceso: true }), ctx), { statusCode: 400 })
  })

  test('dentro de lo presupuestado no pide confirmación', async () => {
    estado.presupuesto = [{ material_id: 10, cantidad_presupuestada: 10 }]
    const s = await crearSolicitud(cuerpo(), ctx)
    assert.equal(s.excede_presupuesto, 0)
  })

  test('sin presupuesto en la actividad no hay contra qué comparar', async () => {
    assert.equal((await crearSolicitud(cuerpo(), ctx)).estado, 'PENDIENTE')
  })

  test('con presupuesto, un material fuera de él cuenta como presupuestado 0', async () => {
    estado.presupuesto = [{ material_id: 99, cantidad_presupuestada: 50 }]
    await assert.rejects(() => crearSolicitud(cuerpo(), ctx), { statusCode: 409 })
  })
})

describe('HU-08 · revisión de bodega', () => {
  const crearYObtener = async () => {
    const s = await crearSolicitud(cuerpo(), ctx)
    estado.solicitudes[0].detalles = LINEAS.map((l) => ({ ...l }))
    return s
  }

  test('Alt 2: aprobar una cantidad menor deja cantidad_aprobada y notifica al solicitante', async () => {
    const s = await crearYObtener()
    const r = await aprobarSolicitud(s.id, { detalles: [{ detalle_id: 1, cantidad_aprobada: 4 }] }, { ...ctx, usuario: { id: 2, rol: 'ENCARGADO_BODEGA' } })
    assert.equal(r.estado, 'APROBADA')
    assert.equal(r.detalles[0].cantidad_aprobada, 4)
    assert.equal(estado.notificaciones.length, 1)
    assert.equal(estado.notificaciones[0].usuarioId, 7)
    assert.match(estado.notificaciones[0].titulo, /parcialmente/)
    assert.match(estado.notificaciones[0].mensaje, /solicitado 10, aprobado 4/)
  })

  test('aprobar lo solicitado notifica sin marcarla como parcial', async () => {
    const s = await crearYObtener()
    await aprobarSolicitud(s.id, {}, ctx)
    assert.doesNotMatch(estado.notificaciones[0].titulo, /parcialmente/)
  })

  test('no se puede aprobar más de lo solicitado', async () => {
    const s = await crearYObtener()
    await assert.rejects(() => aprobarSolicitud(s.id, { detalles: [{ detalle_id: 1, cantidad_aprobada: 11 }] }, ctx), { statusCode: 400 })
  })

  test('rechazar exige observación, cambia el estado y notifica', async () => {
    const s = await crearYObtener()
    await assert.rejects(() => rechazarSolicitud(s.id, {}, ctx), { statusCode: 400 })
    const r = await rechazarSolicitud(s.id, { observaciones: 'Sin stock' }, ctx)
    assert.equal(r.estado, 'RECHAZADA')
    assert.match(estado.notificaciones[0].mensaje, /Sin stock/)
  })
})

describe('HU-08 · despacho parcial', () => {
  const aprobada = async () => {
    const s = await crearSolicitud(cuerpo(), ctx)
    estado.solicitudes[0].detalles = LINEAS.map((l) => ({ ...l, existencia_total: 20, cantidad_aprobada: 10, cantidad_despachada: 0, costo_referencia: 100 }))
    estado.solicitudes[0].estado = 'APROBADA'
    return s
  }
  const datos = { almacen_origen_id: 1, entregado_a_trabajador_id: 3 }

  test('sin cantidades despacha todo lo aprobado pendiente', async () => {
    const s = await aprobada()
    await despacharSolicitud(s.id, datos, ctx)
    assert.equal(estado.salidas[0].cantidad, 10)
  })

  test('con una cantidad menor despacha solo esa y deja el saldo pendiente', async () => {
    const s = await aprobada()
    await despacharSolicitud(s.id, { ...datos, detalles: [{ detalle_id: 1, cantidad: 4 }] }, ctx)
    assert.equal(estado.salidas[0].cantidad, 4)
  })

  test('no deja despachar más de lo aprobado pendiente', async () => {
    const s = await aprobada()
    await assert.rejects(() => despacharSolicitud(s.id, { ...datos, detalles: [{ detalle_id: 1, cantidad: 11 }] }, ctx), { statusCode: 409 })
  })

  test('no deja despachar más de la existencia', async () => {
    const s = await aprobada()
    estado.solicitudes[0].detalles[0].existencia_total = 3
    await assert.rejects(() => despacharSolicitud(s.id, { ...datos, detalles: [{ detalle_id: 1, cantidad: 4 }] }, ctx), { statusCode: 409 })
  })

  test('todo en cero no despacha nada', async () => {
    const s = await aprobada()
    await assert.rejects(() => despacharSolicitud(s.id, { ...datos, detalles: [{ detalle_id: 1, cantidad: 0 }] }, ctx), { statusCode: 400 })
  })
})
