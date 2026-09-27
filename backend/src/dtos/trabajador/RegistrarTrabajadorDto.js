import { AppError } from '../../utils/AppError.js'

const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'PASAPORTE']

export function textoOpcional(v) {
  return v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim()
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
    cargo,
    especialidad,
  }) {
    this.numero_documento = numero_documento
    this.tipo_documento = tipo_documento
    this.nombres = nombres
    this.apellidos = apellidos
    this.email = email
    this.telefono = telefono
    this.direccion = direccion
    this.cargo = cargo
    this.especialidad = especialidad
    // Criterio 3: al crearse, disponible = verdadero y estado activo.
    this.disponible = true
    this.estado = 'ACTIVO'
  }

  static fromRequestBody(body = {}) {
    const faltantes = ['numero_documento', 'tipo_documento', 'nombres', 'apellidos', 'cargo'].filter(
      (campo) => body[campo] === undefined || body[campo] === null || String(body[campo]).trim() === '',
    )
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
      cargo: String(body.cargo).trim(),
      especialidad: textoOpcional(body.especialidad),
    })
  }
}
