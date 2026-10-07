import * as herramientaRepository from '../repositories/herramientaRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { LARGO, revisarLargo, textoOpcional, numeroOpcional } from '../utils/campos.js'
import { revisarEstadoOperativo } from '../dtos/herramienta/RegistrarHerramientaDto.js'

/** HU-10: catálogo de herramientas (activas por defecto; filtros en el repositorio). */
export async function listarHerramientas(filtros = {}) {
  return herramientaRepository.listar(filtros)
}

export async function listarAlmacenes() {
  return herramientaRepository.listarAlmacenes()
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

  const id = await herramientaRepository.create(dto)

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

  await herramientaRepository.update(id, campos)

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
  if (!afectadas) throw new AppError('La herramienta ya estaba dada de baja', 409)

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
