/**
 * HU-22: evidencias de avance (pruebas unitarias).
 *
 * Sin MySQL: el repositorio y la bitácora se reemplazan por dobles en memoria.
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = {
  seguimiento: { id: 12, actividad_id: 5, proyecto_id: 3, actividad_nombre: 'Muro' },
  filas: [],
  bitacora: [],
}

mock.module('../src/repositories/evidenciaAvanceRepository.js', {
  namedExports: {
    ultimoSeguimiento: async () => estado.seguimiento,
    crear: async (datos) => {
      estado.filas.push({ id: estado.filas.length + 1, ...datos })
      return estado.filas.length
    },
    actualizarRuta: async (id, ruta) => {
      const fila = estado.filas.find((f) => f.id === id)
      if (fila) fila.ruta_archivo = ruta
    },
    listarPorActividad: async () => estado.filas,
    recientes: async (limite) => estado.filas.slice(0, limite),
    obtener: async (id) => estado.filas.find((f) => f.id === Number(id)) ?? null,
    eliminar: async (id) => {
      estado.filas = estado.filas.filter((f) => f.id !== Number(id))
      return 1
    },
  },
})
mock.module('../src/db/bitacora.js', {
  namedExports: {
    registrar: async (e) => {
      estado.bitacora.push(e)
    },
  },
})

const {
  subirEvidencia,
  listarDeActividad,
  contenidoEvidencia,
  eliminarEvidencia,
  tipoPermitido,
  PESO_MAXIMO,
} = await import('../src/services/evidenciaAvanceService.js')

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

beforeEach(() => {
  estado.seguimiento = { id: 12, actividad_id: 5, proyecto_id: 3, actividad_nombre: 'Muro' }
  estado.filas = []
  estado.bitacora = []
})

describe('formatos permitidos', () => {
  test('acepta imágenes y PDF por tipo declarado', () => {
    assert.equal(tipoPermitido('foto.png', 'image/png'), 'image/png')
    assert.equal(tipoPermitido('acta.pdf', 'application/pdf'), 'application/pdf')
    assert.equal(tipoPermitido('foto.jpg', 'image/jpg'), 'image/jpeg')
  })

  test('si el tipo no viene lo deduce por la extensión', () => {
    assert.equal(tipoPermitido('plano.PDF', ''), 'application/pdf')
    assert.equal(tipoPermitido('foto.webp', undefined), 'image/webp')
  })

  test('rechaza otros formatos', () => {
    assert.equal(tipoPermitido('video.mp4', 'video/mp4'), null)
    assert.equal(tipoPermitido('hoja.xlsx', ''), null)
  })
})

describe('subir evidencia', () => {
  test('guarda la evidencia en el último corte de avance', async () => {
    const r = await subirEvidencia(5, { nombre_archivo: 'foto.png', tipo_archivo: 'image/png', contenido: PNG }, { usuarioId: 2 })
    assert.equal(r.tipo_archivo, 'image/png')
    assert.equal(estado.filas[0].seguimiento_id, 12)
    assert.equal(estado.filas[0].ruta_archivo, `/api/evidencias/${r.id}/archivo`)
    assert.equal(estado.bitacora[0].accion, 'SUBIR')
  })

  test('acepta el data URL completo del navegador', async () => {
    await subirEvidencia(5, {
      nombre_archivo: 'foto.png',
      tipo_archivo: 'image/png',
      contenido: `data:image/png;base64,${PNG}`,
    })
    assert.equal(estado.filas[0].archivo, PNG)
  })

  test('rechaza un formato no permitido', async () => {
    await assert.rejects(
      () => subirEvidencia(5, { nombre_archivo: 'video.mp4', tipo_archivo: 'video/mp4', contenido: PNG }),
      (e) => e.statusCode === 400 && /JPG/.test(e.message),
    )
  })

  test('rechaza archivos de más de 3 MB', async () => {
    const grande = Buffer.alloc(PESO_MAXIMO + 10, 1).toString('base64')
    await assert.rejects(
      () => subirEvidencia(5, { nombre_archivo: 'foto.png', tipo_archivo: 'image/png', contenido: grande }),
      (e) => e.statusCode === 400 && /3 MB/.test(e.message),
    )
  })

  test('rechaza el archivo vacío', async () => {
    await assert.rejects(
      () => subirEvidencia(5, { nombre_archivo: 'foto.png', tipo_archivo: 'image/png', contenido: '' }),
      (e) => e.statusCode === 400,
    )
  })

  test('exige que la actividad tenga cortes de avance', async () => {
    estado.seguimiento = null
    await assert.rejects(() => subirEvidencia(5, { nombre_archivo: 'a.png', tipo_archivo: 'image/png', contenido: PNG }), (e) => e.statusCode === 400)
  })
})

describe('consulta y descarga', () => {
  test('lista las evidencias de la actividad con su URL', async () => {
    await subirEvidencia(5, { nombre_archivo: 'foto.png', tipo_archivo: 'image/png', contenido: PNG })
    const lista = await listarDeActividad(5)
    assert.equal(lista.length, 1)
    assert.match(lista[0].url, /\/api\/evidencias\/1\/archivo/)
  })

  test('devuelve el contenido para verlo o descargarlo', async () => {
    const r = await subirEvidencia(5, { nombre_archivo: 'foto.png', tipo_archivo: 'image/png', contenido: PNG })
    const archivo = await contenidoEvidencia(r.id)
    assert.equal(archivo.tipo, 'image/png')
    assert.equal(archivo.buffer.toString('base64'), PNG)
  })

  test('elimina la evidencia y deja bitácora', async () => {
    const r = await subirEvidencia(5, { nombre_archivo: 'foto.png', tipo_archivo: 'image/png', contenido: PNG })
    await eliminarEvidencia(r.id, { usuarioId: 2 })
    assert.equal(estado.filas.length, 0)
    assert.equal(estado.bitacora.at(-1).accion, 'ELIMINAR')
  })

  test('una evidencia inexistente responde 404', async () => {
    await assert.rejects(() => contenidoEvidencia(99), (e) => e.statusCode === 404)
  })
})
