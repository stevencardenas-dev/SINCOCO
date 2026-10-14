import { AppError } from '../../utils/AppError.js'
import {
  LARGO,
  revisarCorreo,
  revisarLargo,
  revisarTelefono,
} from '../../utils/campos.js'

/** NIT: solo dígitos (6 a 14) con dígito de verificación opcional tras guion. */
const FORMATO_NIT = /^\d{6,14}(-\d)?$/

/**
 * DTO para el registro de un proveedor (HU-13 · criterios 1 y 2: documento
 * único con formato válido; razón social y datos de contacto obligatorios).
 * Valida la forma y los tipos; la unicidad del documento se valida en el
 * service contra la base.
 */
export class RegistrarProveedorDto {
  constructor({
    documento_identificacion,
    razon_social,
    nombre_contacto,
    telefono,
    email,
    direccion,
  }) {
    this.documento_identificacion = documento_identificacion
    this.razon_social = razon_social
    this.nombre_contacto = nombre_contacto
    this.telefono = telefono
    this.email = email
    this.direccion = direccion
  }

  static fromRequestBody(body = {}) {
    const faltantes = [
      'documento_identificacion', 'razon_social', 'nombre_contacto', 'telefono', 'email',
    ].filter(
      (campo) => body[campo] === undefined || body[campo] === null || String(body[campo]).trim() === '',
    )
    if (faltantes.length > 0) {
      throw new AppError(`Faltan campos obligatorios: ${faltantes.join(', ')}`, 400)
    }

    const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())

    const documento_identificacion = String(body.documento_identificacion).trim()
    const razon_social = String(body.razon_social).trim()
    const nombre_contacto = String(body.nombre_contacto).trim()
    const email = String(body.email).trim()
    const telefono = String(body.telefono).trim()
    const direccion = texto(body.direccion)

    // La columna mide lo mismo que `numero_documento`; se revisa antes del
    // formato para que un texto enorme no se confunda con un NIT mal escrito.
    revisarLargo(documento_identificacion, LARGO.numero_documento, 'documento_identificacion')
    if (!FORMATO_NIT.test(documento_identificacion)) {
      throw new AppError(
        'El documento de identificación debe ser un NIT: de 6 a 14 dígitos, con dígito de verificación opcional (ej. 900123456-7)',
        400,
        'documento_identificacion',
      )
    }
    revisarLargo(razon_social, LARGO.razon_social_nombre, 'razon_social')
    revisarLargo(nombre_contacto, LARGO.nombre_contacto, 'nombre_contacto')
    revisarLargo(email, LARGO.email, 'email')
    revisarLargo(telefono, LARGO.telefono, 'telefono')
    revisarLargo(direccion, LARGO.direccion, 'direccion')
    revisarCorreo(email)
    revisarTelefono(telefono)

    return new RegistrarProveedorDto({
      documento_identificacion,
      razon_social,
      nombre_contacto,
      telefono,
      email,
      direccion,
    })
  }
}
