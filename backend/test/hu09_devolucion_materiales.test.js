/**
 * HU-09: devolución de materiales sobrantes (pruebas unitarias del backend).
 *
 * Corren sin MySQL: el repositorio y la bitácora se reemplazan por dobles en memoria, de modo que se
 * prueban las reglas del service (el trigger que suma la existencia lo cubre la prueba contra la base).
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const base = () => ({
  almacen: { id: 1, activo: 1 },
  proyecto: { id: 1, activo: 1 },
  actividad: { id: 5, activo: 1, proyecto_id: 1 },
  material: { id: 10, activo: 1, costo_referencia: 100000 },
  trabajador: { id: 3, activo: 1 },
  salida: null,
  despachado: 0,
  devuelto: 0,
  costoSalida: null,
})
const estado = { datos: base(), devoluciones: [], bitacora: [] }

mock.module('../src/repositories/devolucionMaterialRepository.js', {
  namedExports: {
    findById: async (id) => {
      const d = estado.devoluciones.find((x) => x.id === Number(id))
      return d ? { ...d, comprobante: `DV-${String(d.id).padStart(5, '0')}`, ajuste_costo: d.apto ? d.cantidad * d.costo_unitario : 0 } : null
    },
    listar: async () => estado.devoluciones,
    opciones: async () => ({ proyectos: [], trabajadores: [], almacenes: [], materiales: [] }),
    actividadesDeProyecto: async () => [],
    salidasDeProyecto: async () => [],
    registrar: async (datos) => {
      const costoUnitario = datos.validar(estado.datos)
      const id = estado.devoluciones.length + 1
      estado.devoluciones.push({
        id, cantidad: datos.cantidad, apto: datos.apto ? 1 : 0, costo_unitario: costoUnitario, motivo: datos.motivo,
        recibido_por_usuario_id: datos.usuarioId, devuelto_por_trabajador_id: datos.trabajadorId, salida_origen_id: datos.salidaId,
      })
      return id
    },
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const { registrarDevolucion } = await import('../src/services/devolucionMaterialService.js')

const ctx = { usuario: { id: 2, rol: 'ENCARGADO_BODEGA' }, usuarioId: 2, ip: '127.0.0.1' }
const cuerpo = (extra = {}) => ({
  almacen_id: 1, proyecto_id: 1, actividad_id: 5, material_id: 10, devuelto_por_trabajador_id: 3, cantidad: 4, motivo: 'Sobrante de la obra', ...extra,
})

beforeEach(() => {
  estado.datos = base()
  estado.devoluciones = []
  estado.bitacora = []
})

describe('HU-09 · registrar devolución', () => {
  test('principal: queda apta, con quién entrega, quién recibe, y ajusta el costo al de referencia', async () => {
    const d = await registrarDevolucion(cuerpo(), ctx)
    assert.equal(d.apto, 1)
    assert.equal(d.devuelto_por_trabajador_id, 3)
    assert.equal(d.recibido_por_usuario_id, 2)
    assert.equal(d.costo_unitario, 100000)
    assert.equal(d.ajuste_costo, 400000)
    assert.equal(estado.bitacora[0].accion, 'REGISTRAR_DEVOLUCION_MATERIALES')
  })

  test('exige almacén, proyecto, actividad, material, trabajador y cantidad', async () => {
    for (const campo of ['almacen_id', 'proyecto_id', 'actividad_id', 'material_id', 'devuelto_por_trabajador_id', 'cantidad']) {
      await assert.rejects(() => registrarDevolucion(cuerpo({ [campo]: undefined }), ctx), { statusCode: 400 }, campo)
    }
  })

  test('criterio 3: el motivo es obligatorio', async () => {
    await assert.rejects(() => registrarDevolucion(cuerpo({ motivo: '  ' }), ctx), { statusCode: 400, campo: 'motivo' })
    await assert.rejects(() => registrarDevolucion(cuerpo({ motivo: undefined }), ctx), { statusCode: 400, campo: 'motivo' })
  })

  test('la cantidad debe ser mayor que cero y de hasta 2 decimales', async () => {
    await assert.rejects(() => registrarDevolucion(cuerpo({ cantidad: 0 }), ctx), { statusCode: 400 })
    await assert.rejects(() => registrarDevolucion(cuerpo({ cantidad: 1.234 }), ctx), { statusCode: 400 })
  })

  test('Alt: material no apto se registra con su motivo y sin ajustar el costo', async () => {
    const d = await registrarDevolucion(cuerpo({ apto: false, motivo: 'Cemento humedecido, no sirve' }), ctx)
    assert.equal(d.apto, 0)
    assert.equal(d.ajuste_costo, 0)
    assert.equal(estado.bitacora[0].detalles.apto, false)
  })

  test('apto llega como texto desde el formulario', async () => {
    assert.equal((await registrarDevolucion(cuerpo({ apto: 'false' }), ctx)).apto, 0)
    assert.equal((await registrarDevolucion(cuerpo({ apto: 'true' }), ctx)).apto, 1)
  })

  test('rechaza almacén, proyecto, material o trabajador inexistentes o dados de baja', async () => {
    estado.datos.almacen = { id: 1, activo: 0 }
    await assert.rejects(() => registrarDevolucion(cuerpo(), ctx), { statusCode: 404, campo: 'almacen_id' })
    estado.datos = base(); estado.datos.proyecto = null
    await assert.rejects(() => registrarDevolucion(cuerpo(), ctx), { statusCode: 404, campo: 'proyecto_id' })
    estado.datos = base(); estado.datos.material = { id: 10, activo: 0 }
    await assert.rejects(() => registrarDevolucion(cuerpo(), ctx), { statusCode: 404, campo: 'material_id' })
    estado.datos = base(); estado.datos.trabajador = null
    await assert.rejects(() => registrarDevolucion(cuerpo(), ctx), { statusCode: 404 })
  })

  test('la actividad debe pertenecer al proyecto', async () => {
    estado.datos.actividad = { id: 5, activo: 1, proyecto_id: 2 }
    await assert.rejects(() => registrarDevolucion(cuerpo(), ctx), { statusCode: 400, campo: 'actividad_id' })
  })
})

describe('HU-09 · salida de origen', () => {
  const conSalida = (extra = {}) => {
    estado.datos.salida = { id: 7, proyecto_id: 1, actividad_id: 5 }
    estado.datos.despachado = 10
    estado.datos.devuelto = 2
    estado.datos.costoSalida = 90000
    Object.assign(estado.datos, extra)
  }

  test('con salida usa el costo de la salida y la guarda como referencia', async () => {
    conSalida()
    const d = await registrarDevolucion(cuerpo({ salida_origen_id: 7, cantidad: 8 }), ctx)
    assert.equal(d.salida_origen_id, 7)
    assert.equal(d.costo_unitario, 90000)
  })

  test('no deja devolver más de lo que queda por devolver de la salida', async () => {
    conSalida()
    await assert.rejects(() => registrarDevolucion(cuerpo({ salida_origen_id: 7, cantidad: 9 }), ctx), { statusCode: 409, campo: 'cantidad' })
  })

  test('la salida debe existir, ser del proyecto y de la actividad, e incluir el material', async () => {
    estado.datos.salida = null
    await assert.rejects(() => registrarDevolucion(cuerpo({ salida_origen_id: 7 }), ctx), { statusCode: 404, campo: 'salida_origen_id' })
    conSalida({ salida: { id: 7, proyecto_id: 2, actividad_id: 5 } })
    await assert.rejects(() => registrarDevolucion(cuerpo({ salida_origen_id: 7 }), ctx), { statusCode: 400, campo: 'salida_origen_id' })
    conSalida({ salida: { id: 7, proyecto_id: 1, actividad_id: 9 } })
    await assert.rejects(() => registrarDevolucion(cuerpo({ salida_origen_id: 7 }), ctx), { statusCode: 400, campo: 'salida_origen_id' })
    conSalida({ despachado: 0 })
    await assert.rejects(() => registrarDevolucion(cuerpo({ salida_origen_id: 7 }), ctx), { statusCode: 400, campo: 'material_id' })
  })
})
