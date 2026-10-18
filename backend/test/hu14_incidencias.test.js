/**
 * HU-14: registro de incidencias de obra (pruebas unitarias del backend).
 *
 * Corren sin MySQL: los repositorios, el control de acceso, el correo y la
 * bitácora se reemplazan por dobles en memoria.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = {
  proyecto: null,
  actividad: null,
  incidencias: [],
  alertas: [],
  correos: [],
  atendidas: [],
  actualizaciones: [],
  responsable: null,
  fallaCorreo: false,
  gestionaPlan: true,
}

mock.module('../src/repositories/proyectoRepository.js', {
  namedExports: { findById: async () => estado.proyecto },
})
mock.module('../src/repositories/actividadRepository.js', {
  namedExports: { findById: async () => estado.actividad },
})
mock.module('../src/repositories/incidenciaRepository.js', {
  namedExports: {
    crear: async (datos, alerta) => {
      const id = estado.incidencias.length + 1
      estado.incidencias.push({
        id,
        ...datos,
        reportado_por_usuario_id: datos.usuarioId,
        estado: 'ABIERTA',
        fecha_incidencia: '2026-10-01 08:00:00',
        fecha_resolucion: null,
        proyecto_nombre: 'Torre',
        reportado_por: 'maestro',
      })
      if (alerta) estado.alertas.push({ ...alerta, referencia_id: id })
      return id
    },
    findById: async (id) => estado.incidencias.find((i) => i.id === Number(id)) ?? null,
    listar: async () => estado.incidencias,
    actualizar: async (id, campos) => {
      estado.actualizaciones.push({ id, campos })
      Object.assign(estado.incidencias.find((i) => i.id === Number(id)), campos)
    },
    atenderAlerta: async (id) => estado.atendidas.push(id),
    responsableDelProyecto: async () => estado.responsable,
    actividadesConIncidenciaGrave: async () => [],
  },
})
mock.module('../src/services/accesoService.js', {
  namedExports: {
    alcanceDeUsuario: async () => ({ total: true, trabajadorId: null }),
    verificarAccesoProyecto: async () => ({}),
    verificarGestionPlan: async () => {
      if (!estado.gestionaPlan) {
        const { AppError } = await import('../src/utils/AppError.js')
        throw new AppError('Solo el líder del proyecto, el gerente o el administrador pueden modificar etapas y actividades', 403)
      }
    },
  },
})
mock.module('../src/services/correoService.js', {
  namedExports: {
    enviarAvisoIncidencia: async (datos) => {
      if (estado.fallaCorreo) throw new Error('smtp caído')
      estado.correos.push(datos)
      return Boolean(datos.destino)
    },
  },
})
mock.module('../src/db/bitacora.js', { namedExports: { registrar: async () => {} } })

const { RegistrarIncidenciaDto } = await import('../src/dtos/incidencia/RegistrarIncidenciaDto.js')
const { registrarIncidencia, actualizarIncidencia } = await import('../src/services/incidenciaService.js')

const cuerpo = (extra = {}) => ({
  proyecto_id: 1,
  tipo: 'averia',
  titulo: 'Se rompió la mezcladora',
  descripcion: 'La mezcladora dejó de girar durante el vaciado.',
  severidad: 'media',
  ...extra,
})
const ctx = { usuario: { id: 7, rol: 'MAESTRO_OBRA' }, usuarioId: 7, ip: '127.0.0.1' }

beforeEach(() => {
  estado.proyecto = { id: 1, nombre: 'Torre', activo: 1 }
  estado.actividad = { id: 5, proyecto_id: 1, activo: 1 }
  estado.incidencias = []
  estado.alertas = []
  estado.correos = []
  estado.atendidas = []
  estado.actualizaciones = []
  estado.responsable = { nombre: 'Lider Obra', email: 'lider@obra.co' }
  estado.fallaCorreo = false
  estado.gestionaPlan = true
})

describe('HU-14 · criterio 1: datos obligatorios', () => {
  for (const campo of ['proyecto_id', 'titulo', 'descripcion', 'severidad', 'tipo']) {
    test(`rechaza el registro sin ${campo}`, () => {
      assert.throws(
        () => RegistrarIncidenciaDto.fromRequestBody(cuerpo({ [campo]: '' })),
        (e) => e.statusCode === 400 && e.campo === campo,
      )
    })
  }

  test('rechaza una severidad o un tipo fuera del catálogo', () => {
    assert.throws(() => RegistrarIncidenciaDto.fromRequestBody(cuerpo({ severidad: 'enorme' })), { statusCode: 400 })
    assert.throws(() => RegistrarIncidenciaDto.fromRequestBody(cuerpo({ tipo: 'robo' })), { statusCode: 400 })
  })

  test('normaliza a mayúsculas y deja la actividad y la evidencia como opcionales', () => {
    const dto = RegistrarIncidenciaDto.fromRequestBody(cuerpo())
    assert.equal(dto.tipo, 'AVERIA')
    assert.equal(dto.severidad, 'MEDIA')
    assert.equal(dto.actividad_id, null)
    assert.equal(dto.evidencia, null)
  })
})

describe('HU-14 · criterio 2: actividad asociada', () => {
  test('acepta una actividad del mismo proyecto', async () => {
    const r = await registrarIncidencia(RegistrarIncidenciaDto.fromRequestBody(cuerpo({ actividad_id: 5 })), ctx)
    assert.equal(r.actividad_id, 5)
  })

  test('rechaza una actividad de otro proyecto', async () => {
    estado.actividad = { id: 5, proyecto_id: 2, activo: 1 }
    await assert.rejects(
      registrarIncidencia(RegistrarIncidenciaDto.fromRequestBody(cuerpo({ actividad_id: 5 })), ctx),
      { statusCode: 400 },
    )
  })

  test('rechaza un proyecto dado de baja', async () => {
    estado.proyecto = { id: 1, nombre: 'Torre', activo: 0 }
    await assert.rejects(registrarIncidencia(RegistrarIncidenciaDto.fromRequestBody(cuerpo()), ctx), { statusCode: 400 })
  })
})

describe('HU-14 · criterio 4: notificación por severidad alta', () => {
  test('una incidencia media no genera alerta ni correo', async () => {
    const r = await registrarIncidencia(RegistrarIncidenciaDto.fromRequestBody(cuerpo()), ctx)
    assert.equal(r.alerta_generada, false)
    assert.equal(estado.alertas.length, 0)
    assert.equal(estado.correos.length, 0)
  })

  for (const severidad of ['alta', 'critica']) {
    test(`una incidencia ${severidad} genera alerta y avisa al responsable`, async () => {
      const r = await registrarIncidencia(RegistrarIncidenciaDto.fromRequestBody(cuerpo({ severidad })), ctx)
      assert.equal(r.alerta_generada, true)
      assert.equal(r.correo_enviado, true)
      assert.equal(estado.alertas.length, 1)
      assert.equal(estado.correos[0].destino, 'lider@obra.co')
    })
  }

  test('si el responsable no tiene correo, la alerta igual se crea', async () => {
    estado.responsable = { nombre: 'Sin Correo', email: null }
    const r = await registrarIncidencia(RegistrarIncidenciaDto.fromRequestBody(cuerpo({ severidad: 'alta' })), ctx)
    assert.equal(r.alerta_generada, true)
    assert.equal(r.correo_enviado, false)
    assert.equal(estado.alertas.length, 1)
  })

  test('un fallo del correo no impide el registro', async () => {
    estado.fallaCorreo = true
    const r = await registrarIncidencia(RegistrarIncidenciaDto.fromRequestBody(cuerpo({ severidad: 'alta' })), ctx)
    assert.equal(r.id, 1)
    assert.equal(r.correo_enviado, false)
  })
})

describe('HU-14 · criterio 3: seguimiento hasta la resolución', () => {
  beforeEach(async () => {
    await registrarIncidencia(RegistrarIncidenciaDto.fromRequestBody(cuerpo({ severidad: 'alta' })), ctx)
  })

  test('pasar a RESUELTA fija la fecha de resolución y atiende la alerta', async () => {
    const r = await actualizarIncidencia(1, { estado: 'resuelta' }, ctx)
    assert.equal(r.estado, 'RESUELTA')
    assert.match(r.fecha_resolucion, /^\d{4}-\d{2}-\d{2}$/)
    assert.deepEqual(estado.atendidas, [1])
  })

  test('acepta una fecha de resolución pasada pero no una futura', async () => {
    const r = await actualizarIncidencia(1, { estado: 'RESUELTA', fecha_resolucion: '2026-10-02' }, ctx)
    assert.equal(r.fecha_resolucion, '2026-10-02')
    await assert.rejects(actualizarIncidencia(1, { fecha_resolucion: '2999-01-01' }, ctx), { statusCode: 400 })
  })

  test('rechaza una fecha de resolución anterior a la incidencia', async () => {
    await assert.rejects(
      actualizarIncidencia(1, { estado: 'RESUELTA', fecha_resolucion: '2026-09-01' }, ctx),
      { statusCode: 400 },
    )
  })

  test('no permite fecha de resolución en una incidencia abierta', async () => {
    await assert.rejects(actualizarIncidencia(1, { fecha_resolucion: '2026-10-02' }, ctx), { statusCode: 409 })
  })

  test('una incidencia cerrada no cambia de estado', async () => {
    await actualizarIncidencia(1, { estado: 'CERRADA' }, ctx)
    await assert.rejects(actualizarIncidencia(1, { estado: 'ABIERTA' }, ctx), { statusCode: 409 })
  })

  test('otra persona sin gestión del plan no puede dar seguimiento', async () => {
    estado.gestionaPlan = false
    const otra = { usuario: { id: 9, rol: 'MAESTRO_OBRA' }, usuarioId: 9, ip: '127.0.0.1' }
    await assert.rejects(actualizarIncidencia(1, { estado: 'EN_REVISION' }, otra), { statusCode: 403 })
  })
})
