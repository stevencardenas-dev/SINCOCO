/**
 * HU-10: catálogo de herramientas (pruebas unitarias del backend).
 *
 * Corren sin MySQL: el repositorio y la bitácora se reemplazan por dobles en
 * memoria, de modo que se prueban las reglas del service, el DTO y la entity.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { herramientas: [], almacenes: [], bitacora: [], falloInsert: null, bajaAfectadas: null }

const { Herramienta } = await import('../src/entities/Herramienta.js')

// Igual que el repositorio real: las filas salen convertidas en la entity.
const copia = (h) => (h ? Herramienta.fromRow({ ...h }) : null)

mock.module('../src/repositories/herramientaRepository.js', {
  namedExports: {
    findById: async (id) => copia(estado.herramientas.find((h) => h.id === Number(id))),
    findBySerial: async (serial) => copia(estado.herramientas.find((h) => h.codigo_serial === serial)),
    findAlmacen: async (id) => copia(estado.almacenes.find((a) => a.id === Number(id))),
    listar: async () => estado.herramientas.map(copia),
    listarAlmacenes: async () => estado.almacenes.map(copia),
    create: async (dto) => {
      if (estado.falloInsert) throw estado.falloInsert
      const id = estado.herramientas.length + 1
      estado.herramientas.push({ id, activo: 1, ...dto })
      return id
    },
    update: async (id, campos) => {
      const h = estado.herramientas.find((x) => x.id === Number(id))
      Object.assign(h, campos)
      return 1
    },
    darDeBaja: async (id) => {
      if (estado.bajaAfectadas !== null) return estado.bajaAfectadas
      const h = estado.herramientas.find((x) => x.id === Number(id))
      h.activo = 0
      h.disponibilidad = 'BAJA'
      return 1
    },
    reactivar: async (id) => {
      const h = estado.herramientas.find((x) => x.id === Number(id))
      if (h.activo) return 0
      h.activo = 1
      h.disponibilidad = 'DISPONIBLE'
      return 1
    },
  },
})
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (entrada) => { estado.bitacora.push(entrada) } },
})

const service = await import('../src/services/herramientaService.js')
const { RegistrarHerramientaDto } = await import('../src/dtos/herramienta/RegistrarHerramientaDto.js')
const cuerpo = (extra = {}) => ({ codigo_serial: 'HR-9001', nombre: 'Taladro', almacen_id: 1, ...extra })
const rechaza = (promesa, estadoHttp) =>
  assert.rejects(promesa, (e) => e.statusCode === estadoHttp)

beforeEach(() => {
  estado.herramientas = []
  estado.almacenes = [
    { id: 1, codigo: 'ALM-1', nombre: 'Central', activo: 1 },
    { id: 2, codigo: 'ALM-2', nombre: 'Cerrado', activo: 0 },
  ]
  estado.bitacora = []
  estado.falloInsert = null
  estado.bajaAfectadas = null
})

describe('HU-10 · criterio 1: codigo_serial único y obligatorio', () => {
  test('sin serial el DTO responde 400', () => {
    assert.throws(
      () => RegistrarHerramientaDto.fromRequestBody(cuerpo({ codigo_serial: '  ' })),
      (e) => e.statusCode === 400 && e.campo === 'codigo_serial',
    )
  })

  test('un serial repetido responde 409', async () => {
    await service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo()))
    await rechaza(
      service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo({ nombre: 'Otro' }))),
      409,
    )
  })

  test('una alta simultánea que choca con el UNIQUE de MySQL responde 409, no 500', async () => {
    estado.falloInsert = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' })
    await assert.rejects(
      service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo())),
      (e) => e.statusCode === 409 && e.campo === 'codigo_serial',
    )
  })

  test('un error de base distinto no se disfraza de duplicado', async () => {
    estado.falloInsert = Object.assign(new Error('conexión perdida'), { code: 'ECONNRESET' })
    await assert.rejects(
      service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo())),
      (e) => e.statusCode === undefined && e.code === 'ECONNRESET',
    )
  })

  test('editar a un serial ajeno responde 409', async () => {
    await service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo()))
    await service.registrarHerramienta(
      RegistrarHerramientaDto.fromRequestBody(cuerpo({ codigo_serial: 'HR-9002' })),
    )
    await rechaza(service.actualizarHerramienta(2, { codigo_serial: 'HR-9001' }), 409)
  })
})

describe('HU-10 · criterio 2: toda herramienta tiene un almacén', () => {
  test('sin almacén el DTO responde 400', () => {
    assert.throws(
      () => RegistrarHerramientaDto.fromRequestBody(cuerpo({ almacen_id: '' })),
      (e) => e.statusCode === 400 && e.campo === 'almacen_id',
    )
  })

  test('un almacén inexistente o dado de baja responde 400', async () => {
    await rechaza(
      service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo({ almacen_id: 99 }))),
      400,
    )
    await rechaza(
      service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo({ almacen_id: 2 }))),
      400,
    )
  })
})

describe('HU-10 · criterio 3: estado operativo y disponibilidad', () => {
  test('una herramienta nueva queda DISPONIBLE y EXCELENTE por defecto', () => {
    const dto = RegistrarHerramientaDto.fromRequestBody(cuerpo())
    assert.equal(dto.disponibilidad, 'DISPONIBLE')
    assert.equal(dto.estado_operativo, 'EXCELENTE')
  })

  test('un estado operativo inválido responde 400', () => {
    assert.throws(
      () => RegistrarHerramientaDto.fromRequestBody(cuerpo({ estado_operativo: 'ROTA' })),
      (e) => e.statusCode === 400,
    )
  })

  test('solo es prestable si está activa, disponible y en buen estado', () => {
    const base = { id: 1, activo: 1, disponibilidad: 'DISPONIBLE', estado_operativo: 'BUENO' }
    assert.equal(new Herramienta(base).prestable, true)
    assert.equal(new Herramienta({ ...base, estado_operativo: 'REGULAR' }).prestable, true)
    assert.equal(new Herramienta({ ...base, estado_operativo: 'DANIADA' }).prestable, false)
    assert.equal(new Herramienta({ ...base, estado_operativo: 'EN_MANTENIMIENTO' }).prestable, false)
    assert.equal(new Herramienta({ ...base, disponibilidad: 'PRESTADA' }).prestable, false)
    assert.equal(new Herramienta({ ...base, disponibilidad: 'EN_TRASLADO' }).prestable, false)
    assert.equal(new Herramienta({ ...base, activo: 0, disponibilidad: 'BAJA' }).prestable, false)
  })

  test('la disponibilidad no se escribe a mano al editar', async () => {
    await service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo()))
    await rechaza(service.actualizarHerramienta(1, { disponibilidad: 'PRESTADA' }), 400)
  })
})

describe('HU-10 · criterio 4: las herramientas dadas de baja no son prestables', () => {
  beforeEach(async () => {
    await service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo()))
  })

  test('la baja deja la herramienta en BAJA y la bitácora la registra', async () => {
    const r = await service.darDeBajaHerramienta(1, { usuarioId: 7 })
    assert.equal(r.disponibilidad, 'BAJA')
    assert.equal((await service.obtenerHerramienta(1)).prestable, false)
    assert.ok(estado.bitacora.some((b) => b.accion === 'DAR_DE_BAJA' && b.usuarioId === 7))
  })

  test('no se da de baja una herramienta prestada o en traslado', async () => {
    for (const disponibilidad of ['PRESTADA', 'EN_TRASLADO']) {
      estado.herramientas[0].disponibilidad = disponibilidad
      await rechaza(service.darDeBajaHerramienta(1), 409)
    }
  })

  test('si sale a préstamo entre la lectura y el UPDATE, la baja se rechaza', async () => {
    estado.bajaAfectadas = 0
    // La lectura inicial la ve disponible; al releer ya está prestada.
    let lecturas = 0
    const original = estado.herramientas[0]
    Object.defineProperty(estado.herramientas, '0', {
      configurable: true,
      get: () => ({ ...original, disponibilidad: ++lecturas > 1 ? 'PRESTADA' : 'DISPONIBLE' }),
    })
    await assert.rejects(
      service.darDeBajaHerramienta(1),
      (e) => e.statusCode === 409 && /préstamo o traslado/.test(e.message),
    )
  })

  test('una herramienta ya dada de baja no se vuelve a dar de baja ni se edita', async () => {
    await service.darDeBajaHerramienta(1)
    await rechaza(service.darDeBajaHerramienta(1), 409)
    await rechaza(service.actualizarHerramienta(1, { nombre: 'Nuevo' }), 409)
  })

  test('reactivar la deja DISPONIBLE; reactivar una activa responde 409', async () => {
    await service.darDeBajaHerramienta(1)
    const r = await service.reactivarHerramienta(1)
    assert.equal(r.disponibilidad, 'DISPONIBLE')
    await rechaza(service.reactivarHerramienta(1), 409)
  })
})

describe('HU-10 · edición', () => {
  test('sin campos que actualizar responde 400 y no escribe en bitácora', async () => {
    await service.registrarHerramienta(RegistrarHerramientaDto.fromRequestBody(cuerpo()))
    const antes = estado.bitacora.length
    await rechaza(service.actualizarHerramienta(1, {}), 400)
    assert.equal(estado.bitacora.length, antes)
  })

  test('una herramienta inexistente responde 404', async () => {
    await rechaza(service.obtenerHerramienta(99), 404)
  })
})
