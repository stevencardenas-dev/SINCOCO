/**
 * HU-25: reportes filtrados y exportables (pruebas unitarias).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const filas = {
  COSTOS: [
    { fecha: '2026-11-10', proyecto_codigo: 'SEED-P01', proyecto: 'Los Álamos', detalle: 'Costo real · desviación -4.92%', cantidad: 1, monto: '950.75' },
  ],
  MATERIALES: [],
  SERVICIOS: [
    { fecha: '2026-11-05', proyecto_codigo: 'SEED-P02', proyecto: 'Plaza Norte', detalle: 'Flete · FINALIZADO', cantidad: 1, monto: 1200000 },
  ],
  PERSONAL: [],
}
const llamadas = []

mock.module('../src/repositories/reporteRepository.js', {
  namedExports: {
    proyectosParaFiltro: async () => [{ id: 1, codigo: 'SEED-P01', nombre: 'Los Álamos' }],
    materiales: async (f) => (llamadas.push(['MATERIALES', f]), filas.MATERIALES),
    servicios: async (f) => (llamadas.push(['SERVICIOS', f]), filas.SERVICIOS),
    personal: async (f) => (llamadas.push(['PERSONAL', f]), filas.PERSONAL),
    costos: async (f) => (llamadas.push(['COSTOS', f]), filas.COSTOS),
  },
})

const { generar, normalizarFiltros, aCsv, aHtml, exportar } = await import('../src/services/reporteService.js')

beforeEach(() => {
  llamadas.length = 0
})

describe('filtros', () => {
  test('el tipo por defecto es el costo consolidado', () => {
    assert.equal(normalizarFiltros({}).tipo, 'COSTOS')
  })

  test('rechaza un tipo desconocido', () => {
    assert.throws(() => normalizarFiltros({ tipo: 'OTRO' }), (e) => e.statusCode === 400)
  })

  test('las fechas deben ir en AAAA-MM-DD y en orden', () => {
    assert.throws(() => normalizarFiltros({ desde: '10/11/2026' }), (e) => e.statusCode === 400 && e.message.includes('AAAA-MM-DD'))
    assert.throws(() => normalizarFiltros({ desde: '2026-11-20', hasta: '2026-11-10' }), (e) => e.statusCode === 400)
  })

  test('rechaza un proyecto inválido', () => {
    assert.throws(() => normalizarFiltros({ proyecto_id: 'abc' }), (e) => e.statusCode === 400)
  })
})

describe('generar', () => {
  test('consulta el tipo pedido y resume los totales', async () => {
    const r = await generar({ tipo: 'costos' })
    assert.equal(r.filtros.tipo, 'COSTOS')
    assert.equal(r.totales.filas, 1)
    assert.equal(r.totales.monto, 950.75)
    assert.equal(r.filas[0].monto, 950.75)
    assert.equal(llamadas[0][0], 'COSTOS')
  })

  test('pasa los filtros al repositorio', async () => {
    await generar({ tipo: 'SERVICIOS', desde: '2026-11-01', hasta: '2026-11-30', proyecto_id: '2' })
    assert.deepEqual(llamadas[0][1], { tipo: 'SERVICIOS', desde: '2026-11-01', hasta: '2026-11-30', proyecto_id: 2 })
  })

  test('sin datos los totales quedan en cero', async () => {
    const r = await generar({ tipo: 'MATERIALES' })
    assert.deepEqual(r.totales, { filas: 0, cantidad: 0, monto: 0 })
  })
})

describe('exportación', () => {
  test('el CSV lleva encabezado con filtros y totales', async () => {
    const r = await generar({ tipo: 'COSTOS', desde: '2026-11-01', hasta: '2026-11-30' })
    const csv = aCsv(r)
    assert.match(csv, /Reporte: Costo consolidado/)
    assert.match(csv, /Desde: 2026-11-01 · Hasta: 2026-11-30/)
    assert.match(csv, /"Detalle";"Cantidad";"Monto"/)
    assert.match(csv, /950,75/)
    assert.match(csv, /Total filas: 1/)
  })

  test('el HTML es imprimible y repite los filtros y la fecha', async () => {
    const r = await generar({ tipo: 'SERVICIOS' })
    const html = aHtml(r)
    assert.match(html, /SINCOCO · Reporte de Servicios externos/)
    assert.match(html, /Generado:/)
    assert.match(html, /Plaza Norte/)
    assert.match(html, /@media print/)
  })

  test('exportar csv devuelve nombre, tipo y BOM para Excel', async () => {
    const r = await exportar({ tipo: 'COSTOS' }, 'csv')
    assert.match(r.nombre, /^reporte-costos-\d{4}-\d{2}-\d{2}\.csv$/)
    assert.match(r.tipo, /text\/csv/)
    assert.equal(r.contenido.charCodeAt(0), 0xfeff)
  })

  test('exportar html no lleva BOM y declara utf-8', async () => {
    const r = await exportar({ tipo: 'SERVICIOS' }, 'html')
    assert.match(r.nombre, /\.html$/)
    assert.match(r.tipo, /text\/html/)
    assert.match(r.contenido, /<!doctype html>/)
  })
})
