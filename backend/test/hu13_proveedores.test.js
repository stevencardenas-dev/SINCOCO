/**
 * HU-13: registro de proveedores y documentos de soporte (pruebas unitarias
 * del backend).
 *
 * Corren sin MySQL: el repositorio y la bitácora se reemplazan por dobles en
 * memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { proveedores: [], documentos: [], bitacora: [], falloDuplicadoAlInsertar: false }

mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (e) => { estado.bitacora.push(e) } },
})
mock.module('../src/repositories/proveedorRepository.js', {
  namedExports: {
    findById: async (id) => estado.proveedores.find((p) => p.id === Number(id)) ?? null,
    findByDocumento: async (doc, excluirId = null) =>
      estado.proveedores.find((p) => p.documento_identificacion === doc && p.id !== excluirId) ?? null,
    listar: async () => estado.proveedores,
    create: async (dto) => {
      if (estado.falloDuplicadoAlInsertar) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' })
      const id = estado.proveedores.length + 1
      estado.proveedores.push({ id, ...dto, estado: 'ACTIVO', activo: 1, documentos: 0 })
      return id
    },
    update: async (id, dto) => Object.assign(estado.proveedores.find((p) => p.id === Number(id)), dto),
    darDeBaja: async (id) => {
      const p = estado.proveedores.find((x) => x.id === Number(id))
      if (!p.activo) return 0
      Object.assign(p, { activo: 0, estado: 'INACTIVO' })
      return 1
    },
    reactivar: async (id) => {
      const p = estado.proveedores.find((x) => x.id === Number(id))
      if (p.activo) return 0
      Object.assign(p, { activo: 1, estado: 'ACTIVO' })
      return 1
    },
    listarDocumentos: async () => estado.documentos,
    findDocumento: async (_p, id) => estado.documentos.find((d) => d.id === Number(id)) ?? null,
    crearDocumento: async (doc) => {
      const id = estado.documentos.length + 1
      estado.documentos.push({ id, proveedor_id: Number(doc.proveedorId), tipo: doc.tipo, nombre_archivo: doc.nombre })
      return id
    },
    eliminarDocumento: async (_p, id) => {
      const antes = estado.documentos.length
      estado.documentos = estado.documentos.filter((d) => d.id !== Number(id))
      return antes - estado.documentos.length
    },
  },
})

const { RegistrarProveedorDto } = await import('../src/dtos/proveedor/RegistrarProveedorDto.js')
const { calcularDv } = await import('../src/utils/nit.js')
const servicio = await import('../src/services/proveedorService.js')

/** NIT válido: base de 9 dígitos con su dígito de verificación. */
const nit = (base) => `${base}-${calcularDv(base)}`
const NIT = nit('900123456') // 900123456-8

const cuerpo = (extra = {}) => ({
  documento_identificacion: NIT,
  razon_social: 'Proveedor de Prueba S.A.S.',
  nombre_contacto: 'Contacto Prueba',
  telefono: '3001234567',
  email: 'proveedor@example.com',
  direccion: 'Cúcuta',
  ...extra,
})

const alta = (extra) => servicio.registrarProveedor(RegistrarProveedorDto.fromRequestBody(cuerpo(extra)), { usuarioId: 1 })
const rechaza = (promesa, estadoHttp, campo) =>
  assert.rejects(promesa, (e) => e.statusCode === estadoHttp && (campo ? e.campo === campo : true))
const dtoRechaza = (extra, campo) =>
  assert.throws(() => RegistrarProveedorDto.fromRequestBody(cuerpo(extra)), (e) => e.statusCode === 400 && (!campo || e.campo === campo))

const PDF = Buffer.from('%PDF-1.4 contenido')
const PNG = Buffer.concat([Buffer.from([0x89]), Buffer.from('PNG\r\n\x1a\n')])
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])

beforeEach(() => {
  estado.proveedores = []
  estado.documentos = []
  estado.bitacora = []
  estado.falloDuplicadoAlInsertar = false
})

describe('Criterio 1 · documento único y con formato válido', () => {
  test('el cálculo del dígito de verificación coincide con el de la DIAN', () => {
    assert.equal(calcularDv('800197268'), 4)
  })

  test('un NIT válido se registra ACTIVO', async () => {
    const p = await alta()
    assert.equal(p.documento_identificacion, NIT)
    assert.equal(p.estado, 'ACTIVO')
  })

  test('puntos y espacios se normalizan antes de guardar', async () => {
    const p = await alta({ documento_identificacion: ` ${NIT.slice(0, 3)}.${NIT.slice(3, 6)}.${NIT.slice(6)} ` })
    assert.equal(p.documento_identificacion, NIT)
  })

  test('el mismo NIT escrito distinto cuenta como duplicado (409)', async () => {
    await alta()
    await rechaza(alta({ documento_identificacion: `${NIT.slice(0, 3)}.${NIT.slice(3, 6)}.${NIT.slice(6)}` }), 409, 'documento_identificacion')
  })

  test('un NIT repetido da 409 señalando el campo', async () => {
    await alta()
    await rechaza(alta(), 409, 'documento_identificacion')
  })

  test('carrera de dos altas: el error de clave única de la base también da 409', async () => {
    estado.falloDuplicadoAlInsertar = true
    await rechaza(alta(), 409, 'documento_identificacion')
  })

  test('dígito de verificación incorrecto da 400', async () => {
    await rechaza(alta({ documento_identificacion: '900123456-7' }), 400, 'documento_identificacion')
  })

  for (const malo of ['900123456', '1234567-1', '12345678901-1', 'ABC123456-7', '900123456-77', '-900123456', '900123456-', '900-123456-7', 'ABC']) {
    test(`formato inválido «${malo}» da 400`, () => dtoRechaza({ documento_identificacion: malo }, 'documento_identificacion'))
  }

  test('límites de longitud: 8 y 10 dígitos son válidos', async () => {
    const p8 = await alta({ documento_identificacion: nit('90012345') })
    const p10 = await alta({ documento_identificacion: nit('9001234567'), razon_social: 'Otro' })
    assert.ok(p8.id && p10.id)
  })

  test('un intento de inyección SQL se rechaza por formato', () =>
    dtoRechaza({ documento_identificacion: "900123456-8'; DROP TABLE proveedores;--" }, 'documento_identificacion'))
})

describe('Criterio 2 · campos obligatorios', () => {
  for (const campo of ['documento_identificacion', 'razon_social', 'nombre_contacto', 'telefono', 'email']) {
    test(`sin ${campo} da 400`, () => {
      assert.throws(
        () => RegistrarProveedorDto.fromRequestBody(cuerpo({ [campo]: '   ' })),
        (e) => e.statusCode === 400 && e.message.includes(campo),
      )
    })
  }

  test('correo y teléfono mal escritos dan 400', () => {
    dtoRechaza({ email: 'sin-arroba' })
    dtoRechaza({ telefono: 'llamar a la casa' })
  })

  test('razón social de 150 caracteres pasa y de 151 no', () => {
    RegistrarProveedorDto.fromRequestBody(cuerpo({ razon_social: 'a'.repeat(150) }))
    dtoRechaza({ razon_social: 'a'.repeat(151) })
  })

  test('la dirección es opcional', async () => {
    const p = await alta({ direccion: '' })
    assert.equal(p.direccion, null)
  })
})

describe('Criterio 3 · documentos de soporte', () => {
  let id
  beforeEach(async () => { id = (await alta()).id })

  const adjuntar = (extra = {}) =>
    servicio.adjuntarDocumento(id, { tipo: 'CERTIFICADO', nombre: 'rut.pdf', mime: 'application/pdf', contenido: PDF, ...extra }, { usuarioId: 1 })

  test('PDF, PNG y JPG válidos se adjuntan y quedan en la bitácora', async () => {
    await adjuntar()
    await adjuntar({ mime: 'image/png', contenido: PNG, nombre: 'a.png' })
    await adjuntar({ mime: 'image/jpeg', contenido: JPG, nombre: 'a.jpg' })
    assert.equal((await servicio.listarDocumentos(id)).length, 3)
    assert.equal(estado.bitacora.filter((b) => b.accion === 'ADJUNTAR_DOCUMENTO').length, 3)
  })

  test('formatos no permitidos dan 400', async () => {
    await rechaza(adjuntar({ mime: 'application/zip' }), 400, 'archivo')
    await rechaza(adjuntar({ mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 400, 'archivo')
  })

  test('un archivo cuyo contenido no corresponde al formato declarado da 400', async () => {
    await rechaza(adjuntar({ contenido: Buffer.from('MZ ejecutable disfrazado') }), 400, 'archivo')
    await rechaza(adjuntar({ mime: 'image/png', contenido: PDF }), 400, 'archivo')
  })

  test('archivo vacío da 400', () => rechaza(adjuntar({ contenido: Buffer.alloc(0) }), 400, 'archivo'))

  test('5 MB exactos pasan y 5 MB + 1 byte dan 413', async () => {
    const relleno = (n) => Buffer.concat([PDF, Buffer.alloc(n - PDF.length)])
    await adjuntar({ contenido: relleno(servicio.TAMANO_MAXIMO) })
    await rechaza(adjuntar({ contenido: relleno(servicio.TAMANO_MAXIMO + 1) }), 413, 'archivo')
  })

  test('el tipo de documento debe ser uno de la lista', () => rechaza(adjuntar({ tipo: 'FACTURA' }), 400, 'tipo'))

  test('el nombre es obligatorio y se recorta a 255', async () => {
    await rechaza(adjuntar({ nombre: '   ' }), 400, 'nombre')
    const d = await adjuntar({ nombre: 'x'.repeat(300) })
    assert.equal(d.nombre_archivo.length, 255)
  })

  test('no se adjunta a un proveedor inactivo (409) ni a uno que no existe (404)', async () => {
    await servicio.darDeBajaProveedor(id, { usuarioId: 1 })
    await rechaza(adjuntar(), 409)
    await rechaza(servicio.adjuntarDocumento(999, { tipo: 'OTRO', nombre: 'a.pdf', mime: 'application/pdf', contenido: PDF }), 404)
  })

  test('eliminar quita el documento y luego da 404', async () => {
    const d = await adjuntar()
    await servicio.eliminarDocumento(id, d.id, { usuarioId: 1 })
    assert.equal((await servicio.listarDocumentos(id)).length, 0)
    await rechaza(servicio.obtenerDocumento(id, d.id), 404)
    assert.ok(estado.bitacora.some((b) => b.accion === 'ELIMINAR_DOCUMENTO'))
  })
})

describe('Criterio 4 · solo proveedores activos', () => {
  test('un proveedor activo es elegible', async () => {
    const { id } = await alta()
    assert.equal((await servicio.exigirProveedorActivo(id)).id, id)
  })

  test('dar de baja lo deja INACTIVO y deja de ser elegible (409)', async () => {
    const { id } = await alta()
    assert.deepEqual(await servicio.darDeBajaProveedor(id, { usuarioId: 1 }), { id, activo: 0, estado: 'INACTIVO' })
    await rechaza(servicio.exigirProveedorActivo(id), 409, 'proveedor_id')
  })

  test('la baja doble y la reactivación de un activo dan 409', async () => {
    const { id } = await alta()
    await servicio.darDeBajaProveedor(id)
    await rechaza(servicio.darDeBajaProveedor(id), 409)
    await servicio.reactivarProveedor(id)
    await rechaza(servicio.reactivarProveedor(id), 409)
  })

  test('reactivar devuelve el proveedor a ACTIVO y vuelve a ser elegible', async () => {
    const { id } = await alta()
    await servicio.darDeBajaProveedor(id)
    await servicio.reactivarProveedor(id)
    assert.equal((await servicio.exigirProveedorActivo(id)).estado, 'ACTIVO')
  })

  test('un proveedor que no existe da 404', () => rechaza(servicio.exigirProveedorActivo(999), 404))

  test('un proveedor inactivo no se edita (409)', async () => {
    const { id } = await alta()
    await servicio.darDeBajaProveedor(id)
    await rechaza(servicio.actualizarProveedor(id, RegistrarProveedorDto.fromRequestBody(cuerpo())), 409)
  })
})

describe('Edición', () => {
  test('conservar el NIT de un proveedor anterior a la regla del dígito no falla', async () => {
    estado.proveedores.push({ id: 1, documento_identificacion: '800000001-1', razon_social: 'Antiguo', activo: 1, estado: 'ACTIVO' })
    const p = await servicio.actualizarProveedor(
      1,
      RegistrarProveedorDto.fromRequestBody(cuerpo({ documento_identificacion: '800000001-1', razon_social: 'Antiguo S.A.S.' })),
    )
    assert.equal(p.razon_social, 'Antiguo S.A.S.')
  })

  test('cambiar a un NIT que ya tiene otro proveedor da 409', async () => {
    await alta()
    const { id } = await alta({ documento_identificacion: nit('900765432'), razon_social: 'Otro' })
    await rechaza(servicio.actualizarProveedor(id, RegistrarProveedorDto.fromRequestBody(cuerpo())), 409, 'documento_identificacion')
  })

  test('cambiar a un NIT con dígito incorrecto da 400', async () => {
    const { id } = await alta()
    await rechaza(
      servicio.actualizarProveedor(id, RegistrarProveedorDto.fromRequestBody(cuerpo({ documento_identificacion: '900765432-0' }))),
      400,
      'documento_identificacion',
    )
  })
})
