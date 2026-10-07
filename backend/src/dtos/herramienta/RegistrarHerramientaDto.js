import { AppError } from '../../utils/AppError.js'
import { LARGO, revisarLargo, textoOpcional, numeroOpcional } from '../../utils/campos.js'

export const ESTADOS_OPERATIVOS = ['EXCELENTE', 'BUENO', 'REGULAR', 'DANIADA', 'EN_MANTENIMIENTO']

const vacio = (v) => v === undefined || v === null || String(v).trim() === ''

/** Valida y normaliza el estado operativo (sin valor = EXCELENTE). */
export function revisarEstadoOperativo(valor) {
  if (vacio(valor)) return 'EXCELENTE'
  const estado = String(valor).trim().toUpperCase()
  if (!ESTADOS_OPERATIVOS.includes(estado)) {
    throw new AppError(
      `estado_operativo debe ser uno de: ${ESTADOS_OPERATIVOS.join(', ')}`,
      400,
      'estado_operativo',
    )
  }
  return estado
}

/**
 * DTO para registrar una herramienta (HU-10). Valida forma y tipos; la
 * unicidad del serial y la existencia del almacén se validan en el service.
 * Al registrarse, la herramienta queda DISPONIBLE (se presta desde HU-11).
 */
export class RegistrarHerramientaDto {
  constructor({ codigo_serial, nombre, marca, modelo, almacen_id, estado_operativo, observaciones }) {
    this.codigo_serial = codigo_serial
    this.nombre = nombre
    this.marca = marca
    this.modelo = modelo
    this.almacen_id = almacen_id
    this.estado_operativo = estado_operativo
    this.observaciones = observaciones
    this.disponibilidad = 'DISPONIBLE'
  }

  static fromRequestBody(body = {}) {
    if (vacio(body.codigo_serial)) {
      throw new AppError('El código serial es obligatorio', 400, 'codigo_serial')
    }
    if (vacio(body.nombre)) throw new AppError('El nombre es obligatorio', 400, 'nombre')
    if (vacio(body.almacen_id)) {
      throw new AppError('Debe asignar la herramienta a un almacén', 400, 'almacen_id')
    }

    const codigo_serial = String(body.codigo_serial).trim()
    const nombre = String(body.nombre).trim()
    const marca = textoOpcional(body.marca)
    const modelo = textoOpcional(body.modelo)
    const observaciones = textoOpcional(body.observaciones)
    revisarLargo(codigo_serial, LARGO.codigo_serial, 'codigo_serial')
    revisarLargo(nombre, LARGO.nombre_herramienta, 'nombre')
    revisarLargo(marca, LARGO.marca, 'marca')
    revisarLargo(modelo, LARGO.modelo, 'modelo')
    revisarLargo(observaciones, LARGO.texto_largo, 'observaciones')

    return new RegistrarHerramientaDto({
      codigo_serial,
      nombre,
      marca,
      modelo,
      almacen_id: numeroOpcional(body.almacen_id, 'almacen_id'),
      estado_operativo: revisarEstadoOperativo(body.estado_operativo),
      observaciones,
    })
  }
}
