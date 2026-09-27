import { AppError } from '../../utils/AppError.js'

const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'PASAPORTE']

/**
 * DTO para el registro de un cliente (HU-02 · CU-02 Alt 2: cuando el cliente
 * no existe, se exige registrarlo antes de continuar).
 * Valida la forma y los tipos; la unicidad del documento se valida en el
 * service contra la base.
 */
export class RegistrarClienteDto {
  constructor({
    numero_documento,
    tipo_documento,
    razon_social_nombre,
    nombre_contacto,
    telefono,
    email,
    direccion,
  }) {
    this.numero_documento = numero_documento
    this.tipo_documento = tipo_documento
    this.razon_social_nombre = razon_social_nombre
    this.nombre_contacto = nombre_contacto
    this.telefono = telefono
    this.email = email
    this.direccion = direccion
  }

  static fromRequestBody(body = {}) {
    const faltantes = ['numero_documento', 'tipo_documento', 'razon_social_nombre'].filter(
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

    const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())

    return new RegistrarClienteDto({
      numero_documento: String(body.numero_documento).trim(),
      tipo_documento: tipo,
      razon_social_nombre: String(body.razon_social_nombre).trim(),
      nombre_contacto: texto(body.nombre_contacto),
      telefono: texto(body.telefono),
      email: texto(body.email),
      direccion: texto(body.direccion),
    })
  }
}
