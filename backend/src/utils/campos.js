import { AppError } from './AppError.js'

/**
 * Validaciones de forma compartidas por DTOs, controladores y servicios
 * (auditoría de casos límite del sprint 1).
 *
 * Por qué existe: las longitudes salen de `docs/schema.sql`. Si un texto no
 * cabe en su columna, MySQL en modo estricto rechaza el INSERT con un error
 * de datos y el usuario veía «Error interno del servidor» — un 500 por un
 * nombre largo tecleado en el formulario. Aquí eso se convierte en un 400 con
 * el campo señalado, que es lo que los formularios ya saben mostrar.
 *
 * Los correos y teléfonos tampoco tenían forma validada: se guardaba
 * «no-es-un-correo» o «llamar a la casa» tal cual.
 */
export const LARGO = {
  numero_documento: 20,
  nombres: 100,
  apellidos: 100,
  email: 150,
  telefono: 20,
  direccion: 255,
  username: 50,
  razon_social_nombre: 150,
  nombre_contacto: 100,
  codigo: 20,
  nombre_proyecto: 150,
  ubicacion: 255,
  nombre_etapa: 100,
  nombre_actividad: 150,
  codigo_serial: 50,
  nombre_herramienta: 100,
  marca: 50,
  modelo: 50,
  rol_en_proyecto: 100,
  // Las columnas TEXT no tienen tope en la base; este es un límite de cordura
  // para que nadie meta un libro por la API.
  texto_largo: 5000,
}

/** bcrypt solo usa los primeros 72 bytes: más allá no aporta seguridad. */
export const LARGO_PASSWORD_MAXIMO = 72

export function revisarLargo(valor, maximo, campo) {
  if (valor !== undefined && valor !== null && String(valor).length > maximo) {
    throw new AppError(
      `El campo ${campo} no puede superar los ${maximo} caracteres`,
      400,
      campo,
    )
  }
}

const CORREO = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

export function revisarCorreo(valor, campo = 'email') {
  if (valor === undefined || valor === null || String(valor).trim() === '') return
  if (!CORREO.test(String(valor).trim())) {
    throw new AppError(
      `Escriba un ${campo === 'email' ? 'correo' : campo} válido, por ejemplo nombre@dominio.com`,
      400,
      campo,
    )
  }
}

const TELEFONO = /^\+?[\d\s().-]+$/
const DIGITOS_MINIMOS = 7

export function revisarTelefono(valor, campo = 'telefono') {
  if (valor === undefined || valor === null || String(valor).trim() === '') return
  const texto = String(valor).trim()
  const digitos = (texto.match(/\d/g) || []).length
  if (!TELEFONO.test(texto) || digitos < DIGITOS_MINIMOS) {
    throw new AppError(
      'Escriba un teléfono válido: solo números, espacios, +, guiones y paréntesis',
      400,
      campo,
    )
  }
}

/** Revisa el largo y la forma de una contraseña nueva. */
export function revisarPassword(valor, minimo, campo = 'password') {
  const texto = String(valor ?? '')
  if (texto.length < minimo) {
    throw new AppError(`La contraseña debe tener al menos ${minimo} caracteres`, 400, campo)
  }
  const largo = Buffer.byteLength(texto, 'utf8')
  if (largo > LARGO_PASSWORD_MAXIMO) {
    throw new AppError(
      `La contraseña no puede superar los ${LARGO_PASSWORD_MAXIMO} caracteres`,
      400,
      campo,
    )
  }
}

const estaVacio = (v) => v === undefined || v === null || String(v).trim() === ''

/** Texto recortado, o null si llegó vacío. */
export function textoOpcional(v) {
  return estaVacio(v) ? null : String(v).trim()
}

/** Los ids del catálogo llegan como número o como texto desde un <select>. */
export function numeroOpcional(v, campo) {
  if (estaVacio(v)) return null
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('El identificador del catálogo no es válido', 400, campo)
  }
  return n
}
