/**
 * HU-20: consumo real de materiales (pruebas unitarias del backend).
 *
 * Corren sin MySQL: repositorios, permisos, acceso a proyectos y bitácora se reemplazan por dobles en memoria,
 * de modo que se prueban las reglas del service.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const base = () => ({
  actividad: { id: 5, activo: 1 },
  material: { id: 10, activo: 1 },
  despachado: 10,
  devuelto: 2,
  consumido: 3,
  costo: 125000,
})
const estado = { datos: base(), consumos: [], bitacora: [], accesoDenegado: false, consolidacion: [] }

mock.module('../src/repositories/consumoMaterialRepository.js', {
  namedExports: {
    findById: async (id) => {
      const c = estado.consumos.find((x) => x.id === Number(id))
      return c ? { ...c, comprobante: `CM-${String(c.id).padStart(5, '0')}` } : null
    },
    listar: async (filtros) => { estado.filtros = filtros; return estado.consumos },
    findActividad: async (id) => (id === 5 ? { id: 5, nombre: 'Excavación', activo: 1, proyecto_id: 1 } : null),
    disponiblesDeActividad: async () => [],
    consolidacion: async () => estado.consolidacion,
    registrar: async (datos) => {
      const costoUnitario = datos.validar(estado.datos)
      const id = estado.consumos.length + 1
      estado.consumos.push({
        id, actividad_id: datos.actividadId, material_id: datos.materialId, cantidad: datos.cantidad,
        costo_unitario: costoUnitario, costo_total: Math.round(datos.cantidad * costoUnitario * 100) / 100,
        registrado_por_usuario_id: datos.usuarioId, estado: 'REGISTRADO',
      })
      return id
    },
    cambiarEstado: async (id, desde, hacia, campos) => {
      const c = estado.consumos.find((x) => x.id === Number(id))
      if (!c || !desde.includes(c.estado)) return false
      Object.assign(c, { estado: hacia, ...campos })
      return true
    },
  },
})
mock.module('../src/repositories/proyectoRepository.js', { namedExports: { findById: async (id) => (id === 1 ? { id: 1, nombre: 'Los Álamos' } : null) } })
mock.module('../src/services/accesoService.js', {
  namedExports: {
    verificarAccesoProyecto: async () => {
      if (estado.accesoDenegado) throw Object.assign(new Error('sin acceso'), { statusCode: 403 })
    },
  },
})
mock.module('../src/middleware/permisos.js', {
  namedExports: {
    rolTienePermiso: async (rol, permiso) => (rol === 'ADMINISTRADOR') || (rol === 'GERENTE' && permiso === 'consumos_materiales.ver_todos'),
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const {
  registrarConsumo, solicitarAnulacion, autorizarAnulacion, rechazarAnulacion, consolidacionCostos, listarConsumos,
} = await import('../src/services/consumoMaterialService.js')

const maestro = { usuario: { id: 7, rol: 'MAESTRO_OBRA' }, usuarioId: 7, ip: '127.0.0.1' }
const admin = { usuario: { id: 1, rol: 'ADMINISTRADOR' }, usuarioId: 1, ip: '127.0.0.1' }
const cuerpo = (extra = {}) => ({ actividad_id: 5, material_id: 10, cantidad: 3, ...extra })

beforeEach(() => {
  estado.datos = base()
  estado.consumos = []
  estado.bitacora = []
  estado.accesoDenegado = false
  estado.consolidacion = []
})

describe('HU-20 · registrar consumo', () => {
  test('principal: queda REGISTRADO con el costo ponderado de lo despachado', async () => {
    const c = await registrarConsumo(cuerpo(), maestro)
    assert.equal(c.estado, 'REGISTRADO')
    assert.equal(c.costo_unitario, 125000)
    assert.equal(c.costo_total, 375000)
    assert.equal(c.registrado_por_usuario_id, 7)
    assert.equal(estado.bitacora[0].accion, 'REGISTRAR_CONSUMO_MATERIALES')
  })

  test('criterio 2: exige actividad, material y cantidad', async () => {
    for (const campo of ['actividad_id', 'material_id', 'cantidad']) {
      await assert.rejects(() => registrarConsumo(cuerpo({ [campo]: undefined }), maestro), { statusCode: 400 }, campo)
    }
    await assert.rejects(() => registrarConsumo(cuerpo({ cantidad: 0 }), maestro), { statusCode: 400 })
    await assert.rejects(() => registrarConsumo(cuerpo({ cantidad: 1.234 }), maestro), { statusCode: 400 })
  })

  test('criterio 1: no supera lo despachado menos lo devuelto y lo ya consumido', async () => {
    // despachado 10 - devuelto 2 - consumido 3 = 5 disponible
    assert.equal((await registrarConsumo(cuerpo({ cantidad: 5 }), maestro)).cantidad, 5)
    await assert.rejects(() => registrarConsumo(cuerpo({ cantidad: 5.01 }), maestro), { statusCode: 409, campo: 'cantidad' })
  })

  test('criterio 1: sin material despachado a la actividad no hay consumo posible', async () => {
    estado.datos.despachado = 0
    await assert.rejects(() => registrarConsumo(cuerpo({ cantidad: 1 }), maestro), { statusCode: 409, campo: 'material_id' })
  })

  test('actividad o material inexistentes o dados de baja', async () => {
    await assert.rejects(() => registrarConsumo(cuerpo({ actividad_id: 99 }), maestro), { statusCode: 404, campo: 'actividad_id' })
    estado.datos.material = { id: 10, activo: 0 }
    await assert.rejects(() => registrarConsumo(cuerpo(), maestro), { statusCode: 404, campo: 'material_id' })
  })

  test('sin acceso al proyecto de la actividad no se registra', async () => {
    estado.accesoDenegado = true
    await assert.rejects(() => registrarConsumo(cuerpo(), maestro), { statusCode: 403 })
    assert.equal(estado.consumos.length, 0)
  })
})

describe('HU-20 · anulación con autorización de un administrador', () => {
  const registrado = async () => registrarConsumo(cuerpo(), maestro)

  test('el maestro solo puede solicitar la anulación, con motivo; el consumo no se anula', async () => {
    const c = await registrado()
    await assert.rejects(() => solicitarAnulacion(c.id, {}, maestro), { statusCode: 400, campo: 'motivo' })
    const r = await solicitarAnulacion(c.id, { motivo: 'Cantidad mal digitada' }, maestro)
    assert.equal(r.estado, 'ANULACION_SOLICITADA')
    assert.equal(r.anulacion_motivo, 'Cantidad mal digitada')
  })

  test('otro maestro no puede solicitar la anulación de un consumo ajeno', async () => {
    const c = await registrado()
    await assert.rejects(
      () => solicitarAnulacion(c.id, { motivo: 'x' }, { ...maestro, usuario: { id: 8, rol: 'MAESTRO_OBRA' }, usuarioId: 8 }),
      { statusCode: 403 },
    )
  })

  test('un administrador autoriza la anulación solicitada y queda constancia de quién', async () => {
    const c = await registrado()
    await solicitarAnulacion(c.id, { motivo: 'Error' }, maestro)
    const r = await autorizarAnulacion(c.id, { observaciones: 'Autorizado' }, admin)
    assert.equal(r.estado, 'ANULADO')
    assert.equal(r.anulacion_resuelta_por_usuario_id, 1)
    assert.equal(estado.bitacora.at(-1).accion, 'AUTORIZAR_ANULACION_CONSUMO')
  })

  test('el administrador puede anular directamente uno registrado, pero con motivo', async () => {
    const c = await registrado()
    await assert.rejects(() => autorizarAnulacion(c.id, {}, admin), { statusCode: 400, campo: 'observaciones' })
    assert.equal((await autorizarAnulacion(c.id, { observaciones: 'Duplicado' }, admin)).estado, 'ANULADO')
  })

  test('rechazar la anulación exige observación y devuelve el consumo a REGISTRADO', async () => {
    const c = await registrado()
    await solicitarAnulacion(c.id, { motivo: 'Error' }, maestro)
    await assert.rejects(() => rechazarAnulacion(c.id, {}, admin), { statusCode: 400, campo: 'observaciones' })
    assert.equal((await rechazarAnulacion(c.id, { observaciones: 'Es correcto' }, admin)).estado, 'REGISTRADO')
  })

  test('un consumo anulado no se puede volver a solicitar ni a autorizar', async () => {
    const c = await registrado()
    await autorizarAnulacion(c.id, { observaciones: 'Duplicado' }, admin)
    await assert.rejects(() => solicitarAnulacion(c.id, { motivo: 'x' }, maestro), { statusCode: 409 })
    await assert.rejects(() => autorizarAnulacion(c.id, { observaciones: 'x' }, admin), { statusCode: 409 })
  })
})

describe('HU-20 · consulta y consolidación de costos', () => {
  test('el maestro ve solo sus consumos; administrador y gerente ven todos', async () => {
    await listarConsumos({}, maestro.usuario)
    assert.equal(estado.filtros.usuarioId, 7)
    await listarConsumos({}, admin.usuario)
    assert.equal(estado.filtros.usuarioId, null)
    await listarConsumos({}, { id: 3, rol: 'GERENTE' })
    assert.equal(estado.filtros.usuarioId, null)
  })

  test('criterio 4: el total del proyecto suma el costo de las actividades', async () => {
    estado.consolidacion = [
      { actividad_id: 5, actividad: 'Excavación', costo_materiales: 375000, consumos: 1 },
      { actividad_id: 6, actividad: 'Armado', costo_materiales: 250000.5, consumos: 2 },
    ]
    const r = await consolidacionCostos(1, maestro.usuario)
    assert.equal(r.costo_materiales_total, 625000.5)
    assert.equal(r.actividades.length, 2)
  })

  test('proyecto inexistente o sin acceso', async () => {
    await assert.rejects(() => consolidacionCostos(99, maestro.usuario), { statusCode: 404 })
    estado.accesoDenegado = true
    await assert.rejects(() => consolidacionCostos(1, maestro.usuario), { statusCode: 403 })
  })
})
