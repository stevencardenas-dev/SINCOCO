import * as herramientaRepository from '../repositories/herramientaRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { LARGO, revisarLargo, textoOpcional, numeroOpcional } from '../utils/campos.js'
import { revisarEstadoOperativo } from '../dtos/herramienta/RegistrarHerramientaDto.js'

export const DISPONIBILIDADES = ['DISPONIBLE', 'PRESTADA', 'EN_TRASLADO', 'BAJA']

/** HU-10: catálogo de herramientas (activas por defecto; filtros en el repositorio). */
export async function listarHerramientas(filtros = {}) {
  // Un filtro con un valor que no existe es un error del cliente, no una lista vacía.
  const estadoOperativo = filtros.estadoOperativo
    ? revisarEstadoOperativo(filtros.estadoOperativo)
    : ''
  const disponibilidad = filtros.disponibilidad ? String(filtros.disponibilidad).trim().toUpperCase() : ''
  if (disponibilidad && !DISPONIBILIDADES.includes(disponibilidad)) {
    throw new AppError(`disponibilidad debe ser una de: ${DISPONIBILIDADES.join(', ')}`, 400, 'disponibilidad')
  }
  if (filtros.almacenId && Number.isNaN(Number(filtros.almacenId))) {
    throw new AppError('almacen_id debe ser numérico', 400, 'almacen_id')
  }
  return herramientaRepository.listar({ ...filtros, estadoOperativo, disponibilidad })
}

export async function listarAlmacenes(filtros = {}) {
  return herramientaRepository.listarAlmacenes(filtros)
}

async function almacenExistente(id) {
  const almacen = await herramientaRepository.findAlmacenCompleto(id)
  if (!almacen) throw new AppError('Almacén no encontrado', 404)
  return almacen
}

/** Valida y normaliza el cuerpo de un almacén; con `parcial` solo lo que llegó. */
function datosAlmacen(body = {}, parcial = false) {
  const datos = {}
  const tiene = (k) => body[k] !== undefined
  if (!parcial || tiene('codigo')) {
    const codigo = String(body.codigo ?? '').trim().toUpperCase()
    if (!codigo) throw new AppError('El código es obligatorio', 400, 'codigo')
    revisarLargo(codigo, LARGO.codigo, 'codigo')
    datos.codigo = codigo
  }
  if (!parcial || tiene('nombre')) {
    const nombre = String(body.nombre ?? '').trim()
    if (!nombre) throw new AppError('El nombre es obligatorio', 400, 'nombre')
    revisarLargo(nombre, 100, 'nombre')
    datos.nombre = nombre
  }
  if (!parcial || tiene('ubicacion')) {
    const ubicacion = textoOpcional(body.ubicacion)
    revisarLargo(ubicacion, LARGO.ubicacion, 'ubicacion')
    datos.ubicacion = ubicacion
  }
  if (!parcial || tiene('es_central')) datos.es_central = body.es_central ? 1 : 0
  return datos
}

const codigoDuplicado = () => new AppError('Ya existe un almacén con ese código', 409, 'codigo')

export async function registrarAlmacen(body, ctx = {}) {
  const datos = datosAlmacen(body)
  if (await herramientaRepository.findAlmacenByCodigo(datos.codigo)) throw codigoDuplicado()
  const id = await herramientaRepository.insertAlmacen(datos)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'CREAR', tabla: 'almacenes', registroId: id,
    detalles: { codigo: datos.codigo }, ip: ctx.ip,
  })
  return herramientaRepository.findAlmacenCompleto(id)
}

export async function actualizarAlmacen(id, body, ctx = {}) {
  const actual = await almacenExistente(id)
  if (!actual.activo) throw new AppError('El almacén está dado de baja; reactívelo antes de editarlo', 409)
  const datos = datosAlmacen(body, true)
  if (Object.keys(datos).length === 0) throw new AppError('No hay campos que actualizar', 400)
  if (datos.codigo && datos.codigo !== actual.codigo && (await herramientaRepository.findAlmacenByCodigo(datos.codigo))) {
    throw codigoDuplicado()
  }
  await herramientaRepository.updateAlmacen(id, datos)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR', tabla: 'almacenes', registroId: Number(id),
    detalles: { campos: Object.keys(datos) }, ip: ctx.ip,
  })
  return herramientaRepository.findAlmacenCompleto(id)
}

export async function darDeBajaAlmacen(id, ctx = {}) {
  const almacen = await almacenExistente(id)
  if (!almacen.activo) throw new AppError('El almacén ya estaba dado de baja', 409)
  if (!(await herramientaRepository.bajaAlmacen(id, ctx.usuarioId))) {
    throw new AppError(
      'No se puede dar de baja: el almacén tiene herramientas activas. Cámbielas de almacén o désela de baja primero.',
      409,
    )
  }
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'DAR_DE_BAJA', tabla: 'almacenes', registroId: Number(id),
    detalles: { codigo: almacen.codigo }, ip: ctx.ip,
  })
  return { id: Number(id), activo: 0 }
}

export async function reactivarAlmacen(id, ctx = {}) {
  await almacenExistente(id)
  if (!(await herramientaRepository.reactivarAlmacen(id))) {
    throw new AppError('El almacén no está dado de baja', 409)
  }
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REACTIVAR', tabla: 'almacenes', registroId: Number(id), ip: ctx.ip,
  })
  return { id: Number(id), activo: 1 }
}

export async function obtenerHerramienta(id) {
  const herramienta = await herramientaRepository.findById(id)
  if (!herramienta) throw new AppError('Herramienta no encontrada', 404)
  return herramienta
}

/** HU-10 · criterio 2: el almacén debe existir y estar activo. */
async function exigirAlmacen(almacenId) {
  const almacen = await herramientaRepository.findAlmacen(almacenId)
  if (!almacen || !almacen.activo) {
    throw new AppError('El almacén seleccionado no existe o está dado de baja', 400, 'almacen_id')
  }
  return almacen
}

/**
 * Dos altas simultáneas pueden pasar la consulta de `exigirSerialLibre`; la
 * segunda la frena el UNIQUE de MySQL y se traduce al mismo 409 en vez de 500.
 */
function traducirSerialDuplicado(err) {
  if (err?.code === 'ER_DUP_ENTRY') {
    return new AppError('Ya existe una herramienta con ese código serial', 409, 'codigo_serial')
  }
  return err
}

/** HU-10 · criterio 1 / CU-10 Alt: el código serial no puede repetirse. */
async function exigirSerialLibre(serial, idActual = null) {
  const existente = await herramientaRepository.findBySerial(serial)
  if (existente && Number(existente.id) !== Number(idActual)) {
    throw new AppError('Ya existe una herramienta con ese código serial', 409, 'codigo_serial')
  }
}

export async function registrarHerramienta(dto, ctx = {}) {
  await exigirSerialLibre(dto.codigo_serial)
  const almacen = await exigirAlmacen(dto.almacen_id)

  let id
  try {
    id = await herramientaRepository.create(dto)
  } catch (err) {
    throw traducirSerialDuplicado(err)
  }

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'herramientas',
    registroId: id,
    detalles: { codigo_serial: dto.codigo_serial, almacen: almacen.codigo },
    ip: ctx.ip,
  })
  return herramientaRepository.findById(id)
}

/**
 * Edita los datos de la herramienta. `disponibilidad` no se escribe a mano:
 * la mueven los préstamos (HU-11/12) y la baja lógica.
 */
export async function actualizarHerramienta(id, cambios = {}, ctx = {}) {
  const actual = await obtenerHerramienta(id)
  if (!actual.activo) {
    throw new AppError('La herramienta está dada de baja; reactívela antes de editarla', 409)
  }

  const campos = {}
  if (cambios.codigo_serial !== undefined) {
    const serial = String(cambios.codigo_serial ?? '').trim()
    if (!serial) throw new AppError('El código serial es obligatorio', 400, 'codigo_serial')
    revisarLargo(serial, LARGO.codigo_serial, 'codigo_serial')
    await exigirSerialLibre(serial, id)
    campos.codigo_serial = serial
  }
  if (cambios.nombre !== undefined) {
    const nombre = String(cambios.nombre ?? '').trim()
    if (!nombre) throw new AppError('El nombre es obligatorio', 400, 'nombre')
    revisarLargo(nombre, LARGO.nombre_herramienta, 'nombre')
    campos.nombre = nombre
  }
  const opcionales = [
    ['marca', LARGO.marca],
    ['modelo', LARGO.modelo],
    ['observaciones', LARGO.texto_largo],
  ]
  for (const [campo, largo] of opcionales) {
    if (cambios[campo] !== undefined) {
      campos[campo] = textoOpcional(cambios[campo])
      revisarLargo(campos[campo], largo, campo)
    }
  }
  if (cambios.almacen_id !== undefined) {
    const almacenId = numeroOpcional(cambios.almacen_id, 'almacen_id')
    if (!almacenId) throw new AppError('Debe asignar la herramienta a un almacén', 400, 'almacen_id')
    await exigirAlmacen(almacenId)
    campos.almacen_id = almacenId
  }
  if (cambios.estado_operativo !== undefined) {
    campos.estado_operativo = revisarEstadoOperativo(cambios.estado_operativo)
  }

  if (Object.keys(campos).length === 0) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  try {
    await herramientaRepository.update(id, campos)
  } catch (err) {
    throw traducirSerialDuplicado(err)
  }

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'herramientas',
    registroId: Number(id),
    detalles: { cambios: campos },
    ip: ctx.ip,
  })
  return herramientaRepository.findById(id)
}

/**
 * HU-18 · HU-10 criterio 4: baja lógica. La herramienta pasa a disponibilidad
 * BAJA y deja de ser prestable. No se puede dar de baja mientras esté prestada
 * o en traslado: primero debe volver a bodega.
 */
export async function darDeBajaHerramienta(id, ctx = {}) {
  const herramienta = await obtenerHerramienta(id)
  if (!herramienta.activo) throw new AppError('La herramienta ya estaba dada de baja', 409)
  if (['PRESTADA', 'EN_TRASLADO'].includes(herramienta.disponibilidad)) {
    const situacion = herramienta.disponibilidad === 'PRESTADA' ? 'prestada' : 'en traslado'
    throw new AppError(
      `No se puede dar de baja: la herramienta está ${situacion}. Registre primero su devolución.`,
      409,
    )
  }

  const afectadas = await herramientaRepository.darDeBaja(id, ctx.usuarioId)
  if (!afectadas) {
    // La baja filtra también por disponibilidad: si entre la lectura y el UPDATE
    // salió a préstamo o a traslado, no se da de baja una herramienta en uso.
    const actual = await herramientaRepository.findById(id)
    if (actual?.activo && ['PRESTADA', 'EN_TRASLADO'].includes(actual.disponibilidad)) {
      throw new AppError(
        'No se puede dar de baja: la herramienta salió a préstamo o traslado. Registre primero su devolución.',
        409,
      )
    }
    throw new AppError('La herramienta ya estaba dada de baja', 409)
  }

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'DAR_DE_BAJA',
    tabla: 'herramientas',
    registroId: Number(id),
    detalles: { codigo_serial: herramienta.codigo_serial },
    ip: ctx.ip,
  })
  return { id: Number(id), activo: 0, disponibilidad: 'BAJA' }
}

export async function reactivarHerramienta(id, ctx = {}) {
  await obtenerHerramienta(id)
  const afectadas = await herramientaRepository.reactivar(id)
  if (!afectadas) throw new AppError('La herramienta no está dada de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'REACTIVAR',
    tabla: 'herramientas',
    registroId: Number(id),
    ip: ctx.ip,
  })
  return { id: Number(id), activo: 1, disponibilidad: 'DISPONIBLE' }
}
