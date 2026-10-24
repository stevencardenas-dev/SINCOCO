/**
 * HU-07: catálogo de materiales (pruebas unitarias del backend).
 *
 * Corren sin MySQL: el repositorio y la bitácora se reemplazan por dobles en
 * memoria, de modo que se prueban las reglas del service, el DTO y la entity.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const { Material } = await import('../src/entities/Material.js')

const estado = { materiales: [], categorias: [], bitacora: [], falloInsert: null }
const copia = (m) => (m ? Material.fromRow({ categoria: 'Cementos', estado: 'ACTIVO', ...m }) : null)

mock.module('../src/repositories/materialRepository.js', {
  namedExports: {
    findById: async (id) => copia(estado.materiales.find((m) => m.id === Number(id))),
    findByCodigo: async (codigo) => estado.materiales.find((m) => m.codigo === codigo) ?? null,
    findCategoria: async (id) => estado.categorias.find((c) => c.id === Number(id)) ?? null,
    listar: async () => estado.materiales.map(copia),
    listarCategorias: async () => estado.categorias,
    create: async (dto) => {
      if (estado.falloInsert) throw estado.falloInsert
      const id = estado.materiales.length + 1
      estado.materiales.push({ id, activo: 1, ...dto })
      return id
    },
    update: async (id, campos) => {
      Object.assign(estado.materiales.find((m) => m.id === Number(id)), campos)
      return 1
    },
    darDeBaja: async (id) => {
      const m = estado.materiales.find((x) => x.id === Number(id))
      if (!m.activo) return 0
      m.activo = 0
      return 1
    },
    reactivar: async (id) => {
      const m = estado.materiales.find((x) => x.id === Number(id))
      if (m.activo) return 0
      m.activo = 1
      return 1
    },
  },
})
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (entrada) => { estado.bitacora.push(entrada) } },
})

mock.module('../src/services/alertaService.js', {
  namedExports: { evaluarStockMinimo: async () => {} },
})

const service = await import('../src/services/materialService.js')
const { RegistrarMaterialDto } = await import('../src/dtos/material/RegistrarMaterialDto.js')

const cuerpo = (extra = {}) => ({
  codigo: 'cem001',
  categoria_id: 1,
  descripcion: 'Cemento gris 50 kg',
  unidad_medida: 'bulto',
  costo_referencia: 32000,
  nivel_minimo: 20,
  ...extra,
})
const registrar = (extra) => service.registrarMaterial(RegistrarMaterialDto.fromRequestBody(cuerpo(extra)))
const rechaza = (promesa, estadoHttp) => assert.rejects(promesa, (e) => e.statusCode === estadoHttp)

beforeEach(() => {
  estado.materiales = []
  estado.categorias = [{ id: 1, nombre: 'Cementos' }]
  estado.bitacora = []
  estado.falloInsert = null
})

describe('HU-07 · criterio 1: código único, alfanumérico y obligatorio', () => {
  test('sin código el DTO responde 400', () => {
    assert.throws(
      () => RegistrarMaterialDto.fromRequestBody(cuerpo({ codigo: '  ' })),
      (e) => e.statusCode === 400 && e.campo === 'codigo',
    )
  })

  test('un código con símbolos o espacios responde 400', () => {
    for (const codigo of ['CEM-001', 'CEM 001', 'CEM_001', 'cem.001']) {
      assert.throws(() => RegistrarMaterialDto.fromRequestBody(cuerpo({ codigo })), (e) => e.statusCode === 400, codigo)
    }
  })

  test('el código se guarda en mayúsculas', async () => {
    const m = await registrar()
    assert.equal(m.codigo, 'CEM001')
  })

  test('un código repetido responde 409 y sugiere editar el existente', async () => {
    await registrar()
    await assert.rejects(
      registrar({ descripcion: 'Otro cemento' }),
      (e) => e.statusCode === 409 && /edite el material existente/.test(e.message),
    )
  })

  test('un código repetido que llega por una alta simultánea responde 409, no 500', async () => {
    estado.falloInsert = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' })
    await assert.rejects(registrar(), (e) => e.statusCode === 409 && e.campo === 'codigo')
  })

  test('un error de base distinto no se disfraza de duplicado', async () => {
    estado.falloInsert = Object.assign(new Error('conexión perdida'), { code: 'ECONNRESET' })
    await assert.rejects(registrar(), (e) => e.statusCode === undefined && e.code === 'ECONNRESET')
  })

  test('un código repetido de un material dado de baja pide reactivarlo, no editarlo', async () => {
    await registrar()
    await service.darDeBajaMaterial(1)
    await assert.rejects(
      registrar({ descripcion: 'Otro cemento' }),
      (e) => e.statusCode === 409 && /dado de baja/.test(e.message) && /reactívelo/.test(e.message),
    )
  })

  test('editar conservando el mismo código (como llega del formulario) no es un duplicado', async () => {
    await registrar()
    for (const [id, codigo] of [[1, 'CEM001'], ['1', 'cem001'], [1, ' CEM001 ']]) {
      const m = await service.actualizarMaterial(id, { codigo, descripcion: `Cemento ${codigo.trim()}` })
      assert.equal(m.codigo, 'CEM001')
    }
  })

  test('editar a un código ajeno responde 409', async () => {
    await registrar()
    await registrar({ codigo: 'ARE001', descripcion: 'Arena' })
    await rechaza(service.actualizarMaterial(2, { codigo: 'cem001' }), 409)
  })
})

describe('HU-07 · criterio 2: categoría y unidad de medida válidas', () => {
  test('sin categoría el DTO responde 400', () => {
    assert.throws(
      () => RegistrarMaterialDto.fromRequestBody(cuerpo({ categoria_id: '' })),
      (e) => e.statusCode === 400 && e.campo === 'categoria_id',
    )
  })

  test('una categoría inexistente responde 400', async () => {
    await rechaza(registrar({ categoria_id: 99 }), 400)
  })

  test('una unidad de medida fuera del catálogo responde 400', () => {
    assert.throws(
      () => RegistrarMaterialDto.fromRequestBody(cuerpo({ unidad_medida: 'FANEGA' })),
      (e) => e.statusCode === 400 && e.campo === 'unidad_medida',
    )
  })

  test('sin unidad de medida responde 400', () => {
    assert.throws(() => RegistrarMaterialDto.fromRequestBody(cuerpo({ unidad_medida: '' })), (e) => e.statusCode === 400)
  })

  test('la unidad se normaliza a mayúsculas y se ofrece la lista de unidades válidas', () => {
    assert.equal(RegistrarMaterialDto.fromRequestBody(cuerpo({ unidad_medida: 'kg' })).unidad_medida, 'KG')
    assert.ok(service.listarUnidadesMedida().includes('BULTO'))
  })

  test('el costo y el nivel mínimo no admiten negativos ni más de 2 decimales', () => {
    for (const extra of [{ costo_referencia: -1 }, { nivel_minimo: -5 }, { costo_referencia: 10.123 }, { nivel_minimo: 'abc' }]) {
      assert.throws(() => RegistrarMaterialDto.fromRequestBody(cuerpo(extra)), (e) => e.statusCode === 400, JSON.stringify(extra))
    }
  })
})

describe('HU-07 · criterio 3: nivel mínimo configurable', () => {
  test('el nivel mínimo se guarda por material y marca «bajo mínimo»', () => {
    const base = { id: 1, activo: 1, nivel_minimo: 20 }
    assert.equal(Material.fromRow({ ...base, existencia_total: 20 }).bajo_minimo, true)
    assert.equal(Material.fromRow({ ...base, existencia_total: 5 }).bajo_minimo, true)
    assert.equal(Material.fromRow({ ...base, existencia_total: 21 }).bajo_minimo, false)
  })

  test('un nivel mínimo en cero desactiva la alerta', () => {
    assert.equal(Material.fromRow({ id: 1, activo: 1, nivel_minimo: 0, existencia_total: 0 }).bajo_minimo, false)
  })

  test('un material dado de baja nunca está «bajo mínimo»', () => {
    assert.equal(Material.fromRow({ id: 1, activo: 0, nivel_minimo: 20, existencia_total: 0 }).bajo_minimo, false)
  })

  test('el nivel mínimo se puede editar', async () => {
    await registrar()
    const m = await service.actualizarMaterial(1, { nivel_minimo: 50 })
    assert.equal(m.nivel_minimo, 50)
  })
})

describe('HU-07 · criterio 4: la existencia solo la mueven los procesos de inventario', () => {
  test('un material nuevo nace con existencia cero', async () => {
    assert.equal(RegistrarMaterialDto.fromRequestBody(cuerpo({ existencia_total: 500 })).existencia_total, 0)
    const m = await registrar({ existencia_total: 500 })
    assert.equal(m.existencia_total, 0)
  })

  test('editar la existencia a mano responde 400', async () => {
    await registrar()
    await assert.rejects(
      service.actualizarMaterial(1, { existencia_total: 10 }),
      (e) => e.statusCode === 400 && e.campo === 'existencia_total',
    )
  })
})

describe('HU-07 · baja lógica y bitácora', () => {
  beforeEach(async () => {
    await registrar()
  })

  test('registrar y actualizar quedan en la bitácora', async () => {
    await service.actualizarMaterial(1, { descripcion: 'Cemento blanco' }, { usuarioId: 4 })
    assert.ok(estado.bitacora.some((b) => b.accion === 'CREAR' && b.tabla === 'materiales'))
    assert.ok(estado.bitacora.some((b) => b.accion === 'ACTUALIZAR' && b.usuarioId === 4))
  })

  test('no se da de baja un material con existencia', async () => {
    estado.materiales[0].existencia_total = 12
    await rechaza(service.darDeBajaMaterial(1), 409)
  })

  test('sin existencia se da de baja, no se edita y se puede reactivar', async () => {
    const r = await service.darDeBajaMaterial(1, { usuarioId: 4 })
    assert.equal(r.activo, 0)
    await rechaza(service.actualizarMaterial(1, { descripcion: 'X' }), 409)
    await rechaza(service.darDeBajaMaterial(1), 409)
    assert.equal((await service.reactivarMaterial(1)).activo, 1)
    await rechaza(service.reactivarMaterial(1), 409)
  })

  test('sin campos que actualizar responde 400 y un id inexistente 404', async () => {
    await rechaza(service.actualizarMaterial(1, {}), 400)
    await rechaza(service.obtenerMaterial(99), 404)
  })
})
