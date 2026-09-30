import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { darDeBaja, reactivar } from '../db/bajaLogica.js'
import { AppError } from '../utils/AppError.js'
import { resolverCargo, resolverEspecialidad } from './catalogoService.js'

/**
 * HU-04 · criterio 2: la especialidad es obligatoria para el personal
 * operativo. La lista de cargos operativos ya no está escrita aquí: la marca
 * `cargos.operativo` en la tabla de dominio, así que el administrador puede
 * cambiar la regla desde la pantalla de Catálogo sin tocar el código.
 *
 * Se usa tanto al crear como al editar el trabajador; `cargo` es la fila del
 * catálogo (o, al editar sin cambiar el cargo, el resumen que devuelve el
 * repositorio).
 */
export function exigirEspecialidadSiOperativo(cargo, especialidad) {
  if (Number(cargo?.operativo) === 1 && !especialidad) {
    throw new AppError(
      'La especialidad es obligatoria para cargos de personal operativo',
      400,
      'especialidad',
    )
  }
}

/** Lista el personal activo para el catálogo de personal y de responsables. */
export async function listarTrabajadores({ incluirInactivos = false } = {}) {
  return trabajadorRepository.listar(incluirInactivos)
}

/** Obtiene un trabajador por id. */
export async function obtenerTrabajador(id) {
  const trabajador = await trabajadorRepository.findById(id)
  if (!trabajador) throw new AppError('Trabajador no encontrado', 404)
  return trabajador
}

/** HU-04: registrar personal con su cargo y especialidad. */
export async function registrarTrabajador(dto, ctx = {}) {
  const porDocumento = await trabajadorRepository.findByDocumento(dto.numero_documento)
  if (porDocumento) {
    throw new AppError('Ya existe un trabajador con ese número de documento', 409, 'numero_documento')
  }
  if (dto.email) {
    const porEmail = await trabajadorRepository.findByEmail(dto.email)
    if (porEmail) throw new AppError('Ya existe un trabajador con ese correo', 409, 'email')
  }

  // HU-04: el cargo y la especialidad tienen que existir en los catálogos.
  const cargo = await resolverCargo(dto)
  const especialidad = await resolverEspecialidad(dto)

  exigirEspecialidadSiOperativo(cargo, especialidad)

  const id = await trabajadorRepository.create({
    ...dto,
    cargo_id: cargo.id,
    especialidad_id: especialidad?.id ?? null,
  })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'trabajadores',
    registroId: id,
    detalles: { numero_documento: dto.numero_documento, cargo: cargo.nombre },
    ip: ctx.ip,
  })

  return trabajadorRepository.findById(id)
}

/**
 * Editar los datos del personal. Solo se actualizan los campos enviados.
 * Si cambia el cargo o la especialidad, se vuelve a aplicar la regla.
 */
const CAMPOS_EDITABLES = [
  'nombres', 'apellidos', 'email', 'telefono', 'direccion',
  'estado', 'disponible',
]

export async function actualizarTrabajador(id, cambios, ctx = {}) {
  const actual = await trabajadorRepository.findById(id)
  if (!actual) throw new AppError('Trabajador no encontrado', 404)

  const campos = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (cambios[campo] !== undefined) campos[campo] = cambios[campo]
  }

  // El cargo y la especialidad se cambian por id o por nombre del catálogo.
  let cargoFinal = { operativo: actual.cargo_operativo }
  if (cambios.cargo_id !== undefined || cambios.cargo !== undefined) {
    const cargo = await resolverCargo(cambios)
    campos.cargo_id = cargo.id
    cargoFinal = cargo
  }
  let especialidadFinal = actual.especialidad_id
  if (cambios.especialidad_id !== undefined || cambios.especialidad !== undefined) {
    const especialidad = await resolverEspecialidad(cambios)
    campos.especialidad_id = especialidad?.id ?? null
    especialidadFinal = campos.especialidad_id
  }

  if (Object.keys(campos).length === 0) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  if (campos.email) {
    const porEmail = await trabajadorRepository.findByEmail(campos.email)
    if (porEmail && Number(porEmail.id) !== Number(id)) {
      throw new AppError('Ya existe un trabajador con ese correo', 409, 'email')
    }
  }
  if (campos.email === '') campos.email = null

  exigirEspecialidadSiOperativo(cargoFinal, especialidadFinal)

  await trabajadorRepository.update(id, campos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'trabajadores',
    registroId: Number(id),
    detalles: { cambios },
    ip: ctx.ip,
  })

  return trabajadorRepository.findById(id)
}

/**
 * HU-18 · criterio 4: un trabajador dado de baja lógica (activo = 0, con fecha
 * de baja) no puede asignarse a nuevos proyectos o actividades. El proyecto lo
 * valida al registrar (`proyectoService`); aquí se registra la baja.
 */
export async function darDeBajaTrabajador(id, ctx = {}) {
  const trabajador = await trabajadorRepository.findById(id)
  if (!trabajador) throw new AppError('Trabajador no encontrado', 404)

  const afectadas = await darDeBaja({ tabla: 'trabajadores', id, usuarioId: ctx.usuarioId })
  if (!afectadas) throw new AppError('El trabajador ya estaba dado de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'DAR_DE_BAJA', tabla: 'trabajadores',
    registroId: Number(id), detalles: { numero_documento: trabajador.numero_documento }, ip: ctx.ip,
  })
  return { id: Number(id), activo: 0 }
}

/** HU-18: reactivar un trabajador dado de baja. */
export async function reactivarTrabajador(id, ctx = {}) {
  const afectadas = await reactivar({ tabla: 'trabajadores', id })
  if (!afectadas) throw new AppError('El trabajador no está dado de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REACTIVAR', tabla: 'trabajadores',
    registroId: Number(id), ip: ctx.ip,
  })
  return { id: Number(id), activo: 1 }
}
