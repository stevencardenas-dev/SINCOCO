/**
 * HU-24: alertas de actividades atrasadas y herramientas pendientes de
 * devolución (pruebas unitarias).
 *
 * Corren sin MySQL: los repositorios, el correo y la bitácora se reemplazan por
 * dobles en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = { actividades: [], prestamos: [], alertas: [], creadas: [], correo: [] }

mock.module('../src/repositories/actividadRepository.js', {
  namedExports: { atrasadas: async () => estado.actividades },
})
mock.module('../src/repositories/prestamoHerramientaRepository.js', {
  namedExports: { vencidos: async () => estado.prestamos },
})
mock.module('../src/repositories/alertaRepository.js', {
  namedExports: {
    findById: async (id) => estado.alertas.find((a) => Number(a.id) === Number(id)) ?? null,
    crearSiNoExiste: async (datos) => {
      const ya = estado.creadas.some(
        (c) => c.tipo === datos.tipo && Number(c.referenciaId) === Number(datos.referenciaId),
      )
      if (ya) return false
      estado.creadas.push(datos)
      return true
    },
  },
})
mock.module('../src/services/correoService.js', {
  namedExports: {
    enviarRecordatorioAlerta: async (envio) => {
      estado.correo.push(envio)
      return estado.correoFalla !== true
    },
  },
})
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async () => {} },
})

const { diasDeAtraso, severidadPorDias, severidadDe, evaluarAtrasos, recordarAlerta } = await import(
  '../src/services/alertaOperativaService.js'
)

const hoy = new Date('2026-11-19T10:00:00')
const actividad = {
  id: 5,
  nombre: 'Vaciado de losa',
  proyecto_nombre: 'Torre Norte',
  fecha_fin_programada: '2026-11-10',
  porcentaje_avance: 40,
  responsable_nombre: 'Ana Rojas',
  responsable_email: 'ana@obra.co',
}
const prestamo = {
  id: 9,
  herramienta_codigo: 'HR-07',
  herramienta_nombre: 'Mezcladora',
  proyecto_nombre: 'Torre Norte',
  fecha_estimada_devolucion: '2026-11-01',
  trabajador_nombre: 'Luis Peña',
  trabajador_email: 'luis@obra.co',
}

beforeEach(() => {
  estado.actividades = [{ ...actividad }]
  estado.prestamos = [{ ...prestamo }]
  estado.alertas = []
  estado.creadas = []
  estado.correo = []
  estado.correoFalla = false
})

describe('días de atraso y severidad', () => {
  test('cuenta días completos y nunca negativo', () => {
    assert.equal(diasDeAtraso('2026-11-10', hoy), 9)
    assert.equal(diasDeAtraso('2026-11-19', hoy), 0)
    assert.equal(diasDeAtraso('2026-12-01', hoy), 0)
    assert.equal(diasDeAtraso(null, hoy), 0)
  })

  test('umbrales: 7 o más alta, 3 o más media, el resto baja', () => {
    assert.equal(severidadPorDias(0), 'BAJA')
    assert.equal(severidadPorDias(2), 'BAJA')
    assert.equal(severidadPorDias(3), 'MEDIA')
    assert.equal(severidadPorDias(7), 'ALTA')
  })

  test('la severidad de una alerta sale de la fecha de su referencia', () => {
    assert.equal(
      severidadDe({ tabla_referencia: 'actividades', fecha_limite_actividad: '2026-11-10' }, hoy),
      'ALTA',
    )
    assert.equal(
      severidadDe({ tabla_referencia: 'prestamos_herramientas', fecha_limite_prestamo: '2026-11-01' }, hoy),
      'ALTA',
    )
    assert.equal(severidadDe({ tabla_referencia: 'materiales' }, hoy), null)
  })
})

describe('evaluarAtrasos', () => {
  test('crea una alerta por actividad atrasada y otra por préstamo vencido', async () => {
    const r = await evaluarAtrasos()

    assert.equal(r.creadas, 2)
    assert.deepEqual(r.evaluadas, { actividades: 1, prestamos: 1 })
    const tipos = estado.creadas.map((c) => c.tipo).sort()
    assert.deepEqual(tipos, ['ACTIVIDAD_ATRASADA', 'HERRAMIENTA_PENDIENTE'])
    const esperados = diasDeAtraso(actividad.fecha_fin_programada)
    assert.ok(estado.creadas[0].descripcion.includes(String(esperados)))
    assert.equal(estado.creadas[0].tablaReferencia, 'actividades')
    assert.equal(estado.creadas[1].tablaReferencia, 'prestamos_herramientas')
  })

  test('es idempotente: no duplica una alerta pendiente de la misma referencia', async () => {
    await evaluarAtrasos()
    const r = await evaluarAtrasos()
    assert.equal(r.creadas, 0)
    assert.equal(estado.creadas.length, 2)
  })

  test('sin atrasos no crea nada', async () => {
    estado.actividades = []
    estado.prestamos = []
    const r = await evaluarAtrasos()
    assert.deepEqual(r.evaluadas, { actividades: 0, prestamos: 0 })
    assert.equal(r.creadas, 0)
  })
})

describe('recordarAlerta', () => {
  test('envía el recordatorio al responsable de la actividad', async () => {
    estado.alertas = [
      { id: 3, tipo: 'ACTIVIDAD_ATRASADA', tabla_referencia: 'actividades', referencia_id: 5, atendida: 0, titulo: 'Actividad atrasada', descripcion: '...' },
    ]
    const r = await recordarAlerta(3)

    assert.equal(r.enviado, true)
    assert.equal(r.destino, 'ana@obra.co')
    assert.equal(r.severidad, 'ALTA')
    assert.equal(estado.correo.length, 1)
    assert.match(estado.correo[0].alerta.titulo, /Actividad atrasada/)
  })

  test('responde 404 si la alerta no existe', async () => {
    await assert.rejects(() => recordarAlerta(99), (e) => e.statusCode === 404)
  })

  test('responde 409 si la alerta ya fue atendida', async () => {
    estado.alertas = [{ id: 3, tabla_referencia: 'actividades', referencia_id: 5, atendida: 1 }]
    await assert.rejects(() => recordarAlerta(3), (e) => e.statusCode === 409)
  })

  test('responde 400 si el responsable no tiene correo', async () => {
    estado.actividades = [{ ...actividad, responsable_email: null }]
    estado.alertas = [{ id: 3, tabla_referencia: 'actividades', referencia_id: 5, atendida: 0 }]
    await assert.rejects(() => recordarAlerta(3), (e) => e.statusCode === 400)
  })

  test('responde 502 si el correo no está configurado o falla', async () => {
    estado.correoFalla = true
    estado.alertas = [{ id: 3, tabla_referencia: 'actividades', referencia_id: 5, atendida: 0 }]
    await assert.rejects(() => recordarAlerta(3), (e) => e.statusCode === 502)
  })
})
