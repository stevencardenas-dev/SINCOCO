/**
 * HU-05: asignación de maestros o responsables a un proyecto o actividad
 * (pruebas unitarias del backend).
 *
 * Corren sin MySQL: los repositorios, el control de permisos y la bitácora se
 * reemplazan por dobles en memoria, de modo que se prueban las reglas del
 * service y del DTO.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { asignaciones: [], solapada: false, escrituras: [], bitacora: [] }
const hoy = new Date().toISOString().slice(0, 10)
const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

mock.module('../src/repositories/asignacionRepository.js', {
  namedExports: {
    findById: async (id) => {
      const a = estado.asignaciones.find((x) => x.id === Number(id))
      return a ? { ...a } : null
    },
    existeActiva: async () => null,
    existeSolapada: async () => (estado.solapada ? { id: 99 } : null),
    create: async (a) => {
      const id = estado.asignaciones.length + 1
      estado.asignaciones.push({ id, fecha_fin_real: null, ...a })
      estado.escrituras.push({ tipo: 'create', ...a })
      return id
    },
    update: async (id, campos) => {
      Object.assign(estado.asignaciones.find((x) => x.id === Number(id)), campos)
      estado.escrituras.push({ tipo: 'update', id, ...campos })
    },
    listar: async () => estado.asignaciones,
  },
})
mock.module('../src/repositories/proyectoRepository.js', {
  namedExports: { findById: async () => ({ id: 1, activo: 1 }) },
})
mock.module('../src/repositories/trabajadorRepository.js', {
  namedExports: { findById: async () => ({ id: 5, activo: 1 }) },
})
mock.module('../src/repositories/actividadRepository.js', {
  namedExports: { findById: async () => ({ id: 3, activo: 1, proyecto_id: 1 }) },
})
mock.module('../src/repositories/usuarioRepository.js', { namedExports: {} })
mock.module('../src/middleware/permisos.js', { namedExports: { rolTienePermiso: async () => true } })
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (entrada) => { estado.bitacora.push(entrada) } },
})

const { registrarAsignacion, actualizarAsignacion, ESTADOS_ASIGNACION } = await import('../src/services/accesoService.js')
const { RegistrarAsignacionDto } = await import('../src/dtos/asignacion/RegistrarAsignacionDto.js')

const cuerpo = (extra = {}) => ({
  trabajador_id: 5,
  proyecto_id: 1,
  actividad_id: 3,
  fecha_inicio: '2026-01-10',
  fecha_fin_programada: '2026-02-10',
  rol_en_proyecto: 'Maestro de obra',
  ...extra,
})
const alta = (extra) => registrarAsignacion(RegistrarAsignacionDto.fromRequestBody(cuerpo(extra)))
const rechaza = (promesa, estadoHttp) => assert.rejects(promesa, (e) => e.statusCode === estadoHttp)

beforeEach(() => {
  estado.asignaciones = []
  estado.solapada = false
  estado.escrituras = []
  estado.bitacora = []
})

describe('HU-05 · criterio 1: datos de la asignación', () => {
  test('registra trabajador, proyecto, actividad y fechas, y nace ACTIVA', async () => {
    await alta()
    const creada = estado.escrituras.find((e) => e.tipo === 'create')
    assert.equal(creada.trabajador_id, 5)
    assert.equal(creada.proyecto_id, 1)
    assert.equal(creada.actividad_id, 3)
    assert.equal(creada.fecha_inicio, '2026-01-10')
    assert.equal(creada.fecha_fin_programada, '2026-02-10')
    assert.equal(creada.estado, 'ACTIVO')
    assert.ok(estado.bitacora.some((b) => b.accion === 'CREAR' && b.tabla === 'asignaciones_personal'))
  })

  test('la actividad es opcional: sin ella la asignación es a todo el proyecto', async () => {
    await alta({ actividad_id: '' })
    assert.equal(estado.escrituras.find((e) => e.tipo === 'create').actividad_id, null)
  })

  test('faltan trabajador, proyecto o fecha de inicio: el DTO responde 400', () => {
    for (const campo of ['trabajador_id', 'proyecto_id', 'fecha_inicio']) {
      assert.throws(
        () => RegistrarAsignacionDto.fromRequestBody(cuerpo({ [campo]: '' })),
        (e) => e.statusCode === 400,
        campo,
      )
    }
  })

  test('el fin programado no puede ser anterior al inicio', async () => {
    await rechaza(alta({ fecha_inicio: '2026-03-01', fecha_fin_programada: '2026-02-01' }), 400)
  })
})

describe('HU-05 · criterio 2: sin solapamiento de fechas', () => {
  test('una asignación que se cruza con otra activa del trabajador responde 409', async () => {
    estado.solapada = true
    await assert.rejects(alta(), (e) => e.statusCode === 409 && /solapan/.test(e.message))
    assert.equal(estado.escrituras.length, 0)
  })

  test('sin cruce se confirma', async () => {
    await alta()
    assert.equal(estado.escrituras.length, 1)
  })
})

describe('HU-05 · criterio 3: estado vigente, finalizada o cancelada', () => {
  beforeEach(async () => {
    await alta()
  })

  test('el catálogo de estados incluye CANCELADO', () => {
    assert.deepEqual(ESTADOS_ASIGNACION, ['ACTIVO', 'FINALIZADO', 'REASIGNADO', 'CANCELADO'])
  })

  test('finalizar deja la asignación FINALIZADA con la fecha de hoy', async () => {
    const a = await actualizarAsignacion(1, { estado: 'finalizado' })
    assert.equal(a.estado, 'FINALIZADO')
    assert.equal(a.fecha_fin_real, hoy)
  })

  test('cancelar deja la asignación CANCELADA sin fecha fin real', async () => {
    const a = await actualizarAsignacion(1, { estado: 'CANCELADO' })
    assert.equal(a.estado, 'CANCELADO')
    assert.equal(a.fecha_fin_real, null)
  })

  test('una asignación cerrada no cambia de estado: se registra una nueva', async () => {
    await actualizarAsignacion(1, { estado: 'CANCELADO' })
    await rechaza(actualizarAsignacion(1, { estado: 'ACTIVO' }), 409)
    await rechaza(actualizarAsignacion(1, { estado: 'FINALIZADO' }), 409)
  })

  test('un estado desconocido responde 400', async () => {
    await rechaza(actualizarAsignacion(1, { estado: 'PAUSADO' }), 400)
  })

  test('cada cambio de estado queda en la bitácora', async () => {
    await actualizarAsignacion(1, { estado: 'CANCELADO' }, { usuarioId: 2 })
    assert.ok(estado.bitacora.some((b) => b.accion === 'ACTUALIZAR' && b.usuarioId === 2))
  })
})

describe('HU-05 · criterio 4: la fecha fin real libera al trabajador', () => {
  beforeEach(async () => {
    await alta()
  })

  test('registrar la fecha fin real finaliza la asignación', async () => {
    const a = await actualizarAsignacion(1, { fecha_fin_real: ayer })
    assert.equal(a.estado, 'FINALIZADO')
    assert.equal(a.fecha_fin_real, ayer)
  })

  test('la fecha fin real no puede ser futura ni anterior al inicio', async () => {
    const manana = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
    await rechaza(actualizarAsignacion(1, { fecha_fin_real: manana }), 400)
    await rechaza(actualizarAsignacion(1, { fecha_fin_real: '2025-12-31' }), 400)
  })

  test('una fecha fin real no se combina con el estado ACTIVO', async () => {
    await rechaza(actualizarAsignacion(1, { fecha_fin_real: ayer, estado: 'ACTIVO' }), 400)
  })

  test('una fecha inválida responde 400', async () => {
    await rechaza(actualizarAsignacion(1, { fecha_fin_real: 'no-es-fecha' }), 400)
  })

  test('una asignación inexistente responde 404 y sin cambios responde 400', async () => {
    await rechaza(actualizarAsignacion(99, { estado: 'FINALIZADO' }), 404)
    await rechaza(actualizarAsignacion(1, {}), 400)
  })
})
