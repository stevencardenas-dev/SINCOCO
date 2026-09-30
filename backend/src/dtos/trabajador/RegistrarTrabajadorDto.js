import { AppError } from '../../utils/AppError.js'

const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'PASAPORTE']

export function textoOpcional(v) {
  return v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim()
}

const vacio = (v) => v === undefined || v === null || String(v).trim() === ''

/** Los ids del catálogo llegan como número o como texto desde un <select>. */
export function numeroOpcional(v) {
  if (vacio(v)) return null
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('El identificador del catálogo no es válido', 400)
  }
  return n
}

/**
 * DTO para el registro de personal (HU-04).
 * Valida forma y tipos; la unicidad del documento y la regla de especialidad
 * se validan en el service.
 */
export class RegistrarTrabajadorDto {
  constructor({
    numero_documento,
    tipo_documento,
    nombres,
    apellidos,
    email,
    telefono,
    direccion,
    cargo_id,
    cargo,
    especialidad_id,
    especialidad,
  }) {
    this.numero_documento = numero_documento
    this.tipo_documento = tipo_documento
    this.nombres = nombres
    this.apellidos = apellidos
    this.email = email
    this.telefono = telefono
    this.direccion = direccion
    // HU-04: el cargo llega como id (formulario) o como nombre (clientes de
    // API anteriores); `catalogoService.resolverCargo` acepta los dos.
    this.cargo_id = cargo_id
    this.cargo = cargo
    this.especialidad_id = especialidad_id
    this.especialidad = especialidad
    // Criterio 3: al crearse, disponible = verdadero y estado activo.
    this.disponible = true
    this.estado = 'ACTIVO'
  }

  static fromRequestBody(body = {}) {
    const faltantes = ['numero_documento', 'tipo_documento', 'nombres', 'apellidos'].filter(
      (campo) => body[campo] === undefined || body[campo] === null || String(body[campo]).trim() === '',
    )
    // El cargo puede venir por nombre o por id del catálogo.
    if (vacio(body.cargo) && vacio(body.cargo_id)) faltantes.push('cargo')
    if (faltantes.length > 0) {
      throw new AppError(`Faltan campos obligatorios: ${faltantes.join(', ')}`, 400)
    }

    const tipo = String(body.tipo_documento).toUpperCase()
    if (!TIPOS_DOCUMENTO.includes(tipo)) {
      throw new AppError(
        `tipo_documento debe ser uno de: ${TIPOS_DOCUMENTO.join(', ')}`,
        400,
        'tipo_documento',
      )
    }

    return new RegistrarTrabajadorDto({
      numero_documento: String(body.numero_documento).trim(),
      tipo_documento: tipo,
      nombres: String(body.nombres).trim(),
      apellidos: String(body.apellidos).trim(),
      email: textoOpcional(body.email),
      telefono: textoOpcional(body.telefono),
      direccion: textoOpcional(body.direccion),
      cargo_id: numeroOpcional(body.cargo_id),
      cargo: textoOpcional(body.cargo),
      especialidad_id: numeroOpcional(body.especialidad_id),
      especialidad: textoOpcional(body.especialidad),
    })
  }
}
