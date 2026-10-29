/**
 * HU-35: reasignación de herramientas por avería (pruebas unitarias del backend).
 *
 * Corren sin MySQL: el repositorio y la bitácora se reemplazan por dobles en memoria, de modo que se prueban las
 * reglas del service (el cierre, la reparación y la incidencia en una transacción las cubre la prueba contra la base).
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const base = () => ({
  prestamo: { id: 7, herramienta_id: 1, trabajador_id: 3, proyecto_id: 2, estado_prestamo: 'ACTIVO', fecha_estimada_devolucion: '2026-11-05' },
  herramienta: { id: 1, nombre: 'Taladro', codigo_serial: 'HR-1', estado_operativo: 'BUENO' },
  reemplazo: { id: 9, nombre: 'Taladro', codigo_serial: 'HR-9', activo: 1, disponibilidad: 'DISPONIBLE', estado_operativo: 'EXCELENTE' },
})
const estado = { datos: base(), llamadas: [], bitacora: [] }

mock.module('../src/repositories/prestamoHerramientaRepository.js', {
  namedExports: {
    findById: async (id) => ({ id: Number(id), herramienta: 'Taladro', estado_prestamo: id === 7 ? estado.datos.prestamo.estado_prestamo : 'ACTIVO', fecha_estimada_devolucion: '2026-11-05' }),
    listar: async (filtros) => { estado.filtros = filtros; return [] },
    reemplazosDisponibles: async () => [{ id: 9, nombre: 'Taladro', equivalente: true }],
    reemplazar: async (datos) => {
      const incidencia = datos.validar(estado.datos)
      estado.llamadas.push({ ...datos, incidencia })
      return {
        incidenciaId: 55, reemplazoPrestamoId: datos.reemplazoId ? 8 : null, prestamo: estado.datos.prestamo,
        herramienta: estado.datos.herramienta, reemplazo: datos.reemplazoId ? estado.datos.reemplazo : null,
      }
    },
    entregar: async () => ({}),
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (e) => { estado.bitacora.push(e) } } })

const { reemplazarHerramienta, reemplazosPosibles, listarPrestamos } = await import('../src/services/prestamoHerramientaService.js')

const ctx = { usuario: { id: 2, rol: 'ENCARGADO_BODEGA' }, usuarioId: 2, ip: '127.0.0.1' }
const cuerpo = (extra = {}) => ({ novedad: 'La broca se atascó y el motor humeó', herramienta_reemplazo_id: 9, ...extra })

beforeEach(() => {
  estado.datos = base()
  estado.llamadas = []
  estado.bitacora = []
})

describe('HU-35 · reemplazo por avería', () => {
  test('principal: cierra el averiado, genera la incidencia y entrega el reemplazo; queda en bitácora', async () => {
    const r = await reemplazarHerramienta(7, cuerpo(), ctx)
    assert.equal(r.incidencia_id, 55)
    assert.ok(r.prestamo_reemplazo)
    assert.equal(r.sugerir_solicitud, false)
    assert.match(estado.llamadas[0].incidencia.titulo, /Avería de herramienta: Taladro \(HR-1\)/)
    assert.equal(estado.llamadas[0].usuarioId, 2)
    assert.equal(estado.bitacora[0].accion, 'REEMPLAZAR_HERRAMIENTA')
    assert.equal(estado.bitacora[0].detalles.prestamo_reemplazo_id, 8)
  })

  test('Alt. 2: la novedad es obligatoria', async () => {
    await assert.rejects(() => reemplazarHerramienta(7, cuerpo({ novedad: '   ' }), ctx), { statusCode: 400, campo: 'novedad' })
    await assert.rejects(() => reemplazarHerramienta(7, cuerpo({ novedad: undefined }), ctx), { statusCode: 400, campo: 'novedad' })
    assert.equal(estado.llamadas.length, 0)
  })

  test('Alt. 1: sin reemplazo cierra solo el préstamo averiado y sugiere una solicitud (HU-30)', async () => {
    const r = await reemplazarHerramienta(7, cuerpo({ herramienta_reemplazo_id: undefined }), ctx)
    assert.equal(r.prestamo_reemplazo, null)
    assert.equal(r.sugerir_solicitud, true)
    assert.equal(r.incidencia_id, 55)
  })

  test('criterio 1: solo aplica a un préstamo vigente', async () => {
    for (const e of ['DEVUELTO']) {
      estado.datos.prestamo.estado_prestamo = e
      await assert.rejects(() => reemplazarHerramienta(7, cuerpo(), ctx), { statusCode: 409 })
    }
    for (const e of ['ACTIVO', 'ATRASADO', 'CON_NOVEDAD']) {
      estado.datos.prestamo.estado_prestamo = e
      assert.equal((await reemplazarHerramienta(7, cuerpo(), ctx)).incidencia_id, 55)
    }
  })

  test('criterio 2: el reemplazo debe estar activo, disponible y en estado prestable', async () => {
    estado.datos.reemplazo.activo = 0
    await assert.rejects(() => reemplazarHerramienta(7, cuerpo(), ctx), { statusCode: 404, campo: 'herramienta_reemplazo_id' })
    estado.datos = base(); estado.datos.reemplazo.disponibilidad = 'PRESTADA'
    await assert.rejects(() => reemplazarHerramienta(7, cuerpo(), ctx), { statusCode: 409, campo: 'herramienta_reemplazo_id' })
    estado.datos = base(); estado.datos.reemplazo.estado_operativo = 'EN_MANTENIMIENTO'
    await assert.rejects(() => reemplazarHerramienta(7, cuerpo(), ctx), { statusCode: 409, campo: 'herramienta_reemplazo_id' })
    estado.datos = base(); estado.datos.reemplazo.estado_operativo = 'DANIADA'
    await assert.rejects(() => reemplazarHerramienta(7, cuerpo(), ctx), { statusCode: 409 })
    estado.datos = base(); estado.datos.reemplazo = null
    await assert.rejects(() => reemplazarHerramienta(7, cuerpo(), ctx), { statusCode: 404 })
  })

  test('el reemplazo no puede ser la misma herramienta averiada', async () => {
    await assert.rejects(() => reemplazarHerramienta(7, cuerpo({ herramienta_reemplazo_id: 1 }), ctx), { statusCode: 400, campo: 'herramienta_reemplazo_id' })
  })

  test('un identificador de reemplazo inválido se rechaza', async () => {
    await assert.rejects(() => reemplazarHerramienta(7, cuerpo({ herramienta_reemplazo_id: 'abc' }), ctx), { statusCode: 400 })
  })
})

describe('HU-35 · consulta', () => {
  test('lista los reemplazos posibles solo de un préstamo vigente', async () => {
    assert.equal((await reemplazosPosibles(7)).length, 1)
    estado.datos.prestamo.estado_prestamo = 'DEVUELTO'
    await assert.rejects(() => reemplazosPosibles(7), { statusCode: 409 })
  })

  test('el historial de préstamos de una herramienta se filtra por herramienta_id', async () => {
    await listarPrestamos({ herramienta_id: '1' })
    assert.equal(estado.filtros.herramientaId, 1)
    await assert.rejects(() => listarPrestamos({ herramienta_id: 'x' }), { statusCode: 400 })
  })
})
