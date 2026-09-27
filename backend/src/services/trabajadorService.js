import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-04 · criterio 2: `especialidad` es obligatoria cuando el cargo
 * corresponde a personal operativo. El esquema no marca qué cargos son
 * operativos, así que se declara aquí el conjunto.
 */
const CARGOS_OPERATIVOS = [
  'MAESTRO DE OBRA',
  'MAESTRO_OBRA',
  'OFICIAL',
  'OBRERO',
  'AYUDANTE',
  'OPERARIO',
  'TECNICO',
  'TECNICO DE OBRA',
]

const normalizar = (texto) =>
  String(texto).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

function esCargoOperativo(cargo) {
  return CARGOS_OPERATIVOS.includes(normalizar(cargo))
}

/**
 * Criterio 2: si el cargo es operativo, la especialidad es obligatoria.
 * Se usa tanto al crear como al editar el cargo.
 */
export function exigirEspecialidadSiOperativo(cargo, especialidad) {
  if (esCargoOperativo(cargo) && !especialidad) {
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

  exigirEspecialidadSiOperativo(dto.cargo, dto.especialidad)

  const id = await trabajadorRepository.create(dto)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'trabajadores',
    registroId: id,
    detalles: { numero_documento: dto.numero_documento, cargo: dto.cargo },
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
  'cargo', 'especialidad', 'estado', 'disponible',
]

export async function actualizarTrabajador(id, cambios, ctx = {}) {
  const actual = await trabajadorRepository.findById(id)
  if (!actual) throw new AppError('Trabajador no encontrado', 404)

  const campos = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (cambios[campo] !== undefined) campos[campo] = cambios[campo]
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

  exigirEspecialidadSiOperativo(
    campos.cargo ?? actual.cargo,
    campos.especialidad ?? actual.especialidad,
  )

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
