/**
 * HU-06: historial de asignaciones de un trabajador (pruebas unitarias).
 *
 * Corren sin MySQL: el repositorio de asignaciones y el de trabajadores se
 * reemplazan por dobles en memoria, de modo que se prueban las reglas del
 * service y la generación del documento.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { trabajador: null, asignaciones: [], ultimaConsulta: null }

mock.module('../src/repositories/asignacionRepository.js', {
  namedExports: {
    historialTrabajador: async (trabajadorId, opciones = {}) => {
      estado.ultimaConsulta = { trabajadorId, ...opciones }
      return estado.asignaciones
    },
  },
})

mock.module('../src/repositories/trabajadorRepository.js', {
  namedExports: {
    findById: async (id) =>
      estado.trabajador && Number(estado.trabajador.id) === Number(id) ? { ...estado.trabajador } : null,
  },
})

const { historialDeTrabajador, documentoHistorial } = await import(
  '../src/services/historialAsignacionService.js'
)

const trabajador = {
  id: 7,
  nombres: 'Ana',
  apellidos: 'Rojas',
  tipo_documento: 'CC',
  numero_documento: '1090123',
  cargo: 'Maestro de obra',
}

const asignacion = {
  id: 1,
  proyecto_nombre: 'Torre Norte',
  proyecto_codigo: 'PR-01',
  proyecto_activo: 1,
  actividad_nombre: 'Cimentación',
  rol_en_proyecto: 'Maestro',
  fecha_inicio: '2026-02-01',
  fecha_fin_programada: '2026-03-01',
  fecha_fin_real: '2026-03-04',
  estado: 'FINALIZADO',
}

beforeEach(() => {
  estado.trabajador = { ...trabajador }
  estado.asignaciones = [{ ...asignacion }]
  estado.ultimaConsulta = null
})

describe('historialDeTrabajador', () => {
  test('devuelve el trabajador, sus asignaciones y los filtros aplicados', async () => {
    const r = await historialDeTrabajador(7)

    assert.equal(r.total, 1)
    assert.equal(r.trabajador.id, 7)
    assert.equal(r.trabajador.numero_documento, '1090123')
    assert.equal(r.asignaciones[0].proyecto_nombre, 'Torre Norte')
    assert.deepEqual(r.filtros, { incluir_inactivos: false })
  })

  test('por omisión excluye los proyectos dados de baja', async () => {
    await historialDeTrabajador(7)
    assert.equal(estado.ultimaConsulta.incluirInactivos, false)
  })

  test('el filtro incluir_inactivos llega al repositorio', async () => {
    const r = await historialDeTrabajador(7, { incluirInactivos: true })
    assert.equal(estado.ultimaConsulta.incluirInactivos, true)
    assert.deepEqual(r.filtros, { incluir_inactivos: true })
  })

  test('un trabajador inexistente responde 404', async () => {
    await assert.rejects(() => historialDeTrabajador(99), (err) => err.statusCode === 404)
  })

  test('un identificador inválido responde 400', async () => {
    await assert.rejects(() => historialDeTrabajador('abc'), (err) => err.statusCode === 400)
    await assert.rejects(() => historialDeTrabajador(0), (err) => err.statusCode === 400)
  })

  test('un trabajador sin asignaciones devuelve la lista vacía', async () => {
    estado.asignaciones = []
    const r = await historialDeTrabajador(7)
    assert.deepEqual(r.asignaciones, [])
    assert.equal(r.total, 0)
  })
})

describe('documentoHistorial', () => {
  test('incluye el trabajador, las asignaciones, los filtros y la fecha de generación', async () => {
    const historial = await historialDeTrabajador(7)
    const { nombreArchivo, contenido } = documentoHistorial(historial, {
      generadoEn: new Date('2026-11-19T15:30:00Z'),
    })

    assert.equal(nombreArchivo, 'historial-asignaciones-1090123.html')
    assert.match(contenido, /Ana Rojas/)
    assert.match(contenido, /Torre Norte/)
    assert.match(contenido, /Finalizado/)
    assert.match(contenido, /proyectos dados de baja excluidos/)
    assert.match(contenido, /Generado:/)
  })

  test('marca los proyectos dados de baja cuando se incluyen', async () => {
    estado.asignaciones = [{ ...asignacion, proyecto_activo: 0 }]
    const historial = await historialDeTrabajador(7, { incluirInactivos: true })
    const { contenido } = documentoHistorial(historial)

    assert.match(contenido, /\(dado de baja\)/)
    assert.match(contenido, /proyectos dados de baja incluidos/)
  })

  test('escapa el HTML de los datos y avisa cuando no hay asignaciones', () => {
    const { contenido } = documentoHistorial({
      trabajador: { ...trabajador, nombres: '<script>alert(1)</script>' },
      asignaciones: [],
      filtros: { incluir_inactivos: false },
    })

    assert.doesNotMatch(contenido, /<script>alert\(1\)<\/script>/)
    assert.match(contenido, /&lt;script&gt;/)
    assert.match(contenido, /Sin asignaciones registradas/)
  })
})
