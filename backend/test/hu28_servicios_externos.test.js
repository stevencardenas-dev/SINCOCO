/**
 * HU-28: detalle de servicios externos contratados (pruebas unitarias del backend).
 *
 * Corren sin MySQL: `db/pool.js` se reemplaza por una base en memoria que
 * entiende solo las consultas de servicios externos; la bitácora y el control
 * de acceso, por dobles simples.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

// ---------------------------------------------------------------- base en memoria
const db = { proveedores: [], proyectos: [], actividades: [], servicios: [], bitacora: [] }

function filaServicio(s) {
  const proveedor = db.proveedores.find((p) => p.id === s.proveedor_id)
  const proyecto = db.proyectos.find((p) => p.id === s.proyecto_id)
  const actividad = db.actividades.find((a) => a.id === s.actividad_id)
  return {
    ...s,
    valor_contratado: s.valor_contratado.toFixed(2),
    proveedor_nombre: proveedor.razon_social,
    proyecto_codigo: proyecto.codigo,
    proyecto_nombre: proyecto.nombre,
    actividad_nombre: actividad?.nombre ?? null,
  }
}

async function query(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim()

  if (/FROM proveedores WHERE id = \?/.test(s)) {
    return [db.proveedores.filter((p) => p.id === Number(params[0]))]
  }
  if (/FROM proyectos .*WHERE .*id = \?/.test(s)) {
    return [db.proyectos.filter((p) => p.id === Number(params[0]))]
  }
  if (/FROM actividades a JOIN etapas_proyecto e .*WHERE a\.id = \?/.test(s)) {
    return [db.actividades.filter((a) => a.id === Number(params[0]))]
  }
  if (s.startsWith('SELECT COALESCE(SUM(valor_contratado), 0) AS total FROM servicios_externos WHERE actividad_id = ?')) {
    const total = db.servicios
      .filter((x) => x.actividad_id === Number(params[0]) && x.estado !== 'CANCELADO')
      .reduce((suma, x) => suma + x.valor_contratado, 0)
    return [[{ total }]]
  }
  if (s.startsWith('INSERT INTO servicios_externos')) {
    const [proveedor_id, proyecto_id, actividad_id, nombre_servicio, descripcion, responsable_externo,
      fecha_inicio, fecha_fin, valor_contratado, estado, observaciones] = params
    const id = db.servicios.length + 1
    db.servicios.push({
      id, proveedor_id, proyecto_id, actividad_id, nombre_servicio, descripcion, responsable_externo,
      fecha_inicio, fecha_fin, valor_contratado, estado, observaciones, creado_en: '2026-10-18 10:00:00',
    })
    return [{ insertId: id }]
  }
  if (/FROM servicios_externos s JOIN proveedores pv .*WHERE s\.id = \? LIMIT 1/.test(s)) {
    return [db.servicios.filter((x) => x.id === Number(params[0])).map(filaServicio)]
  }
  if (/FROM servicios_externos s JOIN proveedores pv/.test(s)) {
    // Filtros en el orden en que los arma el repositorio.
    const campos = [...s.matchAll(/s\.(\w+) = \?/g)].map((m) => m[1])
    let filas = db.servicios
    campos.forEach((campo, i) => {
      filas = filas.filter((x) => String(x[campo]) === String(params[i]))
    })
    return [filas.map(filaServicio)]
  }
  throw new Error(`Consulta no simulada: ${s}`)
}

mock.module('../src/db/pool.js', { namedExports: { pool: { query } } })
mock.module('../src/db/bitacora.js', {
  namedExports: { registrar: async (entrada) => { db.bitacora.push(entrada) } },
})

// El alcance por rol (quién ve qué proyecto) tiene sus propias pruebas; aquí se controla con `acceso`.
const { AppError } = await import('../src/utils/AppError.js')
const acceso = { total: true, proyectosPermitidos: [] }
mock.module('../src/services/accesoService.js', {
  namedExports: {
    alcanceDeUsuario: async () => ({ total: acceso.total, trabajadorId: null }),
    verificarAccesoProyecto: async (_usuario, proyectoId) => {
      if (!acceso.total && !acceso.proyectosPermitidos.includes(Number(proyectoId))) {
        throw new AppError('No tiene acceso a este proyecto: pida que lo asignen a él', 403)
      }
    },
  },
})

const { registrarServicio, listarServicios } = await import('../src/services/servicioExternoService.js')
const { RegistrarServicioExternoDto } = await import('../src/dtos/servicioExterno/RegistrarServicioExternoDto.js')
const { ActualizarActividadDto } = await import('../src/dtos/actividad/ActualizarActividadDto.js')

// ---------------------------------------------------------------- datos de prueba
function sembrar() {
  db.proveedores = [
    { id: 1, razon_social: 'Transportes Andinos', estado: 'ACTIVO', activo: 1 },
    { id: 2, razon_social: 'Plomería del Norte', estado: 'INACTIVO', activo: 1 },
    { id: 3, razon_social: 'Grúas Cúcuta', estado: 'ACTIVO', activo: 0 },
  ]
  db.proyectos = [
    { id: 1, codigo: 'PRY-001', nombre: 'Conjunto Los Pinos', estado: 'EN_EJECUCION', activo: 1 },
    { id: 2, codigo: 'PRY-002', nombre: 'Edificio Centro', estado: 'FINALIZADO', activo: 1 },
    { id: 3, codigo: 'PRY-003', nombre: 'Casa Campestre', estado: 'EN_EJECUCION', activo: 0 },
  ]
  db.actividades = [
    { id: 10, nombre: 'Excavación', proyecto_id: 1, presupuesto: '10000000.00', activo: 1 },
    { id: 11, nombre: 'Cimentación', proyecto_id: 1, presupuesto: null, activo: 1 },
    { id: 12, nombre: 'Acabados', proyecto_id: 2, presupuesto: '5000000.00', activo: 1 },
    { id: 13, nombre: 'Demolición', proyecto_id: 1, presupuesto: '1000000.00', activo: 0 },
  ]
  db.servicios = []
  db.bitacora = []
  acceso.total = true
  acceso.proyectosPermitidos = []
}

const ctx = { usuarioId: 7, usuario: { id: 7, rol: 'ADMINISTRADOR' }, ip: '127.0.0.1' }

/** Cuerpo válido; cada prueba cambia lo que le interesa. */
const cuerpo = (extra = {}) => ({
  proveedor_id: 1,
  proyecto_id: 1,
  actividad_id: 10,
  nombre_servicio: 'Transporte de escombros',
  responsable_externo: 'Carlos Pérez',
  fecha_inicio: '2026-11-02',
  fecha_fin: '2026-11-20',
  valor_contratado: 4000000,
  ...extra,
})
// Async para que los errores síncronos del DTO lleguen igual que los del service.
const registrar = async (extra) =>
  registrarServicio(RegistrarServicioExternoDto.fromRequestBody(cuerpo(extra)), ctx)

async function rechaza(promesa, status, texto, campo) {
  await assert.rejects(promesa, (err) => {
    assert.equal(err.statusCode, status)
    if (texto) assert.match(err.message, texto)
    if (campo) assert.equal(err.campo, campo)
    return true
  })
}

// ---------------------------------------------------------------- pruebas
describe('HU-28 · escenario principal: registro de un servicio contratado', () => {
  beforeEach(sembrar)

  test('lo asocia al proveedor, al proyecto y a la actividad (criterio 1)', async () => {
    const s = await registrar()
    assert.equal(s.proveedor_nombre, 'Transportes Andinos')
    assert.equal(s.proyecto_codigo, 'PRY-001')
    assert.equal(s.actividad_nombre, 'Excavación')
    assert.equal(db.servicios.length, 1)
  })

  test('guarda responsable externo, fechas y valor contratado (criterio 2)', async () => {
    const s = await registrar({ valor_contratado: '2500000.50' })
    assert.equal(s.responsable_externo, 'Carlos Pérez')
    assert.equal(s.fecha_inicio, '2026-11-02')
    assert.equal(s.fecha_fin, '2026-11-20')
    assert.equal(s.valor_contratado, 2500000.5)
    assert.equal(s.estado, 'PROGRAMADO')
  })

  test('deja constancia en la bitácora', async () => {
    const s = await registrar()
    assert.equal(db.bitacora.length, 1)
    assert.equal(db.bitacora[0].tabla, 'servicios_externos')
    assert.equal(db.bitacora[0].registroId, s.id)
    assert.equal(db.bitacora[0].detalles.excede_presupuesto, undefined)
  })
})

describe('HU-28 · escenario alternativo: excede el presupuesto de la actividad (criterio 4)', () => {
  beforeEach(sembrar)

  test('advierte antes de confirmar y no guarda nada', async () => {
    await assert.rejects(registrar({ valor_contratado: 12000000 }), (err) => {
      assert.equal(err.statusCode, 409)
      assert.equal(err.campo, 'valor_contratado')
      assert.deepEqual(err.extra, {
        codigo: 'EXCEDE_PRESUPUESTO',
        presupuesto: 10000000,
        comprometido: 0,
        disponible: 10000000,
        valor_contratado: 12000000,
        exceso: 2000000,
      })
      return true
    })
    assert.equal(db.servicios.length, 0)
    assert.equal(db.bitacora.length, 0)
  })

  test('guarda cuando el administrador confirma y lo deja en la bitácora', async () => {
    const s = await registrar({ valor_contratado: 12000000, confirmar_exceso: true })
    assert.equal(s.valor_contratado, 12000000)
    assert.equal(db.bitacora[0].detalles.excede_presupuesto, true)
    assert.equal(db.bitacora[0].detalles.exceso, 2000000)
  })

  test('un valor igual al presupuesto disponible no excede', async () => {
    assert.equal((await registrar({ valor_contratado: 10000000 })).valor_contratado, 10000000)
  })

  test('descuenta lo ya contratado en la actividad', async () => {
    await registrar({ valor_contratado: 7000000 })
    await assert.rejects(registrar({ valor_contratado: 4000000 }), (err) => {
      assert.equal(err.extra.comprometido, 7000000)
      assert.equal(err.extra.disponible, 3000000)
      assert.equal(err.extra.exceso, 1000000)
      return true
    })
    assert.equal(db.servicios.length, 1)
  })

  test('un servicio cancelado libera su presupuesto', async () => {
    await registrar({ valor_contratado: 9000000 })
    db.servicios[0].estado = 'CANCELADO'
    assert.equal((await registrar({ valor_contratado: 9000000 })).valor_contratado, 9000000)
  })

  test('no pierde centavos al comparar montos decimales', async () => {
    await registrar({ valor_contratado: 9999999.9 })
    assert.equal((await registrar({ valor_contratado: 0.1 })).valor_contratado, 0.1)
    await rechaza(registrar({ valor_contratado: 0.01 }), 409, /supera el presupuesto/)
  })

  test('una actividad sin presupuesto definido no genera advertencia', async () => {
    const s = await registrar({ actividad_id: 11, valor_contratado: 999999999 })
    assert.equal(s.valor_contratado, 999999999)
  })
})

describe('HU-28 · criterio 1: proveedor, proyecto y actividad obligatorios y coherentes', () => {
  beforeEach(sembrar)

  for (const campo of ['proveedor_id', 'proyecto_id', 'actividad_id']) {
    test(`rechaza un servicio sin ${campo}`, async () => {
      await rechaza(registrar({ [campo]: undefined }), 400, /obligatori/, campo)
      await rechaza(registrar({ [campo]: '' }), 400, /obligatori/, campo)
      assert.equal(db.servicios.length, 0)
    })
  }

  test('rechaza identificadores que no son enteros positivos', async () => {
    await rechaza(registrar({ actividad_id: 'abc' }), 400, /identificador/, 'actividad_id')
    await rechaza(registrar({ proveedor_id: -3 }), 400, /identificador/, 'proveedor_id')
  })

  test('rechaza un proveedor, proyecto o actividad que no existen', async () => {
    await rechaza(registrar({ proveedor_id: 99 }), 404, /proveedor/, 'proveedor_id')
    await rechaza(registrar({ proyecto_id: 99 }), 404, /proyecto/, 'proyecto_id')
    await rechaza(registrar({ actividad_id: 99 }), 404, /actividad/, 'actividad_id')
  })

  test('rechaza un proveedor inactivo o dado de baja (HU-13)', async () => {
    await rechaza(registrar({ proveedor_id: 2 }), 400, /inactivo/, 'proveedor_id')
    await rechaza(registrar({ proveedor_id: 3 }), 400, /inactivo/, 'proveedor_id')
  })

  test('rechaza un proyecto finalizado o dado de baja', async () => {
    await rechaza(registrar({ proyecto_id: 2, actividad_id: 12 }), 409, /finalizado/, 'proyecto_id')
    await rechaza(registrar({ proyecto_id: 3 }), 400, /baja/, 'proyecto_id')
  })

  test('rechaza una actividad de otro proyecto o dada de baja', async () => {
    await rechaza(registrar({ actividad_id: 12 }), 400, /no pertenece/, 'actividad_id')
    await rechaza(registrar({ actividad_id: 13 }), 400, /baja/, 'actividad_id')
  })

  test('rechaza a quien no tiene acceso al proyecto', async () => {
    acceso.total = false
    await rechaza(registrar(), 403)
    assert.equal(db.servicios.length, 0)
  })
})

describe('HU-28 · criterio 2: fechas y valor contratado', () => {
  beforeEach(sembrar)

  test('exigen fecha de inicio, fecha de fin, responsable, nombre y valor', async () => {
    await rechaza(registrar({ fecha_inicio: '' }), 400, /fecha de inicio/, 'fecha_inicio')
    await rechaza(registrar({ fecha_fin: undefined }), 400, /fecha de fin/, 'fecha_fin')
    await rechaza(registrar({ responsable_externo: '  ' }), 400, /responsable externo/, 'responsable_externo')
    await rechaza(registrar({ nombre_servicio: '' }), 400, /nombre del servicio/, 'nombre_servicio')
    await rechaza(registrar({ valor_contratado: '' }), 400, /valor contratado es obligatorio/, 'valor_contratado')
  })

  test('rechaza fechas con formato inválido', async () => {
    await rechaza(registrar({ fecha_inicio: '02/11/2026' }), 400, /fecha válida/, 'fecha_inicio')
    await rechaza(registrar({ fecha_fin: '2026-13-45' }), 400, /fecha válida/, 'fecha_fin')
  })

  test('la fecha de fin no puede ser anterior a la de inicio', async () => {
    await rechaza(registrar({ fecha_inicio: '2026-11-20', fecha_fin: '2026-11-02' }), 400, /anterior/, 'fecha_fin')
    const s = await registrar({ fecha_inicio: '2026-11-20', fecha_fin: '2026-11-20' })
    assert.equal(s.fecha_inicio, s.fecha_fin)
  })

  test('el valor debe ser un monto mayor que cero con a lo sumo 2 decimales', async () => {
    await rechaza(registrar({ valor_contratado: 0 }), 400, /mayor que 0/, 'valor_contratado')
    await rechaza(registrar({ valor_contratado: -5 }), 400, /no negativo/, 'valor_contratado')
    await rechaza(registrar({ valor_contratado: 'mucho' }), 400, /no negativo/, 'valor_contratado')
    await rechaza(registrar({ valor_contratado: 100.123 }), 400, /2 decimales/, 'valor_contratado')
    await rechaza(registrar({ valor_contratado: 1e14 }), 400, /máximo/, 'valor_contratado')
  })

  test('rechaza textos que no caben en su columna', async () => {
    await rechaza(registrar({ nombre_servicio: 'x'.repeat(151) }), 400, /150/, 'nombre_servicio')
    await rechaza(registrar({ responsable_externo: 'x'.repeat(101) }), 400, /100/, 'responsable_externo')
  })

  test('solo admite nacer programado o en ejecución', async () => {
    assert.equal((await registrar({ estado: 'en_ejecucion' })).estado, 'EN_EJECUCION')
    await rechaza(registrar({ estado: 'FINALIZADO' }), 400, /estado inicial/, 'estado')
  })
})

describe('HU-28 · consulta de servicios', () => {
  beforeEach(sembrar)

  test('lista con filtros por proyecto, actividad, proveedor y estado', async () => {
    db.proveedores.push({ id: 4, razon_social: 'Alquiler de Maquinaria', estado: 'ACTIVO', activo: 1 })
    await registrar({ valor_contratado: 1000000 })
    await registrar({ actividad_id: 11, valor_contratado: 2000000 })
    await registrar({ proveedor_id: 4, valor_contratado: 3000000 })

    assert.equal((await listarServicios({}, ctx.usuario)).length, 3)
    assert.equal((await listarServicios({ proyecto_id: 1 }, ctx.usuario)).length, 3)
    assert.equal((await listarServicios({ actividad_id: 11 }, ctx.usuario)).length, 1)
    assert.equal((await listarServicios({ proveedor_id: 4 }, ctx.usuario)).length, 1)
    assert.equal((await listarServicios({ estado: 'finalizado' }, ctx.usuario)).length, 0)
  })

  test('el costo de servicios del proyecto es la suma de los vigentes (criterio 3)', async () => {
    await registrar({ valor_contratado: 4000000 })
    await registrar({ actividad_id: 11, valor_contratado: 1500000.5 })
    await registrar({ actividad_id: 11, valor_contratado: 700000 })
    db.servicios[2].estado = 'CANCELADO'

    const vigentes = (await listarServicios({ proyecto_id: 1 }, ctx.usuario)).filter((s) => s.estado !== 'CANCELADO')
    assert.equal(vigentes.reduce((n, s) => n + s.valor_contratado, 0), 5500000.5)
  })

  test('rechaza un estado desconocido', async () => {
    await rechaza(listarServicios({ estado: 'PERDIDO' }, ctx.usuario), 400, /estado/, 'estado')
  })

  test('quien no ve todos los proyectos debe indicar uno al que tenga acceso', async () => {
    acceso.total = false
    acceso.proyectosPermitidos = [1]
    await rechaza(listarServicios({}, ctx.usuario), 403, /proyecto/)
    await rechaza(listarServicios({ proyecto_id: 2 }, ctx.usuario), 403)
    assert.deepEqual(await listarServicios({ proyecto_id: 1 }, ctx.usuario), [])
  })
})

describe('HU-28 · presupuesto de la actividad (DTO de edición)', () => {
  test('acepta un monto, y vacío lo quita', () => {
    assert.equal(ActualizarActividadDto.fromRequestBody({ presupuesto: '2500000' }).campos.presupuesto, 2500000)
    assert.equal(ActualizarActividadDto.fromRequestBody({ presupuesto: '' }).campos.presupuesto, null)
  })

  test('rechaza un presupuesto negativo o con más de 2 decimales', () => {
    assert.throws(() => ActualizarActividadDto.fromRequestBody({ presupuesto: -1 }), { statusCode: 400, campo: 'presupuesto' })
    assert.throws(() => ActualizarActividadDto.fromRequestBody({ presupuesto: 1.234 }), { statusCode: 400, campo: 'presupuesto' })
  })
})
