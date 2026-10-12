/**
 * HU-17: consulta de la bitácora de trazabilidad (pruebas unitarias del backend).
 *
 * Corren sin MySQL: `db/pool.js` se reemplaza por un doble que guarda cada
 * consulta SQL y responde con datos mínimos. Así se prueban las validaciones
 * del service y la forma de las consultas del repositorio.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const consultas = []
let filasBitacora = []
let nombres = []

const compactar = (sql) => sql.replace(/\s+/g, ' ').trim()

mock.module('../src/db/pool.js', {
  namedExports: {
    pool: {
      query: async (sql, params = []) => {
        const s = compactar(sql)
        consultas.push({ sql: s, params })
        if (s.startsWith('SELECT COUNT(*)')) return [[{ total: filasBitacora.length }]]
        if (s.includes('FROM bitacora_trazabilidad b')) return [filasBitacora]
        if (s.startsWith('SELECT id, ')) return [nombres]
        return [[]]
      },
    },
  },
})

const { consultarBitacora, esFechaReal } = await import('../src/services/auditoriaService.js')
const { tieneNombreEntidad } = await import('../src/repositories/auditoriaRepository.js')

const rechaza = (promesa, estado = 400) => assert.rejects(promesa, (e) => e.statusCode === estado)
const consultaDe = (inicio) => consultas.find((c) => c.sql.startsWith(inicio))

beforeEach(() => {
  consultas.length = 0
  filasBitacora = []
  nombres = []
})

describe('HU-17 · criterio 4: filtros de la consulta', () => {
  test('filtra por usuario (id), tabla afectada y rango de fechas', async () => {
    await consultarBitacora({ usuario: '7', tabla: 'materiales', desde: '2026-10-01', hasta: '2026-10-31' })
    const listado = consultaDe('SELECT b.id')
    assert.match(listado.sql, /b\.usuario_id = \?/)
    assert.match(listado.sql, /b\.tabla_afectada = \?/)
    assert.match(listado.sql, /b\.fecha_registro >= \?/)
    assert.match(listado.sql, /b\.fecha_registro <= \?/)
    assert.deepEqual(listado.params.slice(0, 4), [7, 'materiales', '2026-10-01 00:00:00', '2026-10-31 23:59:59'])
  })

  test('un usuario no numérico se filtra por username', async () => {
    await consultarBitacora({ usuario: 'admin' })
    assert.match(consultaDe('SELECT b.id').sql, /u\.username = \?/)
  })

  test('los filtros nunca se interpolan en el SQL: van como parámetros', async () => {
    await consultarBitacora({ tabla: "x'; DROP TABLE usuarios; --" })
    const listado = consultaDe('SELECT b.id')
    assert.ok(!listado.sql.includes('DROP'))
    assert.ok(listado.params.includes("x'; DROP TABLE usuarios; --"))
  })

  test('el conteo solo une usuarios cuando se filtra por username', async () => {
    await consultarBitacora({ tabla: 'materiales' })
    assert.ok(!consultaDe('SELECT COUNT(*)').sql.includes('JOIN usuarios'))
    consultas.length = 0
    await consultarBitacora({ usuario: 'admin' })
    assert.match(consultaDe('SELECT COUNT(*)').sql, /LEFT JOIN usuarios u/)
  })

  test('la paginación se acota: límite máximo 200 y página mínima 1', async () => {
    const r = await consultarBitacora({ limite: '9999', pagina: '-3' })
    assert.equal(r.limite, 200)
    assert.equal(r.pagina, 1)
  })
})

describe('HU-17 · validación de fechas', () => {
  test('esFechaReal acepta fechas del calendario y rechaza las imposibles', () => {
    assert.equal(esFechaReal('2026-10-12'), true)
    assert.equal(esFechaReal('2028-02-29'), true)
    assert.equal(esFechaReal('2026-02-29'), false)
    assert.equal(esFechaReal('2026-02-31'), false)
    assert.equal(esFechaReal('2026-13-01'), false)
    assert.equal(esFechaReal('2026-00-10'), false)
    assert.equal(esFechaReal('12/10/2026'), false)
  })

  test('una fecha con formato incorrecto o imposible responde 400', async () => {
    await rechaza(consultarBitacora({ desde: '12/10/2026' }))
    await rechaza(consultarBitacora({ desde: '2026-02-31' }))
    await rechaza(consultarBitacora({ hasta: '2026-13-01' }))
  })

  test('desde posterior a hasta responde 400', async () => {
    await rechaza(consultarBitacora({ desde: '2026-10-20', hasta: '2026-10-01' }))
  })

  test('una fecha inválida no llega a consultar la base', async () => {
    await rechaza(consultarBitacora({ desde: '2026-02-31' }))
    assert.equal(consultas.length, 0)
  })
})

describe('HU-17 · criterio 1: nombre legible del registro afectado', () => {
  test('conoce las tablas de los módulos de inventario', () => {
    for (const tabla of ['materiales', 'herramientas', 'usuarios', 'proyectos', 'actividades']) {
      assert.equal(tieneNombreEntidad(tabla), true, tabla)
    }
    assert.equal(tieneNombreEntidad('tabla_inexistente'), false)
  })

  test('resuelve el nombre de un material y de una herramienta', async () => {
    filasBitacora = [
      { id: 1, accion: 'CREAR', tabla_afectada: 'materiales', registro_id: 5 },
      { id: 2, accion: 'CREAR', tabla_afectada: 'herramientas', registro_id: 9 },
    ]
    nombres = [{ id: 5, nombre: 'MAT-001 · Cemento' }]
    const r = await consultarBitacora({})
    assert.equal(r.filas.find((f) => f.id === 1).entidad, 'MAT-001 · Cemento')
    assert.ok(consultas.some((c) => /FROM materiales WHERE id IN/.test(c.sql)))
    assert.ok(consultas.some((c) => /FROM herramientas WHERE id IN/.test(c.sql)))
  })

  test('una tabla sin nombre conocido se consulta sin interpolarla en el SQL', async () => {
    filasBitacora = [{ id: 1, accion: 'CREAR', tabla_afectada: 'x; DROP TABLE usuarios', registro_id: 1 }]
    const r = await consultarBitacora({})
    assert.equal(r.filas[0].entidad, null)
    assert.ok(!consultas.some((c) => c.sql.includes('DROP')))
  })
})

describe('HU-17 · criterio 2: la consulta es de solo lectura', () => {
  test('el service solo emite SELECT', async () => {
    filasBitacora = [{ id: 1, accion: 'CREAR', tabla_afectada: 'materiales', registro_id: 5 }]
    await consultarBitacora({ usuario: 'admin', tabla: 'materiales', desde: '2026-10-01' })
    assert.ok(consultas.length > 0)
    for (const c of consultas) assert.match(c.sql, /^SELECT /, c.sql)
  })
})
