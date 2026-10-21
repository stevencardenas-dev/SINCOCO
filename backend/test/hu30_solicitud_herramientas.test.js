/**
 * HU-30: solicitud de herramientas (pruebas unitarias del backend).
 *
 * Corren sin MySQL: los repositorios, el control de permisos, el acceso a
 * proyectos y la bitácora se reemplazan por dobles en memoria, de modo que se
 * prueban las reglas del service.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

const estado = {
  solicitudes: [],
  herramientas: [],
  trabajadores: [],
  proyectos: [],
  asignados: [],
  bitacora: [],
  creaciones: [],
  filtrosListar: null,
  rolesResolutores: ['Almacenista'],
  accesoDenegado: false,
  resueltaPorOtro: false,
}

mock.module('../src/repositories/solicitudHerramientaRepository.js', {
  namedExports: {
    findById: async (id) => {
      const s = estado.solicitudes.find((x) => x.id === Number(id))
      return s ? { ...s } : null
    },
    listar: async (filtros) => {
      estado.filtrosListar = filtros
      return estado.solicitudes
    },
    crear: async (datos) => {
      estado.creaciones.push(datos)
      const id = estado.solicitudes.length + 1
      estado.solicitudes.push({
        id,
        codigo: `SH-${String(id).padStart(5, '0')}`,
        herramienta_id: datos.herramientaId,
        proyecto_id: datos.proyectoId,
        para_trabajador_id: datos.trabajadorId,
        solicitado_por_usuario_id: datos.usuarioId,
        fecha_solicitud: new Date().toISOString(),
        fecha_requerida: datos.fechaRequerida,
        fecha_estimada_devolucion: datos.fechaDevolucion,
        estado: 'PENDIENTE',
        observaciones: datos.observaciones,
      })
      return id
    },
    cambiarEstado: async (id, desde, hacia, observaciones) => {
      if (estado.resueltaPorOtro) return false
      const s = estado.solicitudes.find((x) => x.id === Number(id))
      if (!s || s.estado !== desde) return false
      s.estado = hacia
      if (observaciones) s.observaciones = observaciones
      return true
    },
  },
})
mock.module('../src/repositories/herramientaRepository.js', {
  namedExports: {
    findById: async (id) => {
      const h = estado.herramientas.find((x) => x.id === Number(id))
      return h ? { ...h } : null
    },
  },
})
mock.module('../src/repositories/trabajadorRepository.js', {
  namedExports: {
    findById: async (id) => {
      const t = estado.trabajadores.find((x) => x.id === Number(id))
      return t ? { ...t } : null
    },
  },
})
mock.module('../src/repositories/proyectoRepository.js', {
  namedExports: {
    findById: async (id) => estado.proyectos.find((p) => p.id === Number(id)) || null,
  },
})
mock.module('../src/repositories/asignacionRepository.js', {
  namedExports: {
    tieneAcceso: async (proyectoId, trabajadorId) =>
      estado.asignados.some((a) => a.proyectoId === Number(proyectoId) && a.trabajadorId === Number(trabajadorId)),
  },
})
mock.module('../src/services/accesoService.js', {
  namedExports: {
    verificarAccesoProyecto: async () => {
      if (estado.accesoDenegado) {
        const { AppError } = await import('../src/utils/AppError.js')
        throw new AppError('No tiene acceso a este proyecto', 403)
      }
    },
  },
})
mock.module('../src/middleware/permisos.js', {
  namedExports: { rolTienePermiso: async (rol) => estado.rolesResolutores.includes(rol) },
})
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (entrada) => { estado.bitacora.push(entrada) } },
})

const service = await import('../src/services/solicitudHerramientaService.js')
const { aFechaDia, sumarDias } = await import('../src/utils/fechas.js')

const hoy = aFechaDia(new Date())
const manana = sumarDias(hoy, 1)
const ayer = sumarDias(hoy, -1)

const MAESTRO = { id: 7, rol: 'Maestro de obra' }
const ctxMaestro = { usuario: MAESTRO, usuarioId: 7, ip: '127.0.0.1' }
const ctxBodega = { usuario: { id: 9, rol: 'Almacenista' }, usuarioId: 9, ip: '127.0.0.1' }

const cuerpo = (extra = {}) => ({
  herramienta_id: 1,
  proyecto_id: 1,
  para_trabajador_id: 5,
  fecha_requerida: manana,
  fecha_estimada_devolucion: sumarDias(manana, 3),
  observaciones: 'Para el vaciado de losa',
  ...extra,
})
const rechaza = (promesa, estadoHttp, campo) =>
  assert.rejects(promesa, (e) => e.statusCode === estadoHttp && (campo === undefined || e.campo === campo))
const solicitudEn = (estadoInicial, extra = {}) => {
  const id = estado.solicitudes.length + 1
  estado.solicitudes.push({
    id, codigo: `SH-${String(id).padStart(5, '0')}`, herramienta_id: 1, proyecto_id: 1, para_trabajador_id: 5,
    solicitado_por_usuario_id: 7, estado: estadoInicial, observaciones: null, ...extra,
  })
  return id
}

beforeEach(() => {
  estado.solicitudes = []
  estado.herramientas = [
    { id: 1, activo: 1, disponibilidad: 'DISPONIBLE', estado_operativo: 'BUENO' },
  ]
  estado.trabajadores = [{ id: 5, activo: 1 }]
  estado.proyectos = [{ id: 1 }]
  estado.asignados = [{ proyectoId: 1, trabajadorId: 5 }]
  estado.bitacora = []
  estado.creaciones = []
  estado.filtrosListar = null
  estado.rolesResolutores = ['Almacenista']
  estado.accesoDenegado = false
  estado.resueltaPorOtro = false
})

describe('HU-30 · criterio 1: solo herramientas con disponibilidad real', () => {
  test('una herramienta disponible y en buen estado se puede solicitar', async () => {
    const s = await service.crearSolicitud(cuerpo(), ctxMaestro)
    assert.equal(s.estado, 'PENDIENTE')
  })

  for (const operativo of ['EXCELENTE', 'BUENO', 'REGULAR']) {
    test(`estado operativo ${operativo} es prestable`, async () => {
      estado.herramientas[0].estado_operativo = operativo
      await service.crearSolicitud(cuerpo(), ctxMaestro)
      assert.equal(estado.creaciones.length, 1)
    })
  }

  for (const disponibilidad of ['PRESTADA', 'EN_REPARACION', 'BAJA']) {
    test(`una herramienta ${disponibilidad} responde 409`, async () => {
      estado.herramientas[0].disponibilidad = disponibilidad
      await rechaza(service.crearSolicitud(cuerpo(), ctxMaestro), 409, 'herramienta_id')
      assert.equal(estado.creaciones.length, 0)
    })
  }

  test('una herramienta en mal estado operativo responde 409', async () => {
    estado.herramientas[0].estado_operativo = 'MALO'
    await rechaza(service.crearSolicitud(cuerpo(), ctxMaestro), 409, 'herramienta_id')
  })

  test('una herramienta dada de baja (inactiva) responde 404', async () => {
    estado.herramientas[0].activo = 0
    await rechaza(service.crearSolicitud(cuerpo(), ctxMaestro), 404, 'herramienta_id')
  })

  test('una herramienta inexistente responde 404', async () => {
    await rechaza(service.crearSolicitud(cuerpo({ herramienta_id: 999 }), ctxMaestro), 404, 'herramienta_id')
  })

  test('aprobar revalida: si la herramienta ya no está disponible responde 409 y la solicitud sigue pendiente', async () => {
    const id = solicitudEn('PENDIENTE')
    estado.herramientas[0].disponibilidad = 'EN_REPARACION'
    await rechaza(service.aprobarSolicitud(id, ctxBodega), 409, 'herramienta_id')
    assert.equal(estado.solicitudes[0].estado, 'PENDIENTE')
  })
})

describe('HU-30 · criterio 2: datos que debe registrar la solicitud', () => {
  test('registra herramienta, trabajador, proyecto, solicitante y fecha requerida', async () => {
    const s = await service.crearSolicitud(cuerpo(), ctxMaestro)
    assert.deepEqual(estado.creaciones[0], {
      herramientaId: 1,
      proyectoId: 1,
      usuarioId: 7,
      trabajadorId: 5,
      fechaRequerida: manana,
      fechaDevolucion: sumarDias(manana, 3),
      observaciones: 'Para el vaciado de losa',
    })
    assert.equal(s.codigo, 'SH-00001')
    assert.ok(s.fecha_solicitud, 'la solicitud trae su fecha de solicitud')
  })

  for (const campo of ['herramienta_id', 'proyecto_id', 'para_trabajador_id']) {
    test(`sin ${campo} responde 400`, async () => {
      await rechaza(service.crearSolicitud(cuerpo({ [campo]: '' }), ctxMaestro), 400, campo)
    })

    test(`${campo} no numérico responde 400`, async () => {
      await rechaza(service.crearSolicitud(cuerpo({ [campo]: 'abc' }), ctxMaestro), 400, campo)
    })
  }

  test('sin fecha requerida responde 400', async () => {
    await rechaza(service.crearSolicitud(cuerpo({ fecha_requerida: '' }), ctxMaestro), 400, 'fecha_requerida')
  })

  test('una fecha requerida pasada responde 400', async () => {
    await rechaza(service.crearSolicitud(cuerpo({ fecha_requerida: ayer }), ctxMaestro), 400, 'fecha_requerida')
  })

  test('una fecha requerida de hoy es válida', async () => {
    await service.crearSolicitud(cuerpo({ fecha_requerida: hoy, fecha_estimada_devolucion: hoy }), ctxMaestro)
    assert.equal(estado.creaciones.length, 1)
  })

  test('una fecha requerida futura es válida y queda pendiente', async () => {
    const s = await service.crearSolicitud(
      cuerpo({ fecha_requerida: sumarDias(hoy, 30), fecha_estimada_devolucion: sumarDias(hoy, 40) }),
      ctxMaestro,
    )
    assert.equal(s.estado, 'PENDIENTE')
  })

  test('sin fecha de devolución esperada responde 400', async () => {
    await rechaza(
      service.crearSolicitud(cuerpo({ fecha_estimada_devolucion: null }), ctxMaestro),
      400, 'fecha_estimada_devolucion',
    )
  })

  test('una devolución anterior a la fecha requerida responde 400', async () => {
    await rechaza(
      service.crearSolicitud(cuerpo({ fecha_estimada_devolucion: hoy }), ctxMaestro),
      400, 'fecha_estimada_devolucion',
    )
  })

  test('observaciones de más de 500 caracteres responden 400', async () => {
    await rechaza(
      service.crearSolicitud(cuerpo({ observaciones: 'x'.repeat(501) }), ctxMaestro),
      400, 'observaciones',
    )
  })

  test('las observaciones son opcionales', async () => {
    await service.crearSolicitud(cuerpo({ observaciones: '   ' }), ctxMaestro)
    assert.equal(estado.creaciones[0].observaciones, null)
  })

  test('un trabajador inexistente responde 404', async () => {
    await rechaza(service.crearSolicitud(cuerpo({ para_trabajador_id: 99 }), ctxMaestro), 404, 'para_trabajador_id')
  })

  test('un trabajador dado de baja responde 404', async () => {
    estado.trabajadores[0].activo = 0
    await rechaza(service.crearSolicitud(cuerpo(), ctxMaestro), 404, 'para_trabajador_id')
  })

  test('un proyecto inexistente responde 404', async () => {
    await rechaza(service.crearSolicitud(cuerpo({ proyecto_id: 99 }), ctxMaestro), 404, 'proyecto_id')
  })

  test('un proyecto al que el solicitante no tiene acceso responde 403', async () => {
    estado.accesoDenegado = true
    await rechaza(service.crearSolicitud(cuerpo(), ctxMaestro), 403)
    assert.equal(estado.creaciones.length, 0)
  })

  test('un trabajador no asignado al proyecto responde 400', async () => {
    estado.asignados = []
    await rechaza(service.crearSolicitud(cuerpo(), ctxMaestro), 400, 'para_trabajador_id')
  })

  test('registrar la solicitud deja constancia en la bitácora', async () => {
    const s = await service.crearSolicitud(cuerpo(), ctxMaestro)
    assert.equal(estado.bitacora.length, 1)
    assert.equal(estado.bitacora[0].accion, 'SOLICITAR_HERRAMIENTA')
    assert.equal(estado.bitacora[0].registroId, s.id)
    assert.equal(estado.bitacora[0].usuarioId, 7)
  })
})

describe('HU-30 · criterio 3: estados pendiente, aprobada, rechazada y atendida', () => {
  test('el catálogo de estados incluye los cuatro del criterio', () => {
    for (const e of ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ENTREGADA']) {
      assert.ok(service.ESTADOS.includes(e), e)
    }
  })

  test('toda solicitud nueva nace PENDIENTE', async () => {
    const s = await service.crearSolicitud(cuerpo(), ctxMaestro)
    assert.equal(s.estado, 'PENDIENTE')
  })

  test('PENDIENTE -> APROBADA', async () => {
    const id = solicitudEn('PENDIENTE')
    const s = await service.aprobarSolicitud(id, ctxBodega)
    assert.equal(s.estado, 'APROBADA')
  })

  test('PENDIENTE -> RECHAZADA con observación', async () => {
    const id = solicitudEn('PENDIENTE')
    const s = await service.rechazarSolicitud(id, { observaciones: 'Sin stock' }, ctxBodega)
    assert.equal(s.estado, 'RECHAZADA')
  })

  test('APROBADA -> ENTREGADA (atendida)', async () => {
    const id = solicitudEn('APROBADA')
    const s = await service.atenderSolicitud(id, ctxBodega)
    assert.equal(s.estado, 'ENTREGADA')
  })

  test('el flujo completo pendiente -> aprobada -> atendida', async () => {
    const creada = await service.crearSolicitud(cuerpo(), ctxMaestro)
    assert.equal((await service.aprobarSolicitud(creada.id, ctxBodega)).estado, 'APROBADA')
    assert.equal((await service.atenderSolicitud(creada.id, ctxBodega)).estado, 'ENTREGADA')
  })

  test('no se puede atender una solicitud pendiente (hay que aprobarla antes)', async () => {
    const id = solicitudEn('PENDIENTE')
    await rechaza(service.atenderSolicitud(id, ctxBodega), 409)
    assert.equal(estado.solicitudes[0].estado, 'PENDIENTE')
  })

  for (const final of ['APROBADA', 'RECHAZADA', 'ENTREGADA', 'CANCELADA']) {
    test(`no se puede aprobar una solicitud ${final}`, async () => {
      const id = solicitudEn(final)
      await rechaza(service.aprobarSolicitud(id, ctxBodega), 409)
    })
  }

  for (const final of ['APROBADA', 'RECHAZADA', 'ENTREGADA', 'CANCELADA']) {
    test(`no se puede rechazar una solicitud ${final}`, async () => {
      const id = solicitudEn(final)
      await rechaza(service.rechazarSolicitud(id, { observaciones: 'Motivo' }, ctxBodega), 409)
    })
  }

  for (const final of ['PENDIENTE', 'RECHAZADA', 'ENTREGADA', 'CANCELADA']) {
    test(`no se puede atender una solicitud ${final}`, async () => {
      const id = solicitudEn(final)
      await rechaza(service.atenderSolicitud(id, ctxBodega), 409)
    })
  }

  test('una solicitud inexistente responde 404', async () => {
    await rechaza(service.aprobarSolicitud(999, ctxBodega), 404)
  })

  test('si otra persona resolvió la solicitud primero responde 409', async () => {
    const id = solicitudEn('PENDIENTE')
    estado.resueltaPorOtro = true
    await rechaza(service.aprobarSolicitud(id, ctxBodega), 409)
  })

  test('cada transición queda en la bitácora con estado de origen y destino', async () => {
    const id = solicitudEn('PENDIENTE')
    await service.aprobarSolicitud(id, ctxBodega)
    assert.equal(estado.bitacora.length, 1)
    assert.equal(estado.bitacora[0].accion, 'APROBAR_SOLICITUD_HERRAMIENTA')
    assert.equal(estado.bitacora[0].detalles.de, 'PENDIENTE')
    assert.equal(estado.bitacora[0].detalles.a, 'APROBADA')
  })

  test('listar con un estado fuera del catálogo responde 400', async () => {
    await rechaza(service.listarSolicitudes({ estado: 'INVENTADO' }, ctxBodega.usuario), 400, 'estado')
  })

  test('listar acepta el estado en minúsculas', async () => {
    await service.listarSolicitudes({ estado: 'pendiente' }, ctxBodega.usuario)
    assert.equal(estado.filtrosListar.estado, 'PENDIENTE')
  })

  test('bodega ve todas las solicitudes; el maestro solo las suyas', async () => {
    await service.listarSolicitudes({}, ctxBodega.usuario)
    assert.equal(estado.filtrosListar.usuarioId, null)
    await service.listarSolicitudes({}, MAESTRO)
    assert.equal(estado.filtrosListar.usuarioId, 7)
  })
})

describe('HU-30 · criterio 4: todo rechazo exige observación', () => {
  for (const [nombre, body] of [
    ['sin cuerpo', undefined],
    ['sin observaciones', {}],
    ['observación vacía', { observaciones: '' }],
    ['observación solo con espacios', { observaciones: '    ' }],
  ]) {
    test(`rechazar ${nombre} responde 400 y la solicitud sigue pendiente`, async () => {
      const id = solicitudEn('PENDIENTE')
      await rechaza(service.rechazarSolicitud(id, body, ctxBodega), 400, 'observaciones')
      assert.equal(estado.solicitudes[0].estado, 'PENDIENTE')
      assert.equal(estado.bitacora.length, 0)
    })
  }

  test('rechazar con observación la guarda en la solicitud', async () => {
    const id = solicitudEn('PENDIENTE')
    const s = await service.rechazarSolicitud(id, { observaciones: '  No hay stock  ' }, ctxBodega)
    assert.equal(s.estado, 'RECHAZADA')
    assert.equal(s.observaciones, 'No hay stock')
  })

  test('la observación del rechazo queda en la bitácora', async () => {
    const id = solicitudEn('PENDIENTE')
    await service.rechazarSolicitud(id, { observaciones: 'No hay stock' }, ctxBodega)
    assert.equal(estado.bitacora[0].accion, 'RECHAZAR_SOLICITUD_HERRAMIENTA')
    assert.equal(estado.bitacora[0].detalles.observacion, 'No hay stock')
  })

  test('una observación de más de 500 caracteres responde 400', async () => {
    const id = solicitudEn('PENDIENTE')
    await rechaza(service.rechazarSolicitud(id, { observaciones: 'x'.repeat(501) }, ctxBodega), 400, 'observaciones')
  })

  test('aprobar no exige observación', async () => {
    const id = solicitudEn('PENDIENTE')
    const s = await service.aprobarSolicitud(id, ctxBodega)
    assert.equal(s.estado, 'APROBADA')
  })
})

describe('HU-30 · cancelación', () => {
  test('quien creó la solicitud puede cancelarla estando pendiente', async () => {
    const id = solicitudEn('PENDIENTE')
    assert.equal((await service.cancelarSolicitud(id, ctxMaestro)).estado, 'CANCELADA')
  })

  test('quien creó la solicitud puede cancelarla estando aprobada', async () => {
    const id = solicitudEn('APROBADA')
    assert.equal((await service.cancelarSolicitud(id, ctxMaestro)).estado, 'CANCELADA')
  })

  test('bodega puede cancelar una solicitud ajena', async () => {
    const id = solicitudEn('PENDIENTE')
    assert.equal((await service.cancelarSolicitud(id, ctxBodega)).estado, 'CANCELADA')
  })

  test('otro maestro no puede cancelar una solicitud ajena (403)', async () => {
    const id = solicitudEn('PENDIENTE')
    const otro = { usuario: { id: 8, rol: 'Maestro de obra' }, usuarioId: 8, ip: '127.0.0.1' }
    await rechaza(service.cancelarSolicitud(id, otro), 403)
    assert.equal(estado.solicitudes[0].estado, 'PENDIENTE')
  })

  for (const final of ['RECHAZADA', 'ENTREGADA', 'CANCELADA']) {
    test(`una solicitud ${final} ya no se puede cancelar`, async () => {
      const id = solicitudEn(final)
      await rechaza(service.cancelarSolicitud(id, ctxBodega), 409)
    })
  }
})
