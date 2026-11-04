/**
 * HU-08: presupuesto de materiales por actividad (pruebas unitarias del backend).
 *
 * Corren sin MySQL: repositorios, acceso a proyectos y bitácora se reemplazan
 * por dobles en memoria, de modo que se prueban las reglas del service.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { lineas: [], catalogo: [], gestiona: true, bitacora: [] }

mock.module('../src/repositories/presupuestoMaterialRepository.js', {
  namedExports: {
    listarPorActividad: async () => estado.lineas,
    catalogo: async () => estado.catalogo,
    reemplazar: async (_, lineas) => { estado.lineas = lineas },
  },
})
mock.module('../src/repositories/actividadRepository.js', {
  namedExports: { findById: async (id) => (Number(id) === 5 ? { id: 5, etapa_id: 2, nombre: 'Cubierta' } : null) },
})
mock.module('../src/repositories/etapaRepository.js', { namedExports: { findById: async () => ({ id: 2, proyecto_id: 1 }) } })
mock.module('../src/services/accesoService.js', {
  namedExports: {
    verificarAccesoProyecto: async () => {},
    verificarGestionPlan: async () => {
      if (!estado.gestiona) throw Object.assign(new Error('Sin permiso'), { statusCode: 403 })
    },
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async (r) => { estado.bitacora.push(r) } } })

const { obtenerPresupuesto, guardarPresupuesto } = await import('../src/services/presupuestoMaterialService.js')

const ctx = { usuario: { id: 1, rol: 'ADMINISTRADOR' }, usuarioId: 1, ip: '127.0.0.1' }
const linea = (material_id, cantidad_presupuestada) => ({ material_id, cantidad_presupuestada })

beforeEach(() => {
  Object.assign(estado, { lineas: [], catalogo: [{ id: 10 }, { id: 11 }], gestiona: true, bitacora: [] })
})

describe('HU-08 · presupuesto de materiales por actividad', () => {
  test('devuelve las líneas y los materiales disponibles', async () => {
    estado.lineas = [{ material_id: 10, cantidad_presupuestada: '5.00' }]
    const r = await obtenerPresupuesto(5, ctx.usuario)
    assert.equal(r.lineas.length, 1)
    assert.equal(r.materiales.length, 2)
  })

  test('una actividad inexistente responde 404', async () => {
    await assert.rejects(() => obtenerPresupuesto(99, ctx.usuario), { statusCode: 404 })
    await assert.rejects(() => guardarPresupuesto(99, { lineas: [] }, ctx), { statusCode: 404 })
  })

  test('guarda las cantidades, redondea a 2 decimales y deja constancia en la bitácora', async () => {
    await guardarPresupuesto(5, { lineas: [linea('10', '5.126'), linea(11, 3)] }, ctx)
    assert.deepEqual(estado.lineas, [{ material_id: 10, cantidad: 5.13 }, { material_id: 11, cantidad: 3 }])
    assert.equal(estado.bitacora[0].accion, 'ACTUALIZAR_PRESUPUESTO_MATERIALES')
  })

  test('sin líneas la actividad queda sin presupuesto de materiales', async () => {
    estado.lineas = [{ material_id: 10, cantidad: 5 }]
    await guardarPresupuesto(5, { lineas: [] }, ctx)
    assert.deepEqual(estado.lineas, [])
  })

  test('rechaza cantidades inválidas, materiales repetidos y líneas que no son lista', async () => {
    for (const cantidad of [0, -1, 'x', 0.001, 1e11]) {
      await assert.rejects(() => guardarPresupuesto(5, { lineas: [linea(10, cantidad)] }, ctx), { statusCode: 400 })
    }
    await assert.rejects(() => guardarPresupuesto(5, { lineas: [linea(10, 1), linea(10, 2)] }, ctx), /repetido/)
    await assert.rejects(() => guardarPresupuesto(5, {}, ctx), { statusCode: 400, campo: 'lineas' })
    assert.deepEqual(estado.lineas, [])
  })

  test('rechaza un material fuera del catálogo disponible', async () => {
    await assert.rejects(() => guardarPresupuesto(5, { lineas: [linea(12, 1)] }, ctx), /dado de baja/)
  })

  test('solo quien gestiona el plan puede cambiarlo', async () => {
    estado.gestiona = false
    await assert.rejects(() => guardarPresupuesto(5, { lineas: [linea(10, 1)] }, ctx), { statusCode: 403 })
    assert.deepEqual(estado.lineas, [])
  })
})
